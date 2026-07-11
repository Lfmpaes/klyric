import { isRecord, normalizeLines } from "./lyrics/LyricsSource";

export interface CiderCapabilities {
  publicLyricsApi: boolean;
  internalLyricsStore: boolean;
  storeSubscription: boolean;
  lyricDom: boolean;
  timedLyricsAvailable: boolean;
  playbackAudioElement: boolean;
}

export interface RedactedCapabilityReport {
  schemaVersion: 1;
  descriptorId:
    | "plugin-kit-public-api"
    | "candidate-internal-store"
    | "plugin-kit-timeline"
    | "cider-3.1.8-dom"
    | "unsupported";
  capabilities: CiderCapabilities;
  detectedPaths: readonly string[];
}

const PUBLIC_API_PATHS = [
  "PluginKit.lyrics",
  "lyrics",
  "getLyrics",
  "appleMusic.lyrics",
] as const;
const TIMELINE_PATHS = ["PluginKit.lyricsTimeline"] as const;
const INTERNAL_STORE_PATHS = [
  "__PLUGINSYS__.lyrics",
  "__PLUGINSYS__.stores.lyrics",
  "app.$pinia",
] as const;

export function inspectCiderCapabilities(
  root: unknown,
  documentRoot?: Document,
): RedactedCapabilityReport {
  const detectedPaths: string[] = [];
  const publicApi = firstDetected(root, PUBLIC_API_PATHS, detectedPaths);
  const timeline = firstDetected(root, TIMELINE_PATHS, detectedPaths);
  const internalStore = firstDetected(
    root,
    INTERNAL_STORE_PATHS,
    detectedPaths,
  );
  const store = findLyricsStore(internalStore);
  const lines = isRecord(store) ? readCandidateLines(store) : [];
  const lyricContainer = findLyricContainer(documentRoot);
  const audio = documentRoot?.querySelector("audio") ?? null;

  if (lyricContainer !== null) detectedPaths.push("document:lyric-container");
  if (audio !== null) detectedPaths.push("document:audio");

  return {
    schemaVersion: 1,
    descriptorId: isPublicLyricsApi(publicApi)
      ? "plugin-kit-public-api"
      : store !== undefined
        ? "candidate-internal-store"
        : isTimelineProvider(timeline)
          ? "plugin-kit-timeline"
          : lyricContainer !== null
            ? "cider-3.1.8-dom"
            : "unsupported",
    capabilities: {
      publicLyricsApi: isPublicLyricsApi(publicApi),
      internalLyricsStore: store !== undefined,
      storeSubscription:
        isRecord(store) &&
        (typeof store.$subscribe === "function" ||
          typeof store.subscribe === "function"),
      lyricDom: lyricContainer !== null,
      timedLyricsAvailable:
        isTimelineProvider(timeline) ||
        lines.some((line) => line.startTimeMs !== undefined),
      playbackAudioElement: audio !== null,
    },
    detectedPaths: [...new Set(detectedPaths)].sort(),
  };
}

function isTimelineProvider(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.getLines === "function" &&
    typeof value.getPositionMs === "function" &&
    typeof value.isPlaying === "function" &&
    typeof value.subscribe === "function"
  );
}

function isPublicLyricsApi(value: unknown): boolean {
  return isRecord(value) && typeof value.getLyrics === "function";
}

export function findLyricContainer(documentRoot?: Document): Element | null {
  if (documentRoot === undefined) return null;
  return documentRoot.querySelector(
    '.lyric-view-content, [data-testid*="lyric" i], [aria-label*="lyric" i], [role="log"][aria-live]',
  );
}

function firstDetected(
  root: unknown,
  paths: readonly string[],
  detectedPaths: string[],
): unknown {
  for (const path of paths) {
    const value = readPath(root, path);
    if (value !== undefined && value !== null) {
      detectedPaths.push(path);
      return value;
    }
  }
  return undefined;
}

function readPath(root: unknown, path: string): unknown {
  let current = root;
  for (const segment of path.split(".")) {
    if (!isRecord(current) || !(segment in current)) return undefined;
    current = current[segment];
  }
  return current;
}

function findLyricsStore(candidate: unknown): unknown {
  if (!isRecord(candidate)) return undefined;
  if (isCompatibleLyricsStore(candidate)) return candidate;

  const stores = candidate._s;
  if (!(stores instanceof Map)) return undefined;
  for (const [name, store] of stores) {
    if (
      typeof name === "string" &&
      /lyric/i.test(name) &&
      isRecord(store) &&
      isCompatibleLyricsStore(store)
    )
      return store;
  }
  return undefined;
}

function isCompatibleLyricsStore(store: Record<string, unknown>): boolean {
  const subscribable =
    typeof store.$subscribe === "function" ||
    typeof store.subscribe === "function";
  const hasLineCollection = [
    store.lines,
    store.lyrics,
    store.currentLyrics,
  ].some(Array.isArray);
  return subscribable && hasLineCollection;
}

function readCandidateLines(
  store: Record<string, unknown>,
): ReturnType<typeof normalizeLines> {
  return normalizeLines(store.lines ?? store.lyrics ?? store.currentLyrics);
}
