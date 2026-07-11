import {
  finiteNumber,
  isRecord,
  type LyricsSource,
  type LyricsSourceContext,
  LyricsSourceError,
  normalizeLines,
  type RawLyricsSnapshot,
} from "./LyricsSource";

export interface InternalStoreDescriptor {
  readonly id: string;
  detect(root: unknown): boolean;
  subscribe(root: unknown, callback: () => void): () => void;
  read(root: unknown): RawLyricsSnapshot | null;
}

interface SubscribableStore extends Record<string, unknown> {
  $subscribe?: (callback: () => void) => (() => void) | undefined;
  subscribe?: (callback: () => void) => (() => void) | undefined;
}

export const piniaLyricsDescriptor: InternalStoreDescriptor = {
  id: "pinia-lyrics-v1",
  detect(root) {
    return resolvePiniaLyricsStore(root) !== undefined;
  },
  subscribe(root, callback) {
    const store = resolvePiniaLyricsStore(root);
    if (store === undefined) return () => undefined;
    const subscribe = store.$subscribe ?? store.subscribe;
    if (subscribe === undefined) return () => undefined;
    const cleanup = subscribe.call(store, callback);
    return typeof cleanup === "function" ? cleanup : () => undefined;
  },
  read(root) {
    const store = resolvePiniaLyricsStore(root);
    if (store === undefined) return null;
    const lines = normalizeLines(
      store.lines ?? store.lyrics ?? store.currentLyrics,
    );
    if (lines.length === 0) return null;

    const rawIndex = finiteNumber(
      store.activeIndex ?? store.currentIndex ?? store.currentLineIndex,
    );
    const currentIndex =
      rawIndex !== undefined && Number.isInteger(rawIndex) ? rawIndex : null;
    const currentLine =
      currentIndex !== null ? (lines[currentIndex] ?? null) : null;
    const snapshot: RawLyricsSnapshot = {
      source: "internal-store",
      lines,
      currentLine,
      currentIndex,
    };
    const positionMs = finiteNumber(store.positionMs);
    const trackId = store.trackId;
    if (positionMs !== undefined) snapshot.positionMs = positionMs;
    if (typeof trackId === "string") snapshot.trackId = trackId;
    return snapshot;
  },
};

export class InternalStoreLyricsSource implements LyricsSource {
  readonly kind = "internal-store" as const;
  readonly confidence = 90;
  private cleanup: (() => void) | undefined;

  constructor(
    private readonly root: unknown,
    private readonly descriptors: readonly InternalStoreDescriptor[] = [
      piniaLyricsDescriptor,
    ],
  ) {}

  async canStart(): Promise<boolean> {
    return this.descriptors.some((descriptor) => descriptor.detect(this.root));
  }

  async start(context: LyricsSourceContext): Promise<void> {
    await this.stop();
    const descriptor = this.descriptors.find((candidate) =>
      candidate.detect(this.root),
    );
    if (descriptor === undefined) {
      throw new LyricsSourceError(this.kind, "No compatible lyric store found");
    }

    const emit = () => {
      try {
        const snapshot = descriptor.read(this.root);
        if (snapshot !== null) context.onSnapshot(snapshot);
      } catch (error) {
        context.onError(
          new LyricsSourceError(this.kind, "Failed to read lyric store", {
            cause: error,
          }),
        );
      }
    };
    this.cleanup = descriptor.subscribe(this.root, emit);
    context.signal.addEventListener("abort", () => void this.stop(), {
      once: true,
    });
    emit();
  }

  async stop(): Promise<void> {
    this.cleanup?.();
    this.cleanup = undefined;
  }
}

function resolvePiniaLyricsStore(root: unknown): SubscribableStore | undefined {
  if (!isRecord(root)) return undefined;
  const pluginSystem = isRecord(root.__PLUGINSYS__) ? root.__PLUGINSYS__ : root;
  const direct = isRecord(pluginSystem.lyrics)
    ? pluginSystem.lyrics
    : isRecord(pluginSystem.stores) && isRecord(pluginSystem.stores.lyrics)
      ? pluginSystem.stores.lyrics
      : undefined;
  if (direct !== undefined) return direct;

  const app = isRecord(root.app) ? root.app : undefined;
  const pinia =
    app !== undefined && isRecord(app.$pinia) ? app.$pinia : undefined;
  const stores = pinia?._s;
  if (!(stores instanceof Map)) return undefined;
  for (const [name, store] of stores) {
    if (typeof name === "string" && /lyric/i.test(name) && isRecord(store)) {
      return store;
    }
  }
  return undefined;
}
