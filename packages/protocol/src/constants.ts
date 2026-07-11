/** The only protocol major version supported by this package. */
export const PROTOCOL_VERSION = 1 as const;

export const SUPPORTED_PROTOCOL_VERSIONS = [PROTOCOL_VERSION] as const;

export const MAX_PROTOCOL_PAYLOAD_BYTES = 64 * 1024;
export const MAX_LYRIC_LINE_CODE_POINTS = 2_000;
export const MAX_TRACK_TEXT_CODE_POINTS = 500;
export const MAX_ARTWORK_URL_CODE_POINTS = 2_048;
export const MAX_SESSION_ID_CODE_POINTS = 128;
export const MAX_COMPONENT_VERSION_CODE_POINTS = 128;
export const MAX_ERROR_CODE_CODE_POINTS = 64;
export const MAX_ERROR_MESSAGE_CODE_POINTS = 500;

/** Five minutes is enough to tolerate normal local scheduling delay. */
export const DEFAULT_MAX_CLOCK_SKEW_MS = 5 * 60 * 1_000;

export const PLAYBACK_STATUSES = [
  "playing",
  "paused",
  "stopped",
  "loading",
  "unknown",
] as const;

export const LYRICS_KINDS = [
  "word-synced",
  "line-synced",
  "unsynced",
  "instrumental",
  "unavailable",
] as const;

export const SOURCE_KINDS = [
  "public-api",
  "internal-store",
  "dom",
  "timeline",
  "none",
] as const;

export const STATE_CLEAR_REASONS = [
  "expired",
  "publisher-disconnected",
  "manual",
] as const;
