import type { SourcePreference } from "../../settings/PluginSettings";
import { DomLyricsSource } from "./DomLyricsSource";
import { InternalStoreLyricsSource } from "./InternalStoreLyricsSource";
import type { LyricsSource } from "./LyricsSource";
import {
  PublicApiLyricsSource,
  type PublicLyricsApi,
} from "./PublicApiLyricsSource";
import {
  TimelineLyricsSource,
  type TimelineProvider,
} from "./TimelineLyricsSource";

/** Builds only capability-gated adapters in the documented Phase 1 priority. */
export function createLyricsSources(
  root: unknown,
  documentRoot: Document,
  preference: SourcePreference = "auto",
): readonly LyricsSource[] {
  const sources: LyricsSource[] = [
    new PublicApiLyricsSource(findPublicLyricsApi(root)),
    new InternalStoreLyricsSource(root),
  ];
  const timeline = findTimelineProvider(root);
  if (timeline !== undefined) sources.push(new TimelineLyricsSource(timeline));
  sources.push(new DomLyricsSource(documentRoot));
  return preference === "auto"
    ? sources
    : sources.filter((source) => source.kind === preference);
}

function findPublicLyricsApi(root: unknown): PublicLyricsApi | undefined {
  if (!isRecord(root)) return undefined;
  const pluginKit = isRecord(root.PluginKit) ? root.PluginKit : undefined;
  const candidate = pluginKit?.lyrics;
  return isPublicLyricsApi(candidate) ? candidate : undefined;
}

function findTimelineProvider(root: unknown): TimelineProvider | undefined {
  if (!isRecord(root)) return undefined;
  const pluginKit = isRecord(root.PluginKit) ? root.PluginKit : undefined;
  const candidate = pluginKit?.lyricsTimeline;
  return isTimelineProvider(candidate) ? candidate : undefined;
}

function isPublicLyricsApi(value: unknown): value is PublicLyricsApi {
  return isRecord(value) && typeof value.getLyrics === "function";
}

function isTimelineProvider(value: unknown): value is TimelineProvider {
  return (
    isRecord(value) &&
    typeof value.getLines === "function" &&
    typeof value.getPositionMs === "function" &&
    typeof value.isPlaying === "function" &&
    typeof value.subscribe === "function"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
