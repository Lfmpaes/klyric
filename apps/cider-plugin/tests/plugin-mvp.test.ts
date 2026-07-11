import { describe, expect, test } from "bun:test";
import type { KLyricState } from "@klyric/protocol";
import { CleanupRegistry } from "../src/application/CleanupRegistry";
import { KLyricPlugin } from "../src/application/KLyricPlugin";
import {
  type PluginPhase,
  PluginStateMachine,
} from "../src/application/PluginStateMachine";
import type {
  LyricsSource,
  LyricsSourceContext,
  RawLyricsSnapshot,
} from "../src/cider/lyrics";
import type {
  PlaybackObserver,
  PlaybackSourceContext,
} from "../src/cider/PlaybackSource";
import { normalizeTrack } from "../src/cider/PlaybackSource";
import { BridgeClientError } from "../src/publisher/BridgeClient";

class FakePlayback implements PlaybackObserver {
  public starts = 0;
  public stops = 0;

  public start(context: PlaybackSourceContext): void {
    this.starts++;
    context.onSnapshot({ status: "stopped", track: null });
  }

  public stop(): void {
    this.stops++;
  }
}

class FakeLyricsSource implements LyricsSource {
  public readonly kind = "dom" as const;
  public readonly confidence = 60;
  public starts = 0;
  public stops = 0;

  public async canStart(): Promise<boolean> {
    return true;
  }

  public async start(context: LyricsSourceContext): Promise<void> {
    this.starts++;
    context.onSnapshot({
      source: this.kind,
      lines: [{ text: "Sanitized line", index: 0 }],
      currentLine: { text: "Sanitized line", index: 0 },
      currentIndex: 0,
    });
  }

  public async stop(): Promise<void> {
    this.stops++;
  }
}

describe("plugin lifecycle", () => {
  test("runs cleanup in reverse order and only once", async () => {
    const calls: string[] = [];
    const cleanup = new CleanupRegistry();
    cleanup.add(() => calls.push("first"));
    cleanup.add(() => calls.push("second"));

    await cleanup.dispose();
    await cleanup.dispose();
    expect(calls).toEqual(["second", "first"]);
  });

  test("tears down observers before a deterministic restart", async () => {
    const playback = new FakePlayback();
    const lyrics = new FakeLyricsSource();
    const plugin = new KLyricPlugin({
      document: {} as Document,
      playback,
      createLyricsSources: () => [lyrics],
    });

    await plugin.setup();
    await plugin.setup();
    expect(playback.starts).toBe(2);
    expect(playback.stops).toBe(1);
    expect(lyrics.starts).toBe(2);
    expect(lyrics.stops).toBe(1);

    await plugin.teardown();
    expect(playback.stops).toBe(2);
    expect(lyrics.stops).toBe(2);
    expect(plugin.isStarted()).toBe(false);
  });

  test("falls back to the next compatible lyric source after startup failure", async () => {
    let failedStarts = 0;
    let failedStops = 0;
    const fallback = new FakeLyricsSource();
    const plugin = new KLyricPlugin({
      document: {} as Document,
      playback: new FakePlayback(),
      createLyricsSources: () => [
        {
          kind: "internal-store",
          confidence: 90,
          async canStart() {
            return true;
          },
          async start() {
            failedStarts++;
            throw new Error("Synthetic source incompatibility");
          },
          async stop() {
            failedStops++;
          },
        },
        fallback,
      ],
    });

    await plugin.setup();
    expect(failedStarts).toBe(1);
    expect(failedStops).toBe(1);
    expect(fallback.starts).toBe(1);
    await plugin.teardown();
  });

  test("keeps Cider observers active while the bridge is unavailable", async () => {
    const playback = new FakePlayback();
    const plugin = new KLyricPlugin({
      document: {} as Document,
      playback,
      createLyricsSources: () => [new FakeLyricsSource()],
      createPublisher: () => ({
        async publish() {
          throw new BridgeClientError("network", "offline");
        },
        async clear() {},
      }),
    });

    await plugin.setup();
    await settled();
    expect(plugin.isStarted()).toBe(true);
    expect(playback.starts).toBe(1);
    await plugin.teardown();
  });
});

describe("plugin state machine", () => {
  test("normalizes observations into ordered protocol states", () => {
    const phases: PluginPhase[] = [];
    const states: RawState[] = [];
    const machine = new PluginStateMachine({
      sessionId: "test-session",
      now: () => new Date("2026-07-11T12:00:00.000Z"),
      onState: (phase, state) => {
        phases.push(phase);
        states.push(state);
      },
    });

    machine.start();
    machine.setConnected(true);
    machine.setPlayback({
      status: "playing",
      track: { id: "track-a", title: "Sanitized track" },
      positionMs: 1_250,
    });
    machine.setLyrics(snapshot());
    machine.setPlayback({
      status: "paused",
      track: { id: "track-a", title: "Sanitized track" },
      positionMs: 1_250,
    });
    machine.bridgeFailed();
    machine.setEnabled(false);

    expect(phases).toEqual([
      "connecting",
      "idle",
      "loading-track",
      "playing-with-lyrics",
      "paused",
      "bridge-error",
      "disabled",
    ]);
    expect(states[3]).toMatchObject({
      protocolVersion: 1,
      sessionId: "test-session",
      playbackStatus: "playing",
      sourceKind: "dom",
      lyricsKind: "line-synced",
      currentLine: { text: "Current", index: 1 },
      previousLine: { text: "Previous", index: 0 },
      nextLine: { text: "Next", index: 2 },
      hasLyrics: true,
      positionMs: 1_250,
    });
    expect(states.map((state) => state.sequence)).toEqual([
      0, 1, 2, 3, 4, 5, 6,
    ]);
  });

  test("clears incompatible lyric state when the observed track changes", () => {
    const states: RawState[] = [];
    const machine = new PluginStateMachine({
      sessionId: "test-session",
      onState: (_, state) => states.push(state),
    });
    machine.setConnected(true);
    machine.setPlayback({ status: "playing", track: { id: "track-a" } });
    machine.setLyrics(snapshot());
    machine.setPlayback({ status: "playing", track: { id: "track-b" } });

    expect(states.at(-1)).toMatchObject({
      track: { id: "track-b" },
      lyricsKind: "unavailable",
      currentLine: null,
      hasLyrics: false,
    });
  });

  test("marks a prior line stale until a seek receives a fresh lyric snapshot", () => {
    const states: RawState[] = [];
    const machine = new PluginStateMachine({
      sessionId: "test-session",
      onState: (_, state) => states.push(state),
    });
    machine.setConnected(true);
    machine.setPlayback({
      status: "playing",
      track: { id: "track-a" },
      positionMs: 1_000,
    });
    machine.setLyrics(snapshot());
    machine.setPlayback({
      status: "playing",
      track: { id: "track-a" },
      positionMs: 12_000,
    });
    expect(states.at(-1)).toMatchObject({
      currentLine: null,
      hasLyrics: false,
      stale: true,
    });

    machine.setLyrics(snapshot());
    expect(states.at(-1)).toMatchObject({
      currentLine: { text: "Current" },
      stale: false,
    });
  });

  test("retains a paused line but clears it after playback stops", () => {
    const states: RawState[] = [];
    const machine = new PluginStateMachine({
      sessionId: "test-session",
      onState: (_, state) => states.push(state),
    });
    machine.setConnected(true);
    machine.setPlayback({ status: "playing", track: { id: "track-a" } });
    machine.setLyrics(snapshot());
    machine.setPlayback({ status: "paused", track: { id: "track-a" } });
    expect(states.at(-1)).toMatchObject({
      playbackStatus: "paused",
      currentLine: { text: "Current" },
    });
    machine.setPlayback({ status: "stopped", track: null });
    expect(states.at(-1)).toMatchObject({
      playbackStatus: "stopped",
      lyricsKind: "unavailable",
      currentLine: null,
      stale: false,
    });
  });
});

describe("playback normalization", () => {
  test("maps observed MusicKit metadata to a safe protocol track", () => {
    expect(
      normalizeTrack({
        id: "track-id",
        attributes: {
          name: "Sanitized title",
          artistName: "Sanitized artist",
          albumName: "Sanitized album",
          durationInMillis: 123_456,
          artwork: { url: "https://example.test/artwork" },
        },
      }),
    ).toEqual({
      id: "track-id",
      title: "Sanitized title",
      artist: "Sanitized artist",
      album: "Sanitized album",
      durationMs: 123_456,
      artworkUrl: "https://example.test/artwork",
    });
  });
});

type RawState = KLyricState;

function snapshot(): RawLyricsSnapshot {
  return {
    source: "dom",
    lines: [
      { text: "Previous", index: 0 },
      { text: "Current", index: 1 },
      { text: "Next", index: 2 },
    ],
    currentLine: { text: "Current", index: 1 },
    currentIndex: 1,
  };
}

async function settled(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}
