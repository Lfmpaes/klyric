import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { PublisherTokenStore } from "../apps/bridge/src/auth/PublisherToken";
import {
  type BridgeConfig,
  resolveBridgeConfig,
} from "../apps/bridge/src/config";
import { type BridgeServer, startBridge } from "../apps/bridge/src/server";
import { PluginStateMachine } from "../apps/cider-plugin/src/application/PluginStateMachine";
import { BridgeClient } from "../apps/cider-plugin/src/publisher/BridgeClient";
import { PublishQueue } from "../apps/cider-plugin/src/publisher/PublishQueue";
import { type KLyricState, validStateFixture } from "../packages/protocol/src";

interface ProtocolLibrary {
  parseServerMessage(value: string): Record<string, unknown> | null;
}

interface RunningBridge {
  baseUrl: string;
  config: BridgeConfig;
  root: string;
  server: BridgeServer;
  token: string;
  tokenStore: PublisherTokenStore;
}

const running = new Set<BridgeServer>();

afterEach(() => {
  for (const server of running) server.stop();
  running.clear();
});

function loadWidgetProtocol(): ProtocolLibrary {
  const source = readFileSync(
    resolve(
      import.meta.dir,
      "../apps/plasmoid/package/contents/ui/js/Protocol.js",
    ),
    "utf8",
  ).replace(".pragma library", "");
  const createLibrary = new Function(
    `${source}\nreturn { parseServerMessage: parseServerMessage };`,
  ) as () => ProtocolLibrary;
  return createLibrary();
}

async function startTestBridge(
  overrides: Partial<BridgeConfig> = {},
  logLines: string[] = [],
  existing?: Pick<RunningBridge, "config" | "root" | "tokenStore">,
): Promise<RunningBridge> {
  const root =
    existing?.root ?? join("/tmp", `klyric-e2e-${crypto.randomUUID()}`);
  const baseConfig =
    existing?.config ??
    (await resolveBridgeConfig({ environment: { XDG_CONFIG_HOME: root } }));
  const tokenStore =
    existing?.tokenStore ?? new PublisherTokenStore(baseConfig.tokenPath);
  let server: BridgeServer | undefined;
  let config = { ...baseConfig, ...overrides };
  for (let attempt = 0; attempt < 8; attempt += 1) {
    config = {
      ...config,
      port:
        overrides.port ??
        (existing === undefined
          ? 40_000 + Math.floor(Math.random() * 20_000)
          : config.port),
    };
    try {
      server = await startBridge({
        bridgeVersion: "integration-hardening",
        config,
        tokenStore,
        logger: {
          info: (event, fields) =>
            logLines.push(JSON.stringify({ event, ...fields })),
          warn: (event, fields) =>
            logLines.push(JSON.stringify({ event, ...fields })),
          error: (event, fields) =>
            logLines.push(JSON.stringify({ event, ...fields })),
        },
      });
      break;
    } catch (error) {
      if (
        attempt === 7 ||
        existing !== undefined ||
        overrides.port !== undefined
      )
        throw error;
    }
  }
  if (server === undefined)
    throw new Error("Integration bridge did not start.");
  running.add(server);
  return {
    baseUrl: `http://${server.host}:${server.port}`,
    config,
    root,
    server,
    token: await tokenStore.loadOrCreate(),
    tokenStore,
  };
}

class WidgetInbox {
  private readonly messages: Record<string, unknown>[] = [];
  private readonly waiters: Array<() => void> = [];

  public constructor(
    readonly socket: WebSocket,
    private readonly protocol: ProtocolLibrary,
  ) {
    socket.addEventListener("message", (event) => {
      const message = this.protocol.parseServerMessage(String(event.data));
      if (message === null || message.type === "unknown") return;
      if (message.type === "ping") {
        socket.send(
          JSON.stringify({ type: "pong", timestamp: message.timestamp }),
        );
      }
      this.messages.push(message);
      this.waiters.shift()?.();
    });
  }

  public async next(
    predicate: (message: Record<string, unknown>) => boolean,
    timeoutMs = 2_000,
  ): Promise<Record<string, unknown>> {
    const deadline = performance.now() + timeoutMs;
    while (true) {
      const index = this.messages.findIndex(predicate);
      if (index >= 0) return this.messages.splice(index, 1)[0] ?? {};
      const remaining = deadline - performance.now();
      if (remaining <= 0) throw new Error("Widget message timed out.");
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("Widget message timed out.")),
          remaining,
        );
        this.waiters.push(() => {
          clearTimeout(timer);
          resolve();
        });
      });
    }
  }

  public async nextState(
    predicate: (state: KLyricState) => boolean,
  ): Promise<KLyricState> {
    const message = await this.next(
      (candidate) =>
        candidate.type === "state" &&
        predicate(candidate.payload as KLyricState),
    );
    return message.payload as KLyricState;
  }
}

async function connectWidget(baseUrl: string): Promise<WidgetInbox> {
  const socket = new WebSocket(`${baseUrl.replace("http", "ws")}/v1/events`);
  const inbox = new WidgetInbox(socket, loadWidgetProtocol());
  await new Promise<void>((resolve, reject) => {
    socket.addEventListener("open", () => resolve(), { once: true });
    socket.addEventListener(
      "error",
      () => reject(new Error("WebSocket failed.")),
      {
        once: true,
      },
    );
  });
  await inbox.next((message) => message.type === "hello");
  socket.send(
    JSON.stringify({
      type: "hello",
      protocolVersion: 1,
      client: "plasmoid",
      clientVersion: "integration-hardening",
    }),
  );
  return inbox;
}

function publicationHeaders(token: string): Record<string, string> {
  return {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
  };
}

function fixtureState(sequence: number, text: string): KLyricState {
  return {
    ...validStateFixture,
    sequence,
    sessionId: "integration-hardening",
    emittedAt: new Date().toISOString(),
    currentLine: { text, index: sequence },
  };
}

describe("Phase 6 end-to-end hardening", () => {
  test("propagates extraction events through plugin, bridge, and widget validation within 250 ms", async () => {
    const bridge = await startTestBridge();
    const widget = await connectWidget(bridge.baseUrl);
    const client = new BridgeClient({
      bridgeHost: bridge.server.host,
      bridgePort: bridge.server.port,
      publisherToken: bridge.token,
    });
    const queue = new PublishQueue(client);
    const machine = new PluginStateMachine({ sessionId: "latency-session" });
    const unsubscribe = machine.subscribe((_phase, state) =>
      queue.enqueue(state),
    );
    machine.setConnected(true);
    machine.setPlayback({
      status: "playing",
      track: { id: "track-a", title: "Sanitized track" },
      positionMs: 1_000,
    });

    const latencies: number[] = [];
    for (let index = 0; index < 5; index += 1) {
      const text = `Sanitized latency line ${index}`;
      const received = widget.nextState(
        (state) => state.currentLine?.text === text,
      );
      const startedAt = performance.now();
      machine.setLyrics({
        source: "dom",
        lines: [{ text, index }],
        currentLine: { text, index },
        currentIndex: 0,
        trackId: "track-a",
      });
      await received;
      latencies.push(performance.now() - startedAt);
    }

    if (process.env.KLYRIC_REPORT_PERF === "1") {
      console.info(
        JSON.stringify({
          measurement: "plugin-to-widget-ms",
          samples: latencies.map((value) => Number(value.toFixed(3))),
          maximum: Number(Math.max(...latencies).toFixed(3)),
        }),
      );
    }
    expect(Math.max(...latencies)).toBeLessThanOrEqual(250);
    expect(
      (
        await fetch(`${bridge.baseUrl}/health`).then((response) =>
          response.json(),
        )
      ).clients,
    ).toBe(1);
    unsubscribe();
    await queue.stop(true);
    widget.socket.close();
  });

  test("broadcasts to multiple widgets and recovers with empty memory after a bridge restart", async () => {
    const bridge = await startTestBridge({ maxClients: 4 });
    const first = await connectWidget(bridge.baseUrl);
    const second = await connectWidget(bridge.baseUrl);
    const headers = publicationHeaders(bridge.token);
    const published = fetch(`${bridge.baseUrl}/v1/state`, {
      method: "POST",
      headers,
      body: JSON.stringify(fixtureState(1, "Multi-widget line")),
    });
    expect((await published).status).toBe(202);
    await Promise.all([
      first.nextState(
        (state) => state.currentLine?.text === "Multi-widget line",
      ),
      second.nextState(
        (state) => state.currentLine?.text === "Multi-widget line",
      ),
    ]);

    const port = bridge.server.port;
    bridge.server.stop();
    running.delete(bridge.server);
    await Promise.all([
      first.next((message) => message.type === "state-cleared"),
      second.next((message) => message.type === "state-cleared"),
    ]);
    const restarted = await startTestBridge({ port }, [], {
      config: bridge.config,
      root: bridge.root,
      tokenStore: bridge.tokenStore,
    });
    expect(
      await fetch(`${restarted.baseUrl}/health`).then((response) =>
        response.json(),
      ),
    ).toMatchObject({ stateAvailable: false, clients: 0 });
    first.socket.close();
    second.socket.close();
  });

  test("invalidates a rotated token immediately while the bridge remains running", async () => {
    const bridge = await startTestBridge();
    const first = fixtureState(1, "Before rotation");
    expect(
      (
        await fetch(`${bridge.baseUrl}/v1/state`, {
          method: "POST",
          headers: publicationHeaders(bridge.token),
          body: JSON.stringify(first),
        })
      ).status,
    ).toBe(202);
    const rotated = await new PublisherTokenStore(
      bridge.config.tokenPath,
    ).rotate();
    expect(
      (
        await fetch(`${bridge.baseUrl}/v1/state`, {
          method: "POST",
          headers: publicationHeaders(bridge.token),
          body: JSON.stringify(fixtureState(2, "Rejected old token")),
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await fetch(`${bridge.baseUrl}/v1/state`, {
          method: "POST",
          headers: publicationHeaders(rotated),
          body: JSON.stringify(fixtureState(2, "Accepted new token")),
        })
      ).status,
    ).toBe(202);
  });

  test("keeps lyric text and publisher tokens out of logs and persisted files", async () => {
    const logs: string[] = [];
    const bridge = await startTestBridge({}, logs);
    const privateLine = "DO-NOT-PERSIST-LYRIC";
    expect(
      (
        await fetch(`${bridge.baseUrl}/v1/state`, {
          method: "POST",
          headers: publicationHeaders(bridge.token),
          body: JSON.stringify(fixtureState(1, privateLine)),
        })
      ).status,
    ).toBe(202);

    expect(logs.join("\n")).not.toContain(privateLine);
    expect(logs.join("\n")).not.toContain(bridge.token);
    const files = await readdir(bridge.config.configDirectory);
    expect(files).toEqual(["publisher-token"]);
    expect(await readFile(bridge.config.tokenPath, "utf8")).not.toContain(
      privateLine,
    );
  });
});
