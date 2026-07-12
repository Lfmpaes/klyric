import { describe, expect, test } from "bun:test";
import type { KLyricState } from "@klyric/protocol";
import { CleanupRegistry } from "../src/application/CleanupRegistry";
import { KLyricPlugin } from "../src/application/KLyricPlugin";
import {
  type PluginPhase,
  PluginStateMachine,
} from "../src/application/PluginStateMachine";
import {
  LyricsSourceError,
  type LyricsDiscovery,
  type LyricsSource,
  type LyricsSourceContext,
  type RawLyricsSnapshot,
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

class ControllablePlayback implements PlaybackObserver {
  private context: PlaybackSourceContext | undefined;

  public start(context: PlaybackSourceContext): void {
    this.context = context;
  }

  public stop(): void {
    this.context = undefined;
  }

  public emit(
    status: "playing" | "paused" | "stopped",
    trackId: string | null,
  ): void {
    this.context?.onSnapshot({
      status,
      track: trackId === null ? null : { id: trackId },
    });
  }
}

class FakeRetryClock {
  public readonly timers = new Map<number, () => void>();
  private nextId = 0;

  public setTimeout(callback: () => void): number {
    const id = this.nextId++;
    this.timers.set(id, callback);
    return id;
  }

  public clearTimeout(timer: number): void {
    this.timers.delete(timer);
  }

  public fireNext(): void {
    const next = this.timers.entries().next().value;
    if (next === undefined) throw new Error("No retry timer is pending");
    const [id, callback] = next;
    this.timers.delete(id);
    callback();
  }
}

class FakeDiscovery implements LyricsDiscovery {
  public starts = 0;
  public stops = 0;
  private available: (() => void) | undefined;

  public constructor(onAvailable: () => void) {
    this.available = onAvailable;
  }

  public start(): void {
    this.starts++;
  }

  public stop(): void {
    this.stops++;
  }

  public trigger(): void {
    this.available?.();
  }
}

class FakeDeferredDiscovery implements LyricsDiscovery {
  public starts = 0;
  public stops = 0;
  private available: (() => void) | undefined;
  private pending = false;

  public constructor(onAvailable: () => void) {
    this.available = onAvailable;
  }

  public start(): void {
    this.starts++;
  }

  public stop(): void {
    this.stops++;
    this.pending = false;
  }

  public trigger(): void {
    this.pending = true;
  }

  public drain(): void {
    if (!this.pending) return;
    this.pending = false;
    this.available?.();
  }
}

class DelayedLyricsSource implements LyricsSource {
  public readonly kind = "dom" as const;
  public readonly confidence = 60;
  public available = false;
  public starts = 0;

  public async canStart(): Promise<boolean> {
    return this.available;
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

  public async stop(): Promise<void> {}
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

class SynchronousDomLyricsSource implements LyricsSource {
  public readonly kind = "dom" as const;
  public readonly confidence = 60;
  public readonly contexts: LyricsSourceContext[] = [];
  public starts = 0;
  public stops = 0;

  public async canStart(): Promise<boolean> {
    return true;
  }

  public async start(context: LyricsSourceContext): Promise<void> {
    this.starts++;
    this.contexts.push(context);
    context.onSnapshot(this.snapshot(this.starts));
  }

  public async stop(): Promise<void> {
    this.stops++;
  }

  public emitSnapshot(contextIndex: number, line: string): void {
    this.contexts[contextIndex]?.onSnapshot({
      source: this.kind,
      lines: [{ text: line, index: 0 }],
      currentLine: { text: line, index: 0 },
      currentIndex: 0,
    });
  }

  public emitError(contextIndex: number): void {
    this.contexts[contextIndex]?.onError(
      new LyricsSourceError(this.kind, "Synthetic superseded source error"),
    );
  }

  private snapshot(start: number): RawLyricsSnapshot {
    const line = `Sanitized line ${start}`;
    return {
      source: this.kind,
      lines: [{ text: line, index: 0 }],
      currentLine: { text: line, index: 0 },
      currentIndex: 0,
    };
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

  test("accepts synchronous DOM snapshots from a replacement source and rejects superseded callbacks", async () => {
    const playback = new ControllablePlayback();
    const lyrics = new SynchronousDomLyricsSource();
    const clock = new FakeRetryClock();
    const states: RawState[] = [];
    const plugin = new KLyricPlugin({
      document: {} as Document,
      playback,
      createLyricsSources: () => [lyrics],
      createLyricsDiscovery: (_, onAvailable) => new FakeDiscovery(onAvailable),
      lyricsRetryClock: clock,
      lyricsRetryDelaysMs: [1],
      stateMachine: new PluginStateMachine({
        onState: (_, state) => states.push(state),
      }),
    });

    await plugin.setup();
    playback.emit("playing", "track-a");
    lyrics.emitSnapshot(0, "Sanitized line 1");
    expect(states.at(-1)).toMatchObject({
      sourceKind: "dom",
      lyricsKind: "line-synced",
      hasLyrics: true,
      stale: false,
      currentLine: { text: "Sanitized line 1", index: 0 },
    });

    playback.emit("playing", "track-b");
    await settled();
    expect(lyrics.starts).toBe(2);
    expect(clock.timers.size).toBe(0);
    expect(states.at(-1)).toMatchObject({
      track: { id: "track-b" },
      sourceKind: "dom",
      lyricsKind: "line-synced",
      hasLyrics: true,
      stale: false,
      currentLine: { text: "Sanitized line 2", index: 0 },
    });

    await settled();
    const stateCount = states.length;
    lyrics.emitSnapshot(0, "Superseded line");
    lyrics.emitError(0);
    await settled();
    expect(states).toHaveLength(stateCount);
    expect(lyrics.starts).toBe(2);

    await plugin.teardown();
    lyrics.emitSnapshot(1, "Post-teardown line");
    lyrics.emitError(1);
    await settled();
    expect(states).toHaveLength(stateCount);
    expect(lyrics.starts).toBe(2);
  });

  test("retries unavailable sources while an active track is playing", async () => {
    const playback = new ControllablePlayback();
    const lyrics = new DelayedLyricsSource();
    const clock = new FakeRetryClock();
    const states: RawState[] = [];
    const plugin = new KLyricPlugin({
      document: {} as Document,
      playback,
      createLyricsSources: () => [lyrics],
      createLyricsDiscovery: (_, onAvailable) => new FakeDiscovery(onAvailable),
      lyricsRetryClock: clock,
      lyricsRetryDelaysMs: [1, 2],
      stateMachine: new PluginStateMachine({
        onState: (_, state) => states.push(state),
      }),
    });

    await plugin.setup();
    playback.emit("playing", "track-a");
    expect(clock.timers.size).toBe(1);
    lyrics.available = true;
    clock.fireNext();
    await settled();

    expect(lyrics.starts).toBe(1);
    expect(states.at(-1)).toMatchObject({
      sourceKind: "dom",
      lyricsKind: "line-synced",
      hasLyrics: true,
    });
    expect(clock.timers.size).toBe(0);
    await plugin.teardown();
  });

  test("activates discovery after retry exhaustion and cleans it up on lifecycle changes", async () => {
    const playback = new ControllablePlayback();
    const lyrics = new DelayedLyricsSource();
    const clock = new FakeRetryClock();
    const discoveries: FakeDiscovery[] = [];
    const plugin = new KLyricPlugin({
      document: {} as Document,
      playback,
      createLyricsSources: () => [lyrics],
      createLyricsDiscovery: (_, onAvailable) => {
        const discovery = new FakeDiscovery(onAvailable);
        discoveries.push(discovery);
        return discovery;
      },
      lyricsRetryClock: clock,
      lyricsRetryDelaysMs: [1, 2],
    });

    await plugin.setup();
    playback.emit("playing", "track-a");
    clock.fireNext();
    await settled();
    clock.fireNext();
    await settled();
    expect(clock.timers.size).toBe(0);
    expect(discoveries).toHaveLength(1);

    lyrics.available = true;
    discoveries[0]?.trigger();
    discoveries[0]?.trigger();
    await settled();
    expect(lyrics.starts).toBe(1);
    expect(discoveries[0]?.stops).toBe(1);

    lyrics.available = false;
    playback.emit("playing", "track-b");
    expect(discoveries).toHaveLength(2);
    playback.emit("stopped", null);
    expect(discoveries[1]?.stops).toBe(1);
    discoveries[1]?.trigger();
    await settled();
    expect(lyrics.starts).toBe(1);

    await plugin.teardown();
  });

  test("defers exhausted-retry discovery and cancels it on lifecycle changes", async () => {
    const playback = new ControllablePlayback();
    const lyrics = new DelayedLyricsSource();
    const clock = new FakeRetryClock();
    const discoveries: FakeDeferredDiscovery[] = [];
    const plugin = new KLyricPlugin({
      document: {} as Document,
      playback,
      createLyricsSources: () => [lyrics],
      createLyricsDiscovery: (_, onAvailable) => {
        const discovery = new FakeDeferredDiscovery(onAvailable);
        discoveries.push(discovery);
        return discovery;
      },
      lyricsRetryClock: clock,
      lyricsRetryDelaysMs: [1, 2],
    });

    await plugin.setup();
    playback.emit("playing", "track-a");
    clock.fireNext();
    await settled();
    clock.fireNext();
    await settled();
    expect(discoveries).toHaveLength(1);

    lyrics.available = true;
    discoveries[0]?.trigger();
    discoveries[0]?.trigger();
    expect(lyrics.starts).toBe(0);
    discoveries[0]?.drain();
    await settled();
    expect(lyrics.starts).toBe(1);

    lyrics.available = false;
    playback.emit("playing", "track-b");
    expect(discoveries).toHaveLength(2);
    discoveries[1]?.trigger();
    playback.emit("stopped", null);
    discoveries[1]?.drain();
    await settled();
    expect(lyrics.starts).toBe(1);

    await plugin.teardown();
  });

  test("bounds retries and cancels them when playback stops or teardown begins", async () => {
    const playback = new ControllablePlayback();
    const lyrics = new DelayedLyricsSource();
    const clock = new FakeRetryClock();
    const plugin = new KLyricPlugin({
      document: {} as Document,
      playback,
      createLyricsSources: () => [lyrics],
      createLyricsDiscovery: (_, onAvailable) => new FakeDiscovery(onAvailable),
      lyricsRetryClock: clock,
      lyricsRetryDelaysMs: [1, 2],
    });

    await plugin.setup();
    playback.emit("playing", "track-a");
    clock.fireNext();
    await settled();
    expect(clock.timers.size).toBe(1);
    clock.fireNext();
    await settled();
    expect(clock.timers.size).toBe(0);

    playback.emit("playing", "track-b");
    expect(clock.timers.size).toBe(1);
    playback.emit("paused", "track-b");
    expect(clock.timers.size).toBe(0);
    playback.emit("playing", "track-b");
    expect(clock.timers.size).toBe(1);
    await plugin.teardown();
    expect(clock.timers.size).toBe(0);
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

  test("handles repeated lines, pause/resume, rapid seeks, skips, replay, and no-lyrics states", () => {
    const states: RawState[] = [];
    const machine = new PluginStateMachine({
      sessionId: "scenario-session",
      onState: (_, state) => states.push(state),
    });
    const repeated = {
      source: "dom" as const,
      lines: [
        { text: "Repeated", index: 0 },
        { text: "Repeated", index: 1 },
      ],
      currentLine: { text: "Repeated", index: 0 },
      currentIndex: 0,
      trackId: "track-a",
    };

    machine.setConnected(true);
    machine.setPlayback({
      status: "playing",
      track: { id: "track-a" },
      positionMs: 1_000,
    });
    machine.setLyrics(repeated);
    machine.setLyrics({
      ...repeated,
      currentLine: { text: "Repeated", index: 1 },
      currentIndex: 1,
    });
    expect(states.at(-1)?.currentLine?.index).toBe(1);

    machine.setPlayback({
      status: "paused",
      track: { id: "track-a" },
      positionMs: 1_000,
    });
    expect(states.at(-1)).toMatchObject({
      playbackStatus: "paused",
      currentLine: { index: 1 },
    });
    machine.setPlayback({
      status: "playing",
      track: { id: "track-a" },
      positionMs: 1_000,
    });
    expect(states.at(-1)?.playbackStatus).toBe("playing");

    machine.setPlayback({
      status: "playing",
      track: { id: "track-a" },
      positionMs: 5_000,
    });
    machine.setPlayback({
      status: "playing",
      track: { id: "track-a" },
      positionMs: 9_000,
    });
    expect(states.at(-1)).toMatchObject({ currentLine: null, stale: true });
    machine.setLyrics({
      ...repeated,
      currentIndex: 1,
      currentLine: repeated.lines[1] ?? null,
    });
    expect(states.at(-1)).toMatchObject({
      currentLine: { index: 1 },
      stale: false,
    });

    machine.setPlayback({ status: "playing", track: { id: "track-b" } });
    machine.setPlayback({ status: "playing", track: { id: "track-c" } });
    machine.setLyrics({ ...repeated, trackId: "track-b" });
    expect(states.at(-1)).toMatchObject({
      track: { id: "track-c" },
      currentLine: null,
    });
    machine.setPlayback({ status: "playing", track: { id: "track-a" } });
    expect(states.at(-1)).toMatchObject({
      track: { id: "track-a" },
      currentLine: null,
      stale: true,
    });

    machine.setLyrics({
      source: "dom",
      lines: [],
      currentLine: null,
      currentIndex: null,
      trackId: "track-a",
    });
    expect(states.at(-1)).toMatchObject({
      lyricsKind: "unavailable",
      hasLyrics: false,
    });
    machine.setLyrics({
      source: "dom",
      lines: [{ text: "Instrumental", index: 0, isInstrumental: true }],
      currentLine: { text: "Instrumental", index: 0, isInstrumental: true },
      currentIndex: 0,
      trackId: "track-a",
    });
    expect(states.at(-1)?.lyricsKind).toBe("instrumental");
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
  for (let index = 0; index < 5; index++) await Promise.resolve();
}
