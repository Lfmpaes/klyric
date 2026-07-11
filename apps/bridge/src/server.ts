import {
  MAX_PROTOCOL_PAYLOAD_BYTES,
  PROTOCOL_VERSION,
  ProtocolValidationError,
  parseKLyricState,
} from "@klyric/protocol";
import { PublisherTokenStore } from "./auth/PublisherToken";
import type { BridgeConfig } from "./config";
import type { Logger } from "./logging/logger";
import { StateStore } from "./state/StateStore";
import { ClientRegistry, type SocketData } from "./websocket/ClientRegistry";

const RATE_LIMIT_PER_SECOND = 10;
const RATE_LIMIT_BURST = 20;

interface TokenBucket {
  tokens: number;
  updatedAt: number;
}

export interface BridgeServer {
  readonly port: number;
  readonly host: string;
  stop(): void;
}

export interface StartBridgeOptions {
  readonly config: BridgeConfig;
  readonly bridgeVersion: string;
  readonly tokenStore?: PublisherTokenStore;
  readonly logger: Logger;
  readonly now?: () => number;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function empty(status: number): Response {
  return new Response(null, { status });
}

function error(status: number, code: string, message: string): Response {
  return json({ code, message }, status);
}

function bearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  const match = /^Bearer ([A-Za-z0-9_-]+)$/u.exec(authorization ?? "");
  return match?.[1] ?? null;
}

async function readJsonBody(request: Request): Promise<unknown> {
  const contentLength = request.headers.get("content-length");
  if (
    contentLength !== null &&
    Number(contentLength) > MAX_PROTOCOL_PAYLOAD_BYTES
  ) {
    throw new RangeError("Payload exceeds the maximum size.");
  }
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > MAX_PROTOCOL_PAYLOAD_BYTES) {
    throw new RangeError("Payload exceeds the maximum size.");
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new SyntaxError("Request body must be valid JSON.");
  }
}

function isUnsupportedProtocol(value: unknown): boolean {
  return (
    value !== null &&
    typeof value === "object" &&
    "protocolVersion" in value &&
    (value as { protocolVersion?: unknown }).protocolVersion !==
      PROTOCOL_VERSION
  );
}

export async function startBridge(
  options: StartBridgeOptions,
): Promise<BridgeServer> {
  const now = options.now ?? Date.now;
  const tokenStore =
    options.tokenStore ?? new PublisherTokenStore(options.config.tokenPath);
  await tokenStore.initialize();
  const stateStore = new StateStore();
  const registry = new ClientRegistry(
    options.config,
    options.bridgeVersion,
    options.logger,
    () => stateStore.current(),
  );
  const startedAt = now();
  const bucket: TokenBucket = { tokens: RATE_LIMIT_BURST, updatedAt: now() };

  function consumePublicationToken(): boolean {
    const current = now();
    bucket.tokens = Math.min(
      RATE_LIMIT_BURST,
      bucket.tokens +
        ((current - bucket.updatedAt) / 1_000) * RATE_LIMIT_PER_SECOND,
    );
    bucket.updatedAt = current;
    if (bucket.tokens < 1) return false;
    bucket.tokens -= 1;
    return true;
  }

  async function publish(request: Request): Promise<Response> {
    if (!(await tokenStore.matchesActive(bearerToken(request)))) {
      options.logger.warn("publication.unauthorized");
      return error(401, "unauthorized", "A valid publisher token is required.");
    }
    if (
      request.headers.get("content-type")?.split(";", 1)[0] !==
      "application/json"
    ) {
      return error(
        400,
        "content-type",
        "Content-Type must be application/json.",
      );
    }
    if (!consumePublicationToken()) {
      options.logger.warn("publication.rate_limited");
      return error(429, "rate-limited", "Publication rate limit exceeded.");
    }

    try {
      const value = await readJsonBody(request);
      if (isUnsupportedProtocol(value)) {
        return error(
          426,
          "unsupported-protocol",
          "The protocol version is unsupported.",
        );
      }
      const state = parseKLyricState(value, { now: now() });
      const result = stateStore.publish(state, now());
      if (result.kind === "duplicate") return empty(204);
      if (result.kind !== "accepted") {
        return error(
          500,
          "internal-error",
          "The bridge could not store the state.",
        );
      }
      registry.broadcastState(result.state);
      options.logger.info("publication.accepted", { sequence: state.sequence });
      return empty(202);
    } catch (cause) {
      if (cause instanceof RangeError)
        return error(413, "payload-too-large", cause.message);
      if (
        cause instanceof Error &&
        cause.message.includes("sequence must increase")
      ) {
        return error(409, "sequence-conflict", cause.message);
      }
      if (cause instanceof ProtocolValidationError) {
        return error(400, "invalid-state", cause.message);
      }
      if (cause instanceof SyntaxError) {
        return error(400, "invalid-state", cause.message);
      }
      options.logger.error("publication.failed");
      return error(
        500,
        "internal-error",
        "The bridge could not process the state.",
      );
    }
  }

  async function clear(request: Request): Promise<Response> {
    if (!(await tokenStore.matchesActive(bearerToken(request)))) {
      options.logger.warn("clear.unauthorized");
      return error(401, "unauthorized", "A valid publisher token is required.");
    }
    const result = stateStore.clear("manual");
    if (result.kind === "cleared") registry.broadcastCleared(result.reason);
    return empty(204);
  }

  const server = Bun.serve<SocketData>({
    hostname: options.config.host,
    port: options.config.port,
    fetch: async (request, bunServer) => {
      const url = new URL(request.url);
      if (url.pathname === "/v1/events" && request.method === "GET") {
        if (
          bunServer.upgrade(request, {
            data: {
              helloReceived: false,
              helloTimeout: null,
              pendingPingAt: null,
            },
          })
        ) {
          return undefined;
        }
        return error(
          400,
          "websocket-upgrade-required",
          "WebSocket upgrade is required.",
        );
      }
      if (url.pathname === "/v1/state" && request.method === "POST")
        return publish(request);
      if (url.pathname === "/v1/state" && request.method === "DELETE")
        return await clear(request);
      if (url.pathname === "/v1/state" && request.method === "GET") {
        const state = stateStore.current();
        return state === null ? empty(204) : json(state);
      }
      if (url.pathname === "/health" && request.method === "GET") {
        return json({
          status: "ok",
          version: options.bridgeVersion,
          protocolVersion: PROTOCOL_VERSION,
          publisherSeen: stateStore.publisherSeen(),
          stateAvailable: stateStore.current() !== null,
          clients: registry.count(),
          uptimeSeconds: Math.floor((now() - startedAt) / 1_000),
        });
      }
      return error(404, "not-found", "Route not found.");
    },
    websocket: {
      open: (socket) => registry.open(socket),
      message: (socket, message) => registry.message(socket, message),
      close: (socket) => registry.close(socket),
    },
  });
  const expiryTimer = setInterval(() => {
    const result = stateStore.expire(
      now(),
      options.config.playingStateTtlMs,
      options.config.pausedStateTtlMs,
    );
    if (result.kind === "stale") registry.broadcastState(result.state);
    if (result.kind === "cleared") registry.broadcastCleared(result.reason);
  }, 1_000);

  const port = server.port ?? options.config.port;
  options.logger.info("bridge.started", { host: options.config.host, port });
  return {
    host: options.config.host,
    port,
    stop: () => {
      clearInterval(expiryTimer);
      const result = stateStore.clear("publisher-disconnected");
      if (result.kind === "cleared") registry.broadcastCleared(result.reason);
      registry.shutdown();
      server.stop(true);
      options.logger.info("bridge.stopped");
    },
  };
}
