import { describe, expect, test } from "bun:test";
import {
  FIXTURE_EMITTED_AT,
  LYRICS_KINDS,
  MAX_PROTOCOL_PAYLOAD_BYTES,
  PLAYBACK_STATUSES,
  PROTOCOL_VERSION,
  ProtocolValidationError,
  parseClientMessage,
  parseKLyricState,
  parseServerMessage,
  SOURCE_KINDS,
  STATE_CLEAR_REASONS,
  validateStateTransition,
  validClientMessagesFixture,
  validServerMessagesFixture,
  validStateFixture,
} from "../src";

const validationOptions = { now: Date.parse(FIXTURE_EMITTED_AT) };

function cloneFixture(): Record<string, unknown> {
  return structuredClone(validStateFixture) as Record<string, unknown>;
}

function expectValidationFailure(action: () => unknown): void {
  expect(action).toThrow(ProtocolValidationError);
}

describe("KLyric state validation", () => {
  test("parses all supported enum values", () => {
    for (const playbackStatus of PLAYBACK_STATUSES) {
      for (const lyricsKind of LYRICS_KINDS) {
        const state = cloneFixture();
        state.playbackStatus = playbackStatus;
        state.lyricsKind = lyricsKind;
        if (lyricsKind === "unavailable") {
          state.hasLyrics = false;
          state.currentLine = null;
          state.previousLine = null;
          state.nextLine = null;
        }

        for (const sourceKind of SOURCE_KINDS) {
          state.sourceKind = sourceKind;
          expect(parseKLyricState(state, validationOptions).sourceKind).toBe(
            sourceKind,
          );
        }
      }
    }
  });

  test("normalizes text while preserving intentional internal whitespace", () => {
    const state = cloneFixture();
    state.currentLine = { text: "  first\tsecond  " };
    state.track = { title: "  title  ", artist: "   " };

    expect(parseKLyricState(state, validationOptions)).toMatchObject({
      currentLine: { text: "first\tsecond" },
      track: { title: "title" },
    });
  });

  test("converts an empty lyric line to null", () => {
    const state = cloneFixture();
    state.currentLine = { text: "   " };

    expect(parseKLyricState(state, validationOptions).currentLine).toBeNull();
  });

  test("rejects malformed, oversized, and semantically inconsistent states", () => {
    const missingField = cloneFixture();
    delete missingField.sessionId;
    expectValidationFailure(() =>
      parseKLyricState(missingField, validationOptions),
    );

    const unsupportedVersion = cloneFixture();
    unsupportedVersion.protocolVersion = PROTOCOL_VERSION + 1;
    expectValidationFailure(() =>
      parseKLyricState(unsupportedVersion, validationOptions),
    );

    const oversizedLine = cloneFixture();
    oversizedLine.currentLine = { text: "x".repeat(2_001) };
    expectValidationFailure(() =>
      parseKLyricState(oversizedLine, validationOptions),
    );

    const invalidRange = cloneFixture();
    invalidRange.currentLine = { text: "line", startTimeMs: 2, endTimeMs: 1 };
    expectValidationFailure(() =>
      parseKLyricState(invalidRange, validationOptions),
    );

    const unavailableWithLines = cloneFixture();
    unavailableWithLines.lyricsKind = "unavailable";
    unavailableWithLines.hasLyrics = false;
    expectValidationFailure(() =>
      parseKLyricState(unavailableWithLines, validationOptions),
    );
  });

  test("counts Unicode code points rather than UTF-16 code units", () => {
    const state = cloneFixture();
    state.currentLine = { text: "🎵".repeat(2_000) };
    expect(
      parseKLyricState(state, validationOptions).currentLine?.text,
    ).toHaveLength(4_000);
  });

  test("rejects an oversized serialized payload", () => {
    const state = cloneFixture();
    state.unrecognizedFutureField = "x".repeat(MAX_PROTOCOL_PAYLOAD_BYTES);
    expectValidationFailure(() => parseKLyricState(state, validationOptions));
  });

  test("requires an in-range emittedAt timestamp and a safe session identifier", () => {
    const staleTimestamp = cloneFixture();
    staleTimestamp.emittedAt = "2020-01-01T00:00:00.000Z";
    expectValidationFailure(() =>
      parseKLyricState(staleTimestamp, validationOptions),
    );

    const timestampWithoutTimezone = cloneFixture();
    timestampWithoutTimezone.emittedAt = "2026-07-11T12:00:00";
    expectValidationFailure(() =>
      parseKLyricState(timestampWithoutTimezone, validationOptions),
    );

    const unsafeSessionId = cloneFixture();
    unsafeSessionId.sessionId = "session has whitespace";
    expectValidationFailure(() =>
      parseKLyricState(unsafeSessionId, validationOptions),
    );
  });

  test("allows a new session to restart sequence numbers but rejects regression in one session", () => {
    const previous = parseKLyricState(validStateFixture, validationOptions);
    const duplicate = parseKLyricState(validStateFixture, validationOptions);
    expectValidationFailure(() => validateStateTransition(previous, duplicate));

    const next = parseKLyricState(
      { ...validStateFixture, sequence: 43 },
      validationOptions,
    );
    expect(() => validateStateTransition(previous, next)).not.toThrow();

    const nextSession = parseKLyricState(
      { ...validStateFixture, sessionId: "session-fixture-02", sequence: 0 },
      validationOptions,
    );
    expect(() => validateStateTransition(previous, nextSession)).not.toThrow();
  });
});

describe("WebSocket envelopes", () => {
  test("parses every documented server and client message fixture", () => {
    for (const message of validServerMessagesFixture) {
      expect(parseServerMessage(message, validationOptions)).toEqual(message);
    }

    for (const message of validClientMessagesFixture) {
      expect(parseClientMessage(message)).toEqual(message);
    }
  });

  test("rejects unknown envelopes and invalid state clear reasons", () => {
    expectValidationFailure(() => parseServerMessage({ type: "new-message" }));
    expectValidationFailure(() =>
      parseServerMessage({ type: "state-cleared", reason: "unknown" }),
    );
    expectValidationFailure(() =>
      parseClientMessage({ type: "hello", client: "other" }),
    );
  });

  test("exposes every state-cleared reason", () => {
    for (const reason of STATE_CLEAR_REASONS) {
      expect(parseServerMessage({ type: "state-cleared", reason })).toEqual({
        type: "state-cleared",
        reason,
      });
    }
  });
});
