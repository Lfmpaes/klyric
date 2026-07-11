import { describe, expect, test } from "bun:test";
import type { KLyricState } from "@klyric/protocol";
import { Diagnostics } from "../src/diagnostics/Diagnostics";
import { BridgeClient, BridgeClientError } from "../src/publisher/BridgeClient";
import { PublishQueue, type QueueClock } from "../src/publisher/PublishQueue";
import {
  DEFAULT_PLUGIN_SETTINGS,
  normalizeSettings,
  PluginSettingsStore,
} from "../src/settings/PluginSettings";

const token = "a".repeat(43);

function state(sequence: number): KLyricState {
  return {
    protocolVersion: 1,
    sequence,
    sessionId: "test-session",
    emittedAt: "2026-07-11T12:00:00.000Z",
    playbackStatus: "playing",
    track: { id: "track" },
    lyricsKind: "line-synced",
    sourceKind: "dom",
    currentLine: { text: "Sanitized line", index: 0 },
    previousLine: null,
    nextLine: null,
    hasLyrics: true,
    stale: false,
  };
}

describe("bridge client", () => {
  test("uses authenticated loopback requests and validates health", async () => {
    const requests: Request[] = [];
    const client = new BridgeClient(
      { ...DEFAULT_PLUGIN_SETTINGS, publisherToken: token },
      {
        async fetch(input, init) {
          requests.push(new Request(input, init));
          if (String(input).endsWith("/health")) {
            return Response.json({ status: "ok", protocolVersion: 1 });
          }
          return new Response(null, { status: 202 });
        },
      },
    );

    await client.publish(state(1));
    await expect(client.health()).resolves.toEqual({
      status: "ok",
      protocolVersion: 1,
    });
    expect(requests[0]?.url).toBe("http://127.0.0.1:37654/v1/state");
    expect(requests[0]?.headers.get("authorization")).toBe(`Bearer ${token}`);
  });

  test("does not send a request without a configured token", async () => {
    const client = new BridgeClient(DEFAULT_PLUGIN_SETTINGS, {
      async fetch() {
        throw new Error("must not fetch");
      },
    });
    await expect(client.publish(state(1))).rejects.toMatchObject({
      kind: "authentication",
    });
  });
});

describe("publication queue", () => {
  test("deduplicates display-equivalent updates but preserves forced heartbeats", async () => {
    const sent: number[] = [];
    const queue = new PublishQueue({
      async publish(next) {
        sent.push(next.sequence);
      },
      async clear() {},
    });

    queue.enqueue(state(1));
    await settled();
    queue.enqueue(state(2));
    await settled();
    queue.enqueue(state(3), true);
    await settled();
    expect(sent).toEqual([1, 3]);
    await queue.stop();
  });

  test("keeps the latest pending state and retries transient failures", async () => {
    const sent: number[] = [];
    let fail = true;
    let retry: (() => void) | undefined;
    const clock: QueueClock = {
      setTimeout(callback) {
        retry = callback;
        return 1 as unknown as ReturnType<typeof setTimeout>;
      },
      clearTimeout() {
        retry = undefined;
      },
    };
    const queue = new PublishQueue(
      {
        async publish(next) {
          sent.push(next.sequence);
          if (fail) throw new BridgeClientError("network", "offline");
        },
        async clear() {},
      },
      { clock },
    );

    queue.enqueue(state(1));
    await settled();
    queue.enqueue(state(2));
    fail = false;
    retry?.();
    await settled();
    expect(sent).toEqual([1, 2]);
    await queue.stop();
  });

  test("does not overwrite a newer state when an in-flight request fails", async () => {
    const sent: number[] = [];
    let rejectFirst: ((error: Error) => void) | undefined;
    let retry: (() => void) | undefined;
    const queue = new PublishQueue(
      {
        publish(next) {
          sent.push(next.sequence);
          if (next.sequence !== 1) return Promise.resolve();
          return new Promise<void>((_resolve, reject) => {
            rejectFirst = reject;
          });
        },
        async clear() {},
      },
      {
        clock: {
          setTimeout(callback) {
            retry = callback;
            return 1 as unknown as ReturnType<typeof setTimeout>;
          },
          clearTimeout() {
            retry = undefined;
          },
        },
      },
    );

    queue.enqueue(state(1));
    await settled();
    queue.enqueue(state(2));
    rejectFirst?.(new BridgeClientError("network", "offline"));
    await settled();
    retry?.();
    await settled();
    expect(sent).toEqual([1, 2]);
    await queue.stop();
  });

  test("does not retry authentication failures", async () => {
    let retryScheduled = false;
    const queue = new PublishQueue(
      {
        async publish() {
          throw new BridgeClientError("authentication", "bad token");
        },
        async clear() {},
      },
      {
        clock: {
          setTimeout() {
            retryScheduled = true;
            return 1 as unknown as ReturnType<typeof setTimeout>;
          },
          clearTimeout() {},
        },
      },
    );
    queue.enqueue(state(1));
    await settled();
    expect(retryScheduled).toBe(false);
    await queue.stop();
  });
});

describe("settings and diagnostics", () => {
  test("fails closed to loopback-safe settings and stores no invalid token", () => {
    expect(
      normalizeSettings({
        bridgeHost: "192.168.1.7",
        bridgePort: 70_000,
        publisherToken: "unsafe",
        sourcePreference: "none",
      }),
    ).toEqual(DEFAULT_PLUGIN_SETTINGS);

    const values = new Map<string, string>();
    const store = new PluginSettingsStore({
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    });
    const saved = store.save({
      ...DEFAULT_PLUGIN_SETTINGS,
      publisherToken: token,
    });
    expect(store.load()).toEqual(saved);
  });

  test("reports only redacted capability and operational metadata", () => {
    const diagnostics = new Diagnostics("0.1.0", {
      schemaVersion: 1,
      descriptorId: "cider-3.1.8-dom",
      capabilities: {
        publicLyricsApi: false,
        internalLyricsStore: false,
        storeSubscription: false,
        lyricDom: true,
        timedLyricsAvailable: false,
        playbackAudioElement: true,
      },
      detectedPaths: ["document:lyric-container"],
    });
    diagnostics.setState("playing-with-lyrics", "dom");
    diagnostics.recordError(new Error("Sanitized error"));
    const snapshot = diagnostics.snapshot();
    expect(JSON.stringify(snapshot)).not.toContain("Sanitized line");
    expect(JSON.stringify(snapshot)).not.toContain(token);
    expect(snapshot).toMatchObject({ sourceKind: "dom", lastError: "Error" });
  });
});

async function settled(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}
