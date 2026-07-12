import { describe, expect, test } from "bun:test";
import { inspectCiderCapabilities } from "../src/cider/CiderCapabilities";
import {
  DomLyricsDiscovery,
  DomLyricsSource,
  findActiveLineIndex,
  InternalStoreLyricsSource,
  type LyricsSource,
  type LyricsSourceContext,
  LyricsSourceFactory,
  PublicApiLyricsSource,
  type RawLyricsSnapshot,
  TimelineLyricsSource,
} from "../src/cider/lyrics";
import { redactUnknown } from "../src/diagnostics/RedactedSnapshot";
import { createCandidatePiniaFixture } from "./fixtures/candidate-pinia-v1";
import { observedCider318 } from "./fixtures/observed-cider-3.1.8";

function context(snapshots: RawLyricsSnapshot[]): LyricsSourceContext {
  return {
    signal: new AbortController().signal,
    onSnapshot: (snapshot) => snapshots.push(snapshot),
    onError: (error) => {
      throw error;
    },
  };
}

describe("redacted capability inspection", () => {
  test("reports capability names without serializing host values", () => {
    const fixture = createCandidatePiniaFixture();
    const report = inspectCiderCapabilities(fixture.root);

    expect(report).toEqual({
      schemaVersion: 1,
      descriptorId: "candidate-internal-store",
      capabilities: {
        publicLyricsApi: false,
        internalLyricsStore: true,
        storeSubscription: true,
        lyricDom: false,
        timedLyricsAvailable: true,
        playbackAudioElement: false,
      },
      detectedPaths: ["__PLUGINSYS__.stores.lyrics"],
    });
    expect(JSON.stringify(report)).not.toContain("sanitized line");
  });

  test("redacts lyrics and secrets from arbitrary diagnostic input", () => {
    expect(
      redactUnknown({ token: "private", nested: { lyricText: "private" } }),
    ).toEqual({ token: "[redacted]", nested: { lyricText: "[redacted]" } });
  });

  test("validates public and timeline capability shapes before selecting a descriptor", () => {
    expect(
      inspectCiderCapabilities({ PluginKit: { lyrics: {} } }).descriptorId,
    ).toBe("unsupported");
    expect(
      inspectCiderCapabilities({
        PluginKit: {
          lyricsTimeline: {
            getLines() {},
            getPositionMs() {},
            isPlaying() {},
            subscribe() {},
          },
        },
      }),
    ).toMatchObject({
      descriptorId: "plugin-kit-timeline",
      capabilities: { timedLyricsAvailable: true },
    });
  });
});

describe("internal store adapter", () => {
  test("reads, subscribes, and cleans up the candidate Pinia shape", async () => {
    const fixture = createCandidatePiniaFixture();
    const snapshots: RawLyricsSnapshot[] = [];
    const source = new InternalStoreLyricsSource(fixture.root);

    expect(await source.canStart()).toBe(true);
    await source.start(context(snapshots));
    expect(snapshots[0]?.currentLine?.text).toBe("Second sanitized line");
    expect(snapshots[0]?.currentLine?.startTimeMs).toBe(3_000);
    expect(fixture.subscriberCount()).toBe(1);

    fixture.store.activeIndex = 2;
    fixture.notify();
    expect(snapshots[1]?.currentIndex).toBe(2);

    await source.stop();
    expect(fixture.subscriberCount()).toBe(0);
  });
});

describe("timeline adapter", () => {
  test("uses binary search for line changes and seeks", () => {
    const lines = [
      { text: "a", startTimeMs: 1_000 },
      { text: "b", startTimeMs: 2_000 },
      { text: "c", startTimeMs: 4_000 },
    ];
    expect(findActiveLineIndex(lines, 999)).toBeNull();
    expect(findActiveLineIndex(lines, 2_500)).toBe(1);
    expect(findActiveLineIndex(lines, 9_000)).toBe(2);
  });

  test("schedules the next boundary and reacts immediately to provider events", async () => {
    let positionMs = 1_500;
    let providerCallback = () => undefined;
    let scheduled: (() => void) | undefined;
    const snapshots: RawLyricsSnapshot[] = [];
    const source = new TimelineLyricsSource(
      {
        getLines: () => [
          { text: "a", startTimeMs: 1_000 },
          { text: "b", startTimeMs: 2_000 },
        ],
        getPositionMs: () => positionMs,
        isPlaying: () => true,
        subscribe(callback) {
          providerCallback = callback;
          return () => undefined;
        },
      },
      {
        setTimeout(callback) {
          scheduled = callback;
          return 1 as unknown as ReturnType<typeof setTimeout>;
        },
        clearTimeout() {
          scheduled = undefined;
        },
      },
    );

    await source.start(context(snapshots));
    expect(snapshots[0]?.currentIndex).toBe(0);
    expect(scheduled).toBeFunction();

    positionMs = 2_400;
    providerCallback();
    expect(snapshots.at(-1)?.currentIndex).toBe(1);
    await source.stop();
  });
});

describe("DOM discovery", () => {
  test("defers one structural activation and disconnects before it runs", () => {
    let container: Element | null = null;
    let mutation = () => undefined;
    let disconnected = 0;
    let available = 0;
    const tasks = new Map<number, () => void>();
    const root = {} as Node;
    const documentRoot = {
      documentElement: root,
      querySelector: () => container,
    } as unknown as Document;
    const discovery = new DomLyricsDiscovery(
      documentRoot,
      () => {
        available++;
        expect(disconnected).toBe(1);
      },
      {
        document: documentRoot,
        createObserver(callback) {
          mutation = () => callback([], {} as MutationObserver);
          return {
            observe(target, options) {
              expect(target).toBe(root);
              expect(options).toEqual({ childList: true, subtree: true });
            },
            disconnect() {
              disconnected++;
            },
          };
        },
        setTimeout(callback) {
          tasks.set(0, callback);
          return 0 as ReturnType<typeof setTimeout>;
        },
        clearTimeout(timer) {
          tasks.delete(timer as number);
        },
      },
    );

    discovery.start();
    mutation();
    container = {} as Element;
    mutation();
    mutation();
    expect(available).toBe(0);
    expect(tasks.size).toBe(1);
    expect(disconnected).toBe(1);

    const callback = tasks.get(0);
    tasks.delete(0);
    callback?.();
    expect(available).toBe(1);
    expect(tasks.size).toBe(0);
  });

  test("cancels deferred activation when stopped", () => {
    let mutation = () => undefined;
    let available = 0;
    let disconnected = 0;
    const tasks = new Map<number, () => void>();
    const documentRoot = {
      documentElement: {} as Node,
      querySelector: () => ({}) as Element,
    } as unknown as Document;
    const discovery = new DomLyricsDiscovery(documentRoot, () => available++, {
      document: documentRoot,
      createObserver(callback) {
        mutation = () => callback([], {} as MutationObserver);
        return { observe() {}, disconnect: () => disconnected++ };
      },
      setTimeout(callback) {
        tasks.set(0, callback);
        return 0 as ReturnType<typeof setTimeout>;
      },
      clearTimeout(timer) {
        tasks.delete(timer as number);
      },
    });

    discovery.start();
    mutation();
    expect(tasks.size).toBe(1);
    discovery.stop();
    discovery.stop();
    expect(tasks.size).toBe(0);
    expect(disconnected).toBe(1);
    expect(available).toBe(0);
  });
});

describe("DOM adapter", () => {
  test("uses the selectors observed in Cider 3.1.8", () => {
    expect(observedCider318.playingWithLyricsOpen).toMatchObject({
      containerSelector: ".lyric-view-content",
      lineSelector: ".lyric-line",
      activeLineSelector: ".lyric-line.active",
      hasLineTimestamps: false,
    });
  });

  test("emits active-line identity changes and disconnects its observer", async () => {
    let activeIndex = 0;
    let mutation = () => undefined;
    let disconnected = false;
    const elements = ["Repeated line", "Repeated line"].map((text, index) => ({
      textContent: text,
      getAttribute(name: string) {
        return name === "data-start-time-ms" ? String(index * 1_000) : null;
      },
    }));
    const container = {
      querySelector: () => elements[activeIndex] ?? null,
      querySelectorAll: () => elements,
    };
    const documentRoot = {
      querySelector: () => container,
    } as unknown as Document;
    const snapshots: RawLyricsSnapshot[] = [];
    const source = new DomLyricsSource(documentRoot, {
      document: documentRoot,
      createObserver(callback) {
        mutation = () => callback([], {} as MutationObserver);
        return {
          observe() {},
          disconnect() {
            disconnected = true;
          },
        };
      },
      queueMicrotask: (callback) => callback(),
    });

    expect(await source.canStart()).toBe(true);
    await source.start(context(snapshots));
    expect(snapshots[0]?.currentIndex).toBe(0);

    activeIndex = 1;
    mutation();
    expect(snapshots[1]?.currentIndex).toBe(1);
    expect(snapshots[1]?.currentLine?.text).toBe("Repeated line");

    await source.stop();
    expect(disconnected).toBe(true);
  });
});

describe("source factory", () => {
  test("keeps the public API as a non-starting future placeholder", async () => {
    expect(await new PublicApiLyricsSource().canStart()).toBe(false);
  });

  test("falls back in confidence order", async () => {
    const order: string[] = [];
    const source = (
      kind: LyricsSource["kind"],
      confidence: number,
      canStart: boolean,
    ): LyricsSource => ({
      kind,
      confidence,
      async canStart() {
        order.push(kind);
        return canStart;
      },
      async start() {},
      async stop() {},
    });
    const factory = new LyricsSourceFactory([
      source("dom", 60, true),
      source("public-api", 100, false),
      source("timeline", 80, true),
    ]);

    expect((await factory.startBest(context([])))?.kind).toBe("timeline");
    expect(order).toEqual(["public-api", "timeline"]);
  });

  test("does not oscillate back to adapters that failed on the current track", async () => {
    const starts: string[] = [];
    const source = (
      kind: LyricsSource["kind"],
      confidence: number,
    ): LyricsSource => ({
      kind,
      confidence,
      async canStart() {
        return true;
      },
      async start() {
        starts.push(kind);
      },
      async stop() {},
    });
    const timeline = source("timeline", 80);
    const dom = source("dom", 60);
    const factory = new LyricsSourceFactory([timeline, dom]);

    expect((await factory.startBest(context([])))?.kind).toBe("timeline");
    expect((await factory.startFallback(context([]), timeline))?.kind).toBe(
      "dom",
    );
    expect(await factory.startFallback(context([]), dom)).toBeNull();
    expect(starts).toEqual(["timeline", "dom"]);

    factory.resetFailures();
    expect((await factory.startBest(context([])))?.kind).toBe("timeline");
    expect(starts).toEqual(["timeline", "dom", "timeline"]);
    await factory.stop();
  });
});
