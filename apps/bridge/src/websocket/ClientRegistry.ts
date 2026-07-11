import {
  type KLyricState,
  PROTOCOL_VERSION,
  parseClientMessage,
  type ServerMessage,
  type StateClearReason,
} from "@klyric/protocol";
import type { ServerWebSocket } from "bun";
import type { BridgeConfig } from "../config";
import type { Logger } from "../logging/logger";

export interface SocketData {
  helloReceived: boolean;
  helloTimeout: ReturnType<typeof setTimeout> | null;
  pendingPingAt: number | null;
}

type BridgeSocket = ServerWebSocket<SocketData>;

function send(socket: BridgeSocket, message: ServerMessage): void {
  socket.send(JSON.stringify(message));
}

/** Tracks bounded, authenticated-by-handshake local read-only clients. */
export class ClientRegistry {
  private readonly clients = new Set<BridgeSocket>();
  private pingTimer: ReturnType<typeof setInterval> | null = null;

  public constructor(
    private readonly config: BridgeConfig,
    private readonly bridgeVersion: string,
    private readonly logger: Logger,
    private readonly getCurrentState: () => KLyricState | null,
  ) {}

  public open(socket: BridgeSocket): void {
    if (this.clients.size >= this.config.maxClients) {
      socket.close(1013, "Client limit reached.");
      return;
    }
    this.clients.add(socket);
    socket.data.helloTimeout = setTimeout(() => {
      if (!socket.data.helloReceived) {
        socket.close(1008, "Client hello timed out.");
      }
    }, this.config.clientHelloTimeoutMs);
    send(socket, {
      type: "hello",
      protocolVersion: PROTOCOL_VERSION,
      bridgeVersion: this.bridgeVersion,
    });
    this.ensurePingTimer();
  }

  public message(socket: BridgeSocket, raw: string | Buffer): void {
    let input: unknown;
    try {
      input = JSON.parse(raw.toString());
    } catch {
      this.reject(socket, "invalid-json", "Message must be JSON.");
      return;
    }

    try {
      const message = parseClientMessage(input);
      if (!socket.data.helloReceived) {
        if (message.type !== "hello") {
          this.reject(
            socket,
            "hello-required",
            "Client hello is required first.",
          );
          return;
        }
        socket.data.helloReceived = true;
        if (socket.data.helloTimeout !== null) {
          clearTimeout(socket.data.helloTimeout);
          socket.data.helloTimeout = null;
        }
        const state = this.getCurrentState();
        if (state !== null) send(socket, { type: "state", payload: state });
        return;
      }
      if (message.type !== "pong") {
        this.reject(
          socket,
          "unexpected-message",
          "Only pong is allowed after hello.",
        );
        return;
      }
      socket.data.pendingPingAt = null;
    } catch {
      this.reject(
        socket,
        "invalid-message",
        "Message is not a supported client envelope.",
      );
    }
  }

  public close(socket: BridgeSocket): void {
    if (socket.data.helloTimeout !== null)
      clearTimeout(socket.data.helloTimeout);
    this.clients.delete(socket);
    if (this.clients.size === 0 && this.pingTimer !== null) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  public count(): number {
    return this.clients.size;
  }

  public broadcastState(state: KLyricState): void {
    this.broadcast({ type: "state", payload: state });
  }

  public broadcastCleared(reason: StateClearReason): void {
    this.broadcast({ type: "state-cleared", reason });
  }

  public shutdown(): void {
    if (this.pingTimer !== null) clearInterval(this.pingTimer);
    this.pingTimer = null;
    for (const socket of this.clients)
      socket.close(1001, "Bridge is shutting down.");
    this.clients.clear();
  }

  private broadcast(message: ServerMessage): void {
    for (const socket of this.clients) {
      if (socket.data.helloReceived) send(socket, message);
    }
  }

  private reject(socket: BridgeSocket, code: string, message: string): void {
    send(socket, { type: "error", code, message });
    socket.close(1008, message);
  }

  private ensurePingTimer(): void {
    if (this.pingTimer !== null) return;
    this.pingTimer = setInterval(() => {
      const now = Date.now();
      for (const socket of this.clients) {
        if (!socket.data.helloReceived) continue;
        if (
          socket.data.pendingPingAt !== null &&
          now - socket.data.pendingPingAt > this.config.clientPongTimeoutMs
        ) {
          this.logger.warn("websocket.client_timed_out");
          socket.close(1008, "Client pong timed out.");
          continue;
        }
        send(socket, { type: "ping", timestamp: now });
        socket.data.pendingPingAt = now;
      }
    }, this.config.clientPingIntervalMs);
  }
}
