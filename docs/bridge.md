# Bridge

`klyric-bridge` is a Bun service that accepts one authenticated local publisher
and broadcasts the latest normalized KLyric state to read-only local clients.
It stores state only in memory; a process restart clears it.

## Network configuration

The bridge defaults to `127.0.0.1:37654`. It accepts only the literal loopback
addresses `127.0.0.1` and `::1`; wildcard, LAN, and hostname bindings are
rejected before the server starts.

Configuration is resolved in this order: built-in defaults, the JSON file,
environment variables, then CLI options. The default config file is
`${XDG_CONFIG_HOME:-~/.config}/klyric/bridge.json`.

```json
{
  "host": "127.0.0.1",
  "port": 37654
}
```

`KLYRIC_BRIDGE_CONFIG`, `KLYRIC_BRIDGE_HOST`, and `KLYRIC_BRIDGE_PORT` provide
the corresponding environment overrides. Use `--config`, `--host`, and
`--port` for CLI overrides.

## Publisher token

On first start, the bridge creates a cryptographically random 256-bit token at
`${XDG_CONFIG_HOME:-~/.config}/klyric/publisher-token` with `0600`
permissions. Normal logs never include it or lyric text.

Print a token only when explicitly requested:

```bash
klyric-bridge token show
klyric-bridge token rotate
```

Rotating a token immediately invalidates the prior one. Publishers send the
current token in `Authorization: Bearer <token>`.

## HTTP and WebSocket API

- `POST /v1/state`: authenticated JSON state publication. It returns `202` for
  a broadcast update, `204` for a display-equivalent heartbeat, and uses the
  status codes defined in [the protocol documentation](protocol.md) for invalid
  payloads and sequence conflicts.
- `DELETE /v1/state`: authenticated clear; broadcasts `state-cleared` with the
  `manual` reason when state exists.
- `GET /v1/state`: returns the latest normalized state or `204`.
- `GET /health`: exposes only non-sensitive service health metadata.
- `GET /v1/events`: WebSocket endpoint. The server sends `hello`; clients must
  return the protocol `hello` envelope within five seconds. Accepted clients
  receive cached state immediately, updates thereafter, and respond to
  application-level pings.

The bridge accepts 10 publications per second with a burst capacity of 20,
limits itself to eight WebSocket clients, suppresses display-equivalent
heartbeats, and marks playing state stale after 15 seconds without a
publication. Paused state expires after 24 hours.
