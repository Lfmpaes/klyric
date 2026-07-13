import { PROTOCOL_VERSION } from "./constants";
import type { ClientMessage, KLyricState, ServerMessage } from "./types";

export const FIXTURE_EMITTED_AT = "2026-07-11T12:00:00.000Z";

export const validStateFixture: KLyricState = {
  protocolVersion: PROTOCOL_VERSION,
  sequence: 42,
  sessionId: "session-fixture-01",
  emittedAt: FIXTURE_EMITTED_AT,
  playbackStatus: "playing",
  track: {
    id: "track-fixture-01",
    title: "Fixture title",
    artist: "Fixture artist",
    album: "Fixture album",
    durationMs: 245_000,
  },
  lyricsKind: "line-synced",
  sourceKind: "dom",
  currentLine: { text: "Current fixture line", startTimeMs: 12_000, index: 3 },
  previousLine: { text: "Previous fixture line", startTimeMs: 8_000, index: 2 },
  nextLine: { text: "Next fixture line", startTimeMs: 16_000, index: 4 },
  positionMs: 12_500,
  trackHasLyrics: true,
  lyricsPanelOpen: true,
  hasLyrics: true,
  stale: false,
};

export const validUnavailableStateFixture: KLyricState = {
  protocolVersion: PROTOCOL_VERSION,
  sequence: 43,
  sessionId: "session-fixture-01",
  emittedAt: FIXTURE_EMITTED_AT,
  playbackStatus: "paused",
  track: null,
  lyricsKind: "unavailable",
  sourceKind: "none",
  currentLine: null,
  previousLine: null,
  nextLine: null,
  hasLyrics: false,
  stale: true,
};

export const validServerMessagesFixture: readonly ServerMessage[] = [
  { type: "hello", protocolVersion: PROTOCOL_VERSION, bridgeVersion: "0.1.0" },
  { type: "state", payload: validStateFixture },
  { type: "state-cleared", reason: "expired" },
  { type: "error", code: "invalid-state", message: "The state was rejected." },
  { type: "ping", timestamp: 1_783_771_200_000 },
];

export const validClientMessagesFixture: readonly ClientMessage[] = [
  {
    type: "hello",
    protocolVersion: PROTOCOL_VERSION,
    client: "plasmoid",
    clientVersion: "0.1.0",
  },
  { type: "pong", timestamp: 1_783_771_200_000 },
];

export const invalidProtocolFixtures: Readonly<Record<string, unknown>> = {
  unsupportedVersion: { ...validStateFixture, protocolVersion: 2 },
  missingCurrentLineText: { ...validStateFixture, currentLine: {} },
  oversizedLine: {
    ...validStateFixture,
    currentLine: { text: "x".repeat(2_001) },
  },
  invalidTimeline: {
    ...validStateFixture,
    currentLine: { text: "fixture", startTimeMs: 10, endTimeMs: 9 },
  },
  unavailableWithLine: {
    ...validUnavailableStateFixture,
    currentLine: { text: "not allowed" },
  },
  invalidSession: { ...validStateFixture, sessionId: "contains whitespace" },
};
