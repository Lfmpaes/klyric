import {
  type KLyricState,
  PROTOCOL_VERSION,
  type SourceKind,
} from "@klyric/protocol";
import type { RawLyricLine, RawLyricsSnapshot } from "../cider/lyrics";
import type { PlaybackSnapshot } from "../cider/PlaybackSource";

export type PluginPhase =
  | "initializing"
  | "connecting"
  | "idle"
  | "loading-track"
  | "playing-with-lyrics"
  | "playing-without-lyrics"
  | "paused"
  | "stopped"
  | "source-error"
  | "bridge-error"
  | "disabled";

export interface PluginStateMachineOptions {
  now?: () => Date;
  sessionId?: string;
  onState?: (phase: PluginPhase, state: KLyricState) => void;
}

export type PluginStateListener = (
  phase: PluginPhase,
  state: KLyricState,
) => void;

/** Converts observed host data into a complete, publication-ready protocol state. */
export class PluginStateMachine {
  private readonly now: () => Date;
  private readonly sessionId: string;
  private readonly onState: (phase: PluginPhase, state: KLyricState) => void;
  private readonly listeners = new Set<PluginStateListener>();
  private phase: PluginPhase = "initializing";
  private playback: PlaybackSnapshot = { status: "stopped", track: null };
  private lyrics: RawLyricsSnapshot | null = null;
  private sourceKind: SourceKind = "none";
  private enabled = true;
  private connected = false;
  private sourceError = false;
  private bridgeError = false;
  private trackLoading = false;
  private lineStale = false;
  private sequence = 0;

  public constructor(options: PluginStateMachineOptions = {}) {
    this.now = options.now ?? (() => new Date());
    this.sessionId = options.sessionId ?? createSessionId();
    this.onState = options.onState ?? (() => undefined);
  }

  public start(): void {
    this.phase = "connecting";
    this.emit();
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.emitDerived();
  }

  public setConnected(connected: boolean): void {
    this.connected = connected;
    this.bridgeError = false;
    this.emitDerived();
  }

  public setPlayback(snapshot: PlaybackSnapshot): void {
    const trackChanged =
      trackIdentity(this.playback) !== trackIdentity(snapshot);
    const positionJumped =
      !trackChanged &&
      snapshot.positionMs !== undefined &&
      this.playback.positionMs !== undefined &&
      Math.abs(snapshot.positionMs - this.playback.positionMs) >= 2_000;
    this.playback = snapshot;
    if (trackChanged) {
      this.lyrics = null;
      this.trackLoading = snapshot.track !== null;
      this.lineStale = snapshot.track !== null;
    } else if (positionJumped) {
      this.lyrics = null;
      this.lineStale = true;
    }
    if (snapshot.status === "stopped") {
      this.lyrics = null;
      this.sourceKind = "none";
      this.trackLoading = false;
      this.lineStale = false;
    }
    this.emitDerived();
  }

  public setLyrics(snapshot: RawLyricsSnapshot): void {
    if (
      snapshot.trackId !== undefined &&
      this.playback.track?.id !== undefined &&
      snapshot.trackId !== this.playback.track.id
    ) {
      return;
    }
    this.lyrics = snapshot;
    this.sourceKind = snapshot.source;
    this.sourceError = false;
    this.trackLoading = false;
    this.lineStale = false;
    this.emitDerived();
  }

  public setSourceKind(kind: SourceKind): void {
    this.sourceKind = kind;
    this.sourceError = false;
    this.emitDerived();
  }

  public sourceFailed(): void {
    this.sourceError = true;
    this.emitDerived();
  }

  public bridgeFailed(): void {
    this.bridgeError = true;
    this.emitDerived();
  }

  public currentPhase(): PluginPhase {
    return this.phase;
  }

  public subscribe(listener: PluginStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Produces a new ordered publication for an otherwise unchanged heartbeat. */
  public heartbeat(): KLyricState {
    return this.makeState();
  }

  private emitDerived(): void {
    this.phase = this.derivePhase();
    this.emit();
  }

  private derivePhase(): PluginPhase {
    if (!this.enabled) return "disabled";
    if (this.bridgeError) return "bridge-error";
    if (this.sourceError) return "source-error";
    if (!this.connected) return "connecting";
    if (this.playback.track === null) return "idle";
    if (this.trackLoading) return "loading-track";
    switch (this.playback.status) {
      case "playing":
        return this.lyrics?.currentLine === null || this.lyrics === null
          ? "playing-without-lyrics"
          : "playing-with-lyrics";
      case "paused":
        return "paused";
      case "stopped":
        return "stopped";
      case "loading":
      case "unknown":
        return "loading-track";
      default:
        return "loading-track";
    }
  }

  private emit(): void {
    const state = this.makeState();
    this.onState(this.phase, state);
    for (const listener of this.listeners) listener(this.phase, state);
  }

  private makeState(): KLyricState {
    const lines = this.lyrics?.lines ?? [];
    const current = this.lyrics?.currentLine ?? null;
    const currentIndex = this.lyrics?.currentIndex ?? null;
    const hasLyrics = lines.length > 0 || current !== null;
    const lyricsKind = !hasLyrics
      ? "unavailable"
      : current?.isInstrumental === true
        ? "instrumental"
        : "line-synced";
    const state: KLyricState = {
      protocolVersion: PROTOCOL_VERSION,
      sequence: this.sequence++,
      sessionId: this.sessionId,
      emittedAt: this.now().toISOString(),
      playbackStatus: this.playback.status,
      track: this.playback.track,
      lyricsKind,
      sourceKind: this.sourceKind,
      currentLine: hasLyrics ? toLine(current) : null,
      previousLine: hasLyrics ? neighbor(lines, currentIndex, -1) : null,
      nextLine: hasLyrics ? neighbor(lines, currentIndex, 1) : null,
      hasLyrics,
      stale: this.lineStale,
    };
    if (this.playback.trackHasLyrics !== undefined)
      state.trackHasLyrics = this.playback.trackHasLyrics;
    if (this.playback.lyricsPanelOpen !== undefined)
      state.lyricsPanelOpen = this.playback.lyricsPanelOpen;
    if (this.playback.positionMs !== undefined)
      state.positionMs = this.playback.positionMs;
    return state;
  }
}

function neighbor(
  lines: readonly RawLyricLine[],
  index: number | null,
  offset: -1 | 1,
) {
  if (index === null) return null;
  return toLine(lines[index + offset] ?? null);
}

function toLine(line: RawLyricLine | null) {
  if (line === null) return null;
  const result = { text: line.text };
  return {
    ...result,
    ...(line.startTimeMs === undefined
      ? {}
      : { startTimeMs: Math.round(line.startTimeMs) }),
    ...(line.endTimeMs === undefined
      ? {}
      : { endTimeMs: Math.round(line.endTimeMs) }),
    ...(line.index === undefined ? {} : { index: line.index }),
    ...(line.isInstrumental === undefined
      ? {}
      : { isInstrumental: line.isInstrumental }),
  };
}

function trackIdentity(snapshot: PlaybackSnapshot): string {
  return snapshot.track?.id ?? JSON.stringify(snapshot.track);
}

function createSessionId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `klyric-${Date.now()}`;
}
