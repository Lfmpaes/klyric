import type {
  LYRICS_KINDS,
  PLAYBACK_STATUSES,
  PROTOCOL_VERSION,
  SOURCE_KINDS,
  STATE_CLEAR_REASONS,
} from "./constants";

export type PlaybackStatus = (typeof PLAYBACK_STATUSES)[number];
export type LyricsKind = (typeof LYRICS_KINDS)[number];
export type SourceKind = (typeof SOURCE_KINDS)[number];
export type StateClearReason = (typeof STATE_CLEAR_REASONS)[number];

export interface TrackIdentity {
  id?: string;
  title?: string;
  artist?: string;
  album?: string;
  durationMs?: number;
  artworkUrl?: string;
}

export interface LyricLine {
  text: string;
  startTimeMs?: number;
  endTimeMs?: number;
  index?: number;
  isInstrumental?: boolean;
}

export interface KLyricState {
  protocolVersion: typeof PROTOCOL_VERSION;
  sequence: number;
  sessionId: string;
  emittedAt: string;
  playbackStatus: PlaybackStatus;
  track: TrackIdentity | null;
  lyricsKind: LyricsKind;
  sourceKind: SourceKind;
  currentLine: LyricLine | null;
  previousLine: LyricLine | null;
  nextLine: LyricLine | null;
  positionMs?: number;
  hasLyrics: boolean;
  stale: boolean;
}

export type ServerMessage =
  | {
      type: "hello";
      protocolVersion: typeof PROTOCOL_VERSION;
      bridgeVersion: string;
    }
  | { type: "state"; payload: KLyricState }
  | { type: "state-cleared"; reason: StateClearReason }
  | { type: "error"; code: string; message: string }
  | { type: "ping"; timestamp: number };

export type ClientMessage =
  | {
      type: "hello";
      protocolVersion: typeof PROTOCOL_VERSION;
      client: "plasmoid";
      clientVersion: string;
    }
  | { type: "pong"; timestamp: number };

export interface StateValidationOptions {
  /** Clock used to validate `emittedAt`; defaults to `Date.now()`. */
  now?: number;
  /** Maximum allowed distance between `emittedAt` and `now`. */
  maxClockSkewMs?: number;
}
