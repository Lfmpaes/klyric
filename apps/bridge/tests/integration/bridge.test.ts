import { afterEach, describe, expect, test } from "bun:test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { PROTOCOL_VERSION, validStateFixture } from "@klyric/protocol";
import { PublisherTokenStore } from "../../src/auth/PublisherToken";
import { type BridgeConfig, resolveBridgeConfig } from "../../src/config";
import { type BridgeServer, startBridge } from "../../src/server";

let bridge: BridgeServer | undefined;

afterEach(() => bridge?.stop());

async function startTestBridge(
  overrides: Partial<BridgeConfig> = {},
): Promise<{ baseUrl: string; token: string }> {
  const root = join("/tmp", `klyric-bridge-${crypto.randomUUID()}`);
  await mkdir(root, { recursive: true });
  const config = await resolveBridgeConfig({
    environment: { XDG_CONFIG_HOME: root },
  });
  const tokens = new PublisherTokenStore(config.tokenPath);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const testConfig = {
      ...config,
      ...overrides,
      port: 40_000 + Math.floor(Math.random() * 20_000),
    };
    try {
      bridge = await startBridge({
        bridgeVersion: "test",
        config: testConfig,
        logger: {
          info: () => undefined,
          warn: () => undefined,
          error: () => undefined,
        },
        tokenStore: tokens,
      });
      break;
    } catch (error) {
      if (attempt === 4) throw error;
    }
  }
  if (bridge === undefined) throw new Error("Test bridge did not start.");
  return {
    baseUrl: `http://${bridge.host}:${bridge.port}`,
    token: await tokens.loadOrCreate(),
  };
}

function state(
  sequence: number,
  text = "Current fixture line",
): Record<string, unknown> {
  return {
    ...validStateFixture,
    sequence,
    emittedAt: new Date().toISOString(),
    currentLine: { ...validStateFixture.currentLine, text },
  };
}

function nextMessage(socket: WebSocket): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("WebSocket message timed out.")),
      2_000,
    );
    socket.addEventListener(
      "message",
      (event) => {
        clearTimeout(timer);
        resolve(JSON.parse(String(event.data)) as Record<string, unknown>);
      },
      { once: true },
    );
  });
}

describe("bridge state lifecycle", () => {
  test("authenticates writes and sends cached and broadcast state to a WebSocket client", async () => {
    const { baseUrl, token } = await startTestBridge();
    expect((await fetch(`${baseUrl}/health`)).status).toBe(200);
    expect(
      (
        await fetch(`${baseUrl}/v1/state`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(state(1)),
        })
      ).status,
    ).toBe(401);

    const headers = {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    };
    expect(
      (
        await fetch(`${baseUrl}/v1/state`, {
          method: "POST",
          headers,
          body: JSON.stringify(state(1)),
        })
      ).status,
    ).toBe(202);
    expect((await fetch(`${baseUrl}/v1/state`)).status).toBe(200);

    const socket = new WebSocket(`${baseUrl.replace("http", "ws")}/v1/events`);
    const hello = nextMessage(socket);
    await new Promise<void>((resolve) =>
      socket.addEventListener("open", () => resolve(), { once: true }),
    );
    expect(await hello).toMatchObject({
      type: "hello",
      protocolVersion: PROTOCOL_VERSION,
    });
    socket.send(
      JSON.stringify({
        type: "hello",
        protocolVersion: PROTOCOL_VERSION,
        client: "plasmoid",
        clientVersion: "test",
      }),
    );
    expect(await nextMessage(socket)).toMatchObject({
      type: "state",
      payload: { sequence: 1 },
    });

    expect(
      (
        await fetch(`${baseUrl}/v1/state`, {
          method: "POST",
          headers,
          body: JSON.stringify(state(2)),
        })
      ).status,
    ).toBe(204);
    const broadcast = nextMessage(socket);
    expect(
      (
        await fetch(`${baseUrl}/v1/state`, {
          method: "POST",
          headers,
          body: JSON.stringify(state(3, "Changed fixture line")),
        })
      ).status,
    ).toBe(202);
    expect(await broadcast).toMatchObject({
      type: "state",
      payload: { sequence: 3 },
    });
    expect(
      (await fetch(`${baseUrl}/v1/state`, { method: "DELETE", headers }))
        .status,
    ).toBe(204);
    socket.close();
  });

  test("reports validation and protocol errors without accepting them", async () => {
    const { baseUrl, token } = await startTestBridge();
    const headers = {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    };
    expect(
      (
        await fetch(`${baseUrl}/v1/state`, {
          method: "POST",
          headers,
          body: JSON.stringify({ protocolVersion: 99 }),
        })
      ).status,
    ).toBe(426);
    expect(
      (
        await fetch(`${baseUrl}/v1/state`, {
          method: "POST",
          headers,
          body: "not-json",
        })
      ).status,
    ).toBe(400);
    expect((await fetch(`${baseUrl}/v1/state`)).status).toBe(204);
  });

  test("pings acknowledged clients without timing out before the first ping", async () => {
    const { baseUrl } = await startTestBridge({
      clientPingIntervalMs: 20,
      clientPongTimeoutMs: 80,
    });
    const socket = new WebSocket(`${baseUrl.replace("http", "ws")}/v1/events`);
    const hello = nextMessage(socket);
    await new Promise<void>((resolve) =>
      socket.addEventListener("open", () => resolve(), { once: true }),
    );
    await hello;
    socket.send(
      JSON.stringify({
        type: "hello",
        protocolVersion: PROTOCOL_VERSION,
        client: "plasmoid",
        clientVersion: "test",
      }),
    );
    const firstPing = await nextMessage(socket);
    expect(firstPing).toMatchObject({ type: "ping" });
    socket.send(
      JSON.stringify({ type: "pong", timestamp: firstPing.timestamp }),
    );
    expect(await nextMessage(socket)).toMatchObject({ type: "ping" });
    socket.close();
  });
});
