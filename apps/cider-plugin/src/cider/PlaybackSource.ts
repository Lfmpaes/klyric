import type { PlaybackStatus, TrackIdentity } from "@klyric/protocol";

export interface PlaybackSnapshot {
  status: PlaybackStatus;
  track: TrackIdentity | null;
  positionMs?: number;
  trackHasLyrics?: boolean;
  lyricsPanelOpen?: boolean;
}

export interface PlaybackSourceContext {
  signal: AbortSignal;
  onSnapshot(snapshot: PlaybackSnapshot): void;
  onError(error: Error): void;
}

export interface PlaybackObserver {
  start(context: PlaybackSourceContext): void;
  stop(): void;
}

interface MusicKitItem {
  id?: unknown;
  attributes?: Record<string, unknown>;
}

interface MusicKitInstance {
  currentPlaybackTime?: unknown;
  isPlaying?: unknown;
  nowPlayingItem?: MusicKitItem | null;
  playbackState?: unknown;
}

interface MusicKitApi {
  getInstance?: () => MusicKitInstance;
}

export interface PlaybackEnvironment {
  document: Document;
  getMusicKit(): MusicKitApi | undefined;
  createObserver(callback: MutationCallback): MutationObserver;
}

function browserEnvironment(): PlaybackEnvironment {
  return {
    document,
    getMusicKit: () =>
      (globalThis as Record<string, unknown>).MusicKit as
        | MusicKitApi
        | undefined,
    createObserver: (callback) => new MutationObserver(callback),
  };
}

/**
 * Normalizes the documented MusicKit surface and the guarded renderer audio
 * element. The audio element is used only for event delivery and position
 * fallback; no host state is mutated.
 */
export class PlaybackSource implements PlaybackObserver {
  private audio: HTMLAudioElement | null = null;
  private cleanup: (() => void) | undefined;
  private observer: MutationObserver | undefined;
  private lastIdentity: string | undefined;

  public constructor(
    private readonly environment: PlaybackEnvironment = browserEnvironment(),
  ) {}

  public start(context: PlaybackSourceContext): void {
    this.stop();
    const emit = () => {
      try {
        const snapshot = this.read();
        const identity = JSON.stringify(snapshot);
        if (identity === this.lastIdentity) return;
        this.lastIdentity = identity;
        context.onSnapshot(snapshot);
      } catch (error) {
        context.onError(
          error instanceof Error ? error : new Error("Playback read failed"),
        );
      }
    };
    const attachAudio = () => {
      const next = this.environment.document.querySelector("audio");
      if (next === this.audio) return;
      this.cleanup?.();
      this.audio = next;
      if (next === null) return;
      const events = [
        "canplay",
        "durationchange",
        "emptied",
        "ended",
        "loadedmetadata",
        "pause",
        "play",
        "playing",
        "ratechange",
        "seeked",
        "seeking",
        "timeupdate",
      ] as const;
      for (const event of events) next.addEventListener(event, emit);
      this.cleanup = () => {
        for (const event of events) next.removeEventListener(event, emit);
      };
      emit();
    };

    this.observer = this.environment.createObserver(() => {
      attachAudio();
      emit();
    });
    this.observer.observe(this.environment.document.documentElement, {
      childList: true,
      subtree: true,
    });
    context.signal.addEventListener("abort", () => this.stop(), { once: true });
    attachAudio();
    emit();
  }

  public stop(): void {
    this.cleanup?.();
    this.cleanup = undefined;
    this.audio = null;
    this.observer?.disconnect();
    this.observer = undefined;
    this.lastIdentity = undefined;
  }

  private read(): PlaybackSnapshot {
    let music: MusicKitInstance | undefined;
    try {
      music = this.environment.getMusicKit()?.getInstance?.();
    } catch {
      music = undefined;
    }
    const track = normalizeTrack(music?.nowPlayingItem);
    const positionSeconds = finiteNumber(music?.currentPlaybackTime);
    const audioPosition = finiteNumber(this.audio?.currentTime);
    const position = positionSeconds ?? audioPosition;
    const snapshot: PlaybackSnapshot = {
      status: normalizeStatus(music, this.audio, track),
      track,
    };
    const trackHasLyrics = trackLyricsAvailability(music?.nowPlayingItem);
    if (trackHasLyrics !== undefined) snapshot.trackHasLyrics = trackHasLyrics;
    snapshot.lyricsPanelOpen =
      this.environment.document.querySelector(".lyric-view-content") !== null;
    if (position !== undefined && position >= 0) {
      snapshot.positionMs = Math.round(position * 1_000);
    }
    return snapshot;
  }
}

export function normalizeTrack(
  item: MusicKitItem | null | undefined,
): TrackIdentity | null {
  if (item === undefined || item === null) return null;
  const attributes = item.attributes ?? {};
  const track: TrackIdentity = {};
  const id = text(item.id) ?? text(attributes.playParamsId);
  const title = text(attributes.name) ?? text(attributes.title);
  const artist = text(attributes.artistName) ?? text(attributes.artist);
  const album = text(attributes.albumName) ?? text(attributes.album);
  const duration =
    finiteNumber(attributes.durationInMillis) ??
    finiteNumber(attributes.durationMs);
  const artwork = artworkUrl(attributes.artwork);
  if (id !== undefined) track.id = id;
  if (title !== undefined) track.title = title;
  if (artist !== undefined) track.artist = artist;
  if (album !== undefined) track.album = album;
  if (duration !== undefined && duration >= 0)
    track.durationMs = Math.round(duration);
  if (artwork !== undefined) track.artworkUrl = artwork;
  return Object.keys(track).length > 0 ? track : null;
}

export function trackLyricsAvailability(
  item: MusicKitItem | null | undefined,
): boolean | undefined {
  if (item === undefined || item === null) return undefined;
  const attributes = item.attributes ?? {};
  for (const key of ["hasLyrics", "hasTimeSyncedLyrics"] as const) {
    if (typeof attributes[key] === "boolean") return attributes[key];
  }
  return undefined;
}

function normalizeStatus(
  music: MusicKitInstance | undefined,
  audio: HTMLAudioElement | null,
  track: TrackIdentity | null,
): PlaybackStatus {
  if (audio?.ended === true) return "stopped";
  if (audio?.paused === false || music?.isPlaying === true) return "playing";
  const state =
    typeof music?.playbackState === "string"
      ? music.playbackState.toLowerCase()
      : "";
  if (state.includes("load") || state.includes("buffer")) return "loading";
  if (state.includes("stop")) return "stopped";
  if (
    audio !== null ||
    track !== null ||
    music?.isPlaying === false ||
    state.includes("pause")
  ) {
    return "paused";
  }
  return "stopped";
}

function artworkUrl(value: unknown): string | undefined {
  if (typeof value === "string") return text(value);
  if (typeof value !== "object" || value === null) return undefined;
  const url = (value as Record<string, unknown>).url;
  return typeof url === "string" ? text(url) : undefined;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : undefined;
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}
