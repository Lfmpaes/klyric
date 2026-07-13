import {
  DEFAULT_MAX_CLOCK_SKEW_MS,
  LYRICS_KINDS,
  MAX_ARTWORK_URL_CODE_POINTS,
  MAX_COMPONENT_VERSION_CODE_POINTS,
  MAX_ERROR_CODE_CODE_POINTS,
  MAX_ERROR_MESSAGE_CODE_POINTS,
  MAX_LYRIC_LINE_CODE_POINTS,
  MAX_PROTOCOL_PAYLOAD_BYTES,
  MAX_SESSION_ID_CODE_POINTS,
  MAX_TRACK_TEXT_CODE_POINTS,
  PLAYBACK_STATUSES,
  PROTOCOL_VERSION,
  SOURCE_KINDS,
  STATE_CLEAR_REASONS,
} from "./constants";
import type {
  ClientMessage,
  KLyricState,
  LyricLine,
  ServerMessage,
  StateValidationOptions,
  TrackIdentity,
} from "./types";

export class ProtocolValidationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ProtocolValidationError";
  }
}

type UnknownRecord = Record<string, unknown>;

function fail(message: string): never {
  throw new ProtocolValidationError(message);
}

function asRecord(value: unknown, name: string): UnknownRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return fail(`${name} must be an object.`);
  }

  return value as UnknownRecord;
}

function asString(value: unknown, name: string): string {
  if (typeof value !== "string") {
    return fail(`${name} must be a string.`);
  }

  return value;
}

function codePointLength(value: string): number {
  return Array.from(value).length;
}

function normalizedText(
  value: unknown,
  name: string,
  maximumCodePoints: number,
): string | null {
  const text = asString(value, name).trim();
  if (codePointLength(text) > maximumCodePoints) {
    return fail(`${name} exceeds its ${maximumCodePoints} code point limit.`);
  }

  return text === "" ? null : text;
}

function requiredText(
  value: unknown,
  name: string,
  maximumCodePoints: number,
): string {
  const text = normalizedText(value, name, maximumCodePoints);
  if (text === null) {
    return fail(`${name} must not be empty.`);
  }

  return text;
}

function asNonNegativeSafeInteger(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    return fail(`${name} must be a non-negative safe integer.`);
  }

  return value as number;
}

function asBoolean(value: unknown, name: string): boolean {
  if (typeof value !== "boolean") {
    return fail(`${name} must be a boolean.`);
  }

  return value;
}

function hasEnumValue<T extends readonly string[]>(
  value: unknown,
  name: string,
  values: T,
): T[number] {
  if (typeof value !== "string" || !values.includes(value)) {
    return fail(`${name} is not supported.`);
  }

  return value as T[number];
}

function optionalText(
  value: unknown,
  name: string,
  maximumCodePoints: number,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const text = normalizedText(value, name, maximumCodePoints);
  return text ?? undefined;
}

function optionalNonNegativeSafeInteger(
  value: unknown,
  name: string,
): number | undefined {
  return value === undefined
    ? undefined
    : asNonNegativeSafeInteger(value, name);
}

function optionalBoolean(value: unknown, name: string): boolean | undefined {
  return value === undefined ? undefined : asBoolean(value, name);
}

function readPayloadSize(value: unknown): void {
  let json: string | undefined;
  try {
    json = JSON.stringify(value);
  } catch {
    fail("Payload must be JSON serializable.");
  }

  if (json === undefined) {
    fail("Payload must be JSON serializable.");
  }

  if (new TextEncoder().encode(json).byteLength > MAX_PROTOCOL_PAYLOAD_BYTES) {
    fail(`Payload exceeds the ${MAX_PROTOCOL_PAYLOAD_BYTES} byte limit.`);
  }
}

function parseTrack(value: unknown): TrackIdentity | null {
  if (value === null) {
    return null;
  }

  const track = asRecord(value, "track");
  const result: TrackIdentity = {};
  const id = optionalText(track.id, "track.id", MAX_TRACK_TEXT_CODE_POINTS);
  const title = optionalText(
    track.title,
    "track.title",
    MAX_TRACK_TEXT_CODE_POINTS,
  );
  const artist = optionalText(
    track.artist,
    "track.artist",
    MAX_TRACK_TEXT_CODE_POINTS,
  );
  const album = optionalText(
    track.album,
    "track.album",
    MAX_TRACK_TEXT_CODE_POINTS,
  );
  const durationMs = optionalNonNegativeSafeInteger(
    track.durationMs,
    "track.durationMs",
  );
  const artworkUrl = optionalText(
    track.artworkUrl,
    "track.artworkUrl",
    MAX_ARTWORK_URL_CODE_POINTS,
  );

  if (id !== undefined) result.id = id;
  if (title !== undefined) result.title = title;
  if (artist !== undefined) result.artist = artist;
  if (album !== undefined) result.album = album;
  if (durationMs !== undefined) result.durationMs = durationMs;
  if (artworkUrl !== undefined) result.artworkUrl = artworkUrl;
  return result;
}

function parseLyricLine(value: unknown, name: string): LyricLine | null {
  if (value === null) {
    return null;
  }

  const line = asRecord(value, name);
  const text = normalizedText(
    line.text,
    `${name}.text`,
    MAX_LYRIC_LINE_CODE_POINTS,
  );
  if (text === null) {
    return null;
  }

  const startTimeMs = optionalNonNegativeSafeInteger(
    line.startTimeMs,
    `${name}.startTimeMs`,
  );
  const endTimeMs = optionalNonNegativeSafeInteger(
    line.endTimeMs,
    `${name}.endTimeMs`,
  );
  const index = optionalNonNegativeSafeInteger(line.index, `${name}.index`);
  const isInstrumental = optionalBoolean(
    line.isInstrumental,
    `${name}.isInstrumental`,
  );
  if (
    startTimeMs !== undefined &&
    endTimeMs !== undefined &&
    endTimeMs < startTimeMs
  ) {
    return fail(`${name}.endTimeMs must not be earlier than startTimeMs.`);
  }

  const result: LyricLine = { text };
  if (startTimeMs !== undefined) result.startTimeMs = startTimeMs;
  if (endTimeMs !== undefined) result.endTimeMs = endTimeMs;
  if (index !== undefined) result.index = index;
  if (isInstrumental !== undefined) result.isInstrumental = isInstrumental;
  return result;
}

function parseProtocolVersion(
  value: unknown,
  name: string,
): typeof PROTOCOL_VERSION {
  if (value !== PROTOCOL_VERSION) {
    return fail(`${name} must be protocol version ${PROTOCOL_VERSION}.`);
  }

  return PROTOCOL_VERSION;
}

function parseTimestamp(
  value: unknown,
  options: StateValidationOptions,
): string {
  const emittedAt = requiredText(
    value,
    "emittedAt",
    MAX_COMPONENT_VERSION_CODE_POINTS,
  );
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/u.test(
      emittedAt,
    )
  ) {
    return fail("emittedAt must be an ISO-8601 timestamp with a timezone.");
  }
  const milliseconds = Date.parse(emittedAt);
  if (Number.isNaN(milliseconds)) {
    return fail("emittedAt must be an ISO-8601 timestamp.");
  }

  const now = options.now ?? Date.now();
  const maxClockSkewMs = options.maxClockSkewMs ?? DEFAULT_MAX_CLOCK_SKEW_MS;
  if (
    !Number.isSafeInteger(now) ||
    !Number.isSafeInteger(maxClockSkewMs) ||
    maxClockSkewMs < 0
  ) {
    return fail("Timestamp validation options are invalid.");
  }
  if (Math.abs(milliseconds - now) > maxClockSkewMs) {
    return fail("emittedAt is outside the allowed bridge clock skew.");
  }

  return new Date(milliseconds).toISOString();
}

function parseSessionId(value: unknown): string {
  const sessionId = requiredText(
    value,
    "sessionId",
    MAX_SESSION_ID_CODE_POINTS,
  );
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/u.test(sessionId)) {
    return fail("sessionId contains unsupported characters.");
  }

  return sessionId;
}

function parseUnixTimestamp(value: unknown, name: string): number {
  return asNonNegativeSafeInteger(value, name);
}

/** Parses, size-checks, and normalizes a state publication. */
export function parseKLyricState(
  value: unknown,
  options: StateValidationOptions = {},
): KLyricState {
  readPayloadSize(value);
  const state = asRecord(value, "state");
  const lyricsKind = hasEnumValue(state.lyricsKind, "lyricsKind", LYRICS_KINDS);
  const currentLine = parseLyricLine(state.currentLine, "currentLine");
  const previousLine = parseLyricLine(state.previousLine, "previousLine");
  const nextLine = parseLyricLine(state.nextLine, "nextLine");
  const hasLyrics = asBoolean(state.hasLyrics, "hasLyrics");

  if (lyricsKind === "unavailable" && hasLyrics) {
    return fail("hasLyrics must be false when lyricsKind is unavailable.");
  }
  if (
    lyricsKind === "unavailable" &&
    (currentLine || previousLine || nextLine)
  ) {
    return fail("Unavailable lyrics must not include lyric lines.");
  }

  const positionMs = optionalNonNegativeSafeInteger(
    state.positionMs,
    "positionMs",
  );
  const trackHasLyrics = optionalBoolean(
    state.trackHasLyrics,
    "trackHasLyrics",
  );
  const lyricsPanelOpen = optionalBoolean(
    state.lyricsPanelOpen,
    "lyricsPanelOpen",
  );
  const result: KLyricState = {
    protocolVersion: parseProtocolVersion(
      state.protocolVersion,
      "protocolVersion",
    ),
    sequence: asNonNegativeSafeInteger(state.sequence, "sequence"),
    sessionId: parseSessionId(state.sessionId),
    emittedAt: parseTimestamp(state.emittedAt, options),
    playbackStatus: hasEnumValue(
      state.playbackStatus,
      "playbackStatus",
      PLAYBACK_STATUSES,
    ),
    track: parseTrack(state.track),
    lyricsKind,
    sourceKind: hasEnumValue(state.sourceKind, "sourceKind", SOURCE_KINDS),
    currentLine,
    previousLine,
    nextLine,
    hasLyrics,
    stale: asBoolean(state.stale, "stale"),
  };
  if (positionMs !== undefined) result.positionMs = positionMs;
  if (trackHasLyrics !== undefined) result.trackHasLyrics = trackHasLyrics;
  if (lyricsPanelOpen !== undefined) result.lyricsPanelOpen = lyricsPanelOpen;
  return result;
}

/** Rejects a sequence regression within a session; a new session may restart at zero. */
export function validateStateTransition(
  previous: KLyricState | null,
  next: KLyricState,
): void {
  if (
    previous?.sessionId === next.sessionId &&
    next.sequence <= previous.sequence
  ) {
    fail("sequence must increase within a session.");
  }
}

export function parseServerMessage(
  value: unknown,
  options: StateValidationOptions = {},
): ServerMessage {
  readPayloadSize(value);
  const message = asRecord(value, "server message");
  const type = asString(message.type, "server message.type");

  switch (type) {
    case "hello":
      return {
        type,
        protocolVersion: parseProtocolVersion(
          message.protocolVersion,
          "protocolVersion",
        ),
        bridgeVersion: requiredText(
          message.bridgeVersion,
          "bridgeVersion",
          MAX_COMPONENT_VERSION_CODE_POINTS,
        ),
      };
    case "state":
      return { type, payload: parseKLyricState(message.payload, options) };
    case "state-cleared":
      return {
        type,
        reason: hasEnumValue(message.reason, "reason", STATE_CLEAR_REASONS),
      };
    case "error":
      return {
        type,
        code: requiredText(message.code, "code", MAX_ERROR_CODE_CODE_POINTS),
        message: requiredText(
          message.message,
          "message",
          MAX_ERROR_MESSAGE_CODE_POINTS,
        ),
      };
    case "ping":
      return {
        type,
        timestamp: parseUnixTimestamp(message.timestamp, "timestamp"),
      };
    default:
      return fail("server message.type is not supported.");
  }
}

export function parseClientMessage(value: unknown): ClientMessage {
  readPayloadSize(value);
  const message = asRecord(value, "client message");
  const type = asString(message.type, "client message.type");

  switch (type) {
    case "hello":
      if (message.client !== "plasmoid") {
        return fail("client must be plasmoid.");
      }
      return {
        type,
        protocolVersion: parseProtocolVersion(
          message.protocolVersion,
          "protocolVersion",
        ),
        client: "plasmoid",
        clientVersion: requiredText(
          message.clientVersion,
          "clientVersion",
          MAX_COMPONENT_VERSION_CODE_POINTS,
        ),
      };
    case "pong":
      return {
        type,
        timestamp: parseUnixTimestamp(message.timestamp, "timestamp"),
      };
    default:
      return fail("client message.type is not supported.");
  }
}

export function isProtocolValidationError(
  error: unknown,
): error is ProtocolValidationError {
  return error instanceof ProtocolValidationError;
}
