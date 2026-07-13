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

  test("uses browser timers without changing their receiver", () => {
    const originalMutationObserver = globalThis.MutationObserver;
    const originalSetTimeout = globalThis.setTimeout;
    const originalClearTimeout = globalThis.clearTimeout;
    let available = 0;
    let callback: (() => void) | undefined;
    const expectedReceiver = undefined;

    try {
      globalThis.MutationObserver = class {
        observe() {}
        disconnect() {}
        takeRecords(): MutationRecord[] {
          return [];
        }
      } as unknown as typeof MutationObserver;
      globalThis.setTimeout = function (scheduled) {
        expect(this).toBe(expectedReceiver);
        callback = scheduled as () => void;
        return 1 as unknown as ReturnType<typeof setTimeout>;
      } as typeof setTimeout;
      globalThis.clearTimeout = function () {
        expect(this).toBe(expectedReceiver);
      } as typeof clearTimeout;

      const documentRoot = {
        documentElement: {} as Node,
        querySelector: () => ({}) as Element,
      } as unknown as Document;
      const discovery = new DomLyricsDiscovery(documentRoot, () => available++);

      discovery.start();
      callback?.();
      expect(available).toBe(1);
    } finally {
      globalThis.MutationObserver = originalMutationObserver;
      globalThis.setTimeout = originalSetTimeout;
      globalThis.clearTimeout = originalClearTimeout;
    }
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
  function createContainer(text: string) {
    const line = {
      textContent: text,
      getAttribute: () => null,
    };
    return {
      parentElement: {} as Element,
      querySelector: () => line,
      querySelectorAll: () => [line],
    } as unknown as Element;
  }

  test("uses the selectors observed in Cider 3.1.8", () => {
    expect(observedCider318.playingWithLyricsOpen).toMatchObject({
      containerSelector: ".lyric-view-content",
      lineSelector: ".lyric-line",
      activeLineSelector: ".lyric-line.active",
      hasLineTimestamps: false,
    });
  });

  test("uses browser microtasks without changing their receiver", async () => {
    const originalMutationObserver = globalThis.MutationObserver;
    const originalQueueMicrotask = globalThis.queueMicrotask;
    let mutation = () => undefined;
    let activeIndex = 0;
    let queued: (() => void) | undefined;
    const elements = ["first line", "second line"].map((text, index) => ({
      textContent: text,
      getAttribute: () => null,
      index,
    }));
    const container = {
      parentElement: {} as Element,
      querySelector: () => elements[activeIndex],
      querySelectorAll: () => elements,
    } as unknown as Element;
    const documentRoot = {
      documentElement: {} as Node,
      querySelector: () => container,
    } as unknown as Document;
    const snapshots: RawLyricsSnapshot[] = [];

    try {
      globalThis.MutationObserver = class {
        constructor(callback: MutationCallback) {
          mutation = () => callback([], this as unknown as MutationObserver);
        }
        observe() {}
        disconnect() {}
        takeRecords(): MutationRecord[] {
          return [];
        }
      } as unknown as typeof MutationObserver;
      globalThis.queueMicrotask = function (callback) {
        expect(this).toBeUndefined();
        queued = callback;
      };

      const source = new DomLyricsSource(documentRoot);
      await source.start(context(snapshots));
      expect(snapshots.at(-1)?.currentIndex).toBe(0);

      activeIndex = 1;
      mutation();
      queued?.();
      expect(snapshots.at(-1)?.currentIndex).toBe(1);
      await source.stop();
    } finally {
      globalThis.MutationObserver = originalMutationObserver;
      globalThis.queueMicrotask = originalQueueMicrotask;
    }
  });

  test("follows a replaced lyric container after the original parent is detached", async () => {
    let container = createContainer("first line");
    const observers: Array<{
      callback: MutationCallback;
      disconnected: boolean;
      target?: Node;
      options?: MutationObserverInit;
    }> = [];
    const documentRoot = {
      documentElement: {} as Node,
      querySelector: () => container,
    } as unknown as Document;
    const snapshots: RawLyricsSnapshot[] = [];
    const source = new DomLyricsSource(documentRoot, {
      document: documentRoot,
      createObserver(callback) {
        const observer = { callback, disconnected: false };
        observers.push(observer);
        return {
          observe(target, options) {
            observer.target = target;
            observer.options = options;
          },
          disconnect() {
            observer.disconnected = true;
          },
        };
      },
      queueMicrotask: (callback) => callback(),
    });

    await source.start(context(snapshots));
    expect(snapshots).toHaveLength(1);
    expect(observers).toHaveLength(2);
    expect(observers[0]?.target).toBe(documentRoot.documentElement);
    expect(observers[0]?.options).toEqual({ childList: true, subtree: true });

    container = createContainer("replacement line");
    observers[0]?.callback([], {} as MutationObserver);

    expect(observers).toHaveLength(3);
    expect(observers[1]?.disconnected).toBe(true);
    expect(snapshots).toHaveLength(2);
    expect(snapshots[1]?.currentLine?.text).toBe("replacement line");

    await source.stop();
    expect(observers[0]?.disconnected).toBe(true);
    expect(observers[2]?.disconnected).toBe(true);
  });

  test("keeps current and neighbor indexes aligned when empty DOM rows are filtered", async () => {
    const activeIndex = 1;
    const elements = ["", "Current line", "Next line"].map((text) => ({
      textContent: text,
      getAttribute: () => null,
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
      createObserver() {
        return { observe() {}, disconnect() {} };
      },
      queueMicrotask: (callback) => callback(),
    });

    await source.start(context(snapshots));

    expect(snapshots[0]?.lines).toEqual([
      { text: "Current line", index: 0, startTimeMs: 0 },
      { text: "Next line", index: 1, startTimeMs: 0 },
    ]);
    expect(snapshots[0]?.currentIndex).toBe(0);
    expect(snapshots[0]?.currentLine).toEqual({
      text: "Current line",
      index: 0,
      startTimeMs: 0,
    });
    await source.stop();
  });

  test("emits active-line identity changes and disconnects its observers", async () => {
    let activeIndex = 0;
    const mutations: Array<() => void> = [];
    let disconnected = 0;
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
        mutations.push(() => callback([], {} as MutationObserver));
        return {
          observe() {},
          disconnect() {
            disconnected++;
          },
        };
      },
      queueMicrotask: (callback) => callback(),
    });

    expect(await source.canStart()).toBe(true);
    await source.start(context(snapshots));
    expect(snapshots[0]?.currentIndex).toBe(0);

    activeIndex = 1;
    mutations[1]?.();
    expect(snapshots[1]?.currentIndex).toBe(1);
    expect(snapshots[1]?.currentLine?.text).toBe("Repeated line");

    await source.stop();
    expect(disconnected).toBe(2);
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
