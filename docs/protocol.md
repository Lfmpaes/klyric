# KLyric protocol

`@klyric/protocol` is the versioned, runtime-validated boundary between the
Cider plugin, loopback bridge, and Plasma widget. Its runtime code uses only
standard JavaScript APIs available in browsers and Bun. The package exposes its
normal API at `@klyric/protocol` and sanitized fixtures at
`@klyric/protocol/fixtures`.

## Versioning and compatibility

The current protocol major is `1` (`PROTOCOL_VERSION`). The bridge rejects any
other major version and clients must show an incompatible-protocol state.

- Additive optional fields may be introduced within major version 1. Receivers
  ignore fields they do not know.
- A changed field meaning, removed field, or changed required field requires a
  new major protocol version.
- The plugin increments `sequence` for every publication within one `sessionId`.
  A bridge rejects duplicate or regressing sequences within that session; a new
  session may restart at sequence zero.

## State publication

Every `KLyricState` includes `protocolVersion`, `sequence`, `sessionId`, and an
ISO-8601 `emittedAt` timestamp, plus playback metadata, lyric availability,
source kind, and optional adjacent lines. `track` is `null` or a flat object with
optional identity and display fields. Lyric lines are `null` or flat objects
with text, optional timing and index data, and an optional instrumental marker.

Optional `trackHasLyrics` and `lyricsPanelOpen` booleans expose Cider availability
without breaking legacy protocol-v1 payloads. Receivers must continue to handle
the fields being absent.

The enums are exported as both TypeScript types and readonly value arrays:

- Playback: `playing`, `paused`, `stopped`, `loading`, `unknown`
- Lyrics: `word-synced`, `line-synced`, `unsynced`, `instrumental`, `unavailable`
- Source: `public-api`, `internal-store`, `dom`, `timeline`, `none`

`unavailable` state must set `hasLyrics` to `false` and must not include lyric
lines. This preserves the distinction between an unavailable source and a
temporarily stale but otherwise known lyric state.

## WebSocket envelopes

The bridge sends `hello`, `state`, `state-cleared`, `error`, and `ping`.
Plasmoids send `hello` and `pong`. Both hello messages include protocol version
and component version. `state-cleared` reasons are `expired`,
`publisher-disconnected`, and `manual`.

## Runtime validation and normalization

`parseKLyricState`, `parseServerMessage`, and `parseClientMessage` reject invalid
cross-process data with `ProtocolValidationError`. The first two accept optional
`StateValidationOptions` so the bridge can provide its clock when checking a
state timestamp.

- Serialized input is limited to 64 KiB.
- Lyric text is trimmed while internal whitespace is preserved; a blank line
  becomes `null`. Lines are limited to 2,000 Unicode code points.
- Track title, artist, album, and identifier fields are limited to 500 code
  points; artwork URLs are limited to 2,048.
- Millisecond and sequence values must be non-negative safe integers. Lyric end
  time cannot precede start time.
- Session IDs are trimmed, bounded to 128 code points, and use only
  `[A-Za-z0-9._:-]` after their first alphanumeric character.
- `emittedAt` must parse as a timestamp within five minutes of the bridge clock
  by default. Tests and bridge code can supply a different clock or skew.
- `validateStateTransition(previous, next)` applies the per-session monotonic
  sequence rule.

The validator reads only documented flat fields and never carries arbitrary
nested Cider data across the process boundary.
