# KLyric

KLyric displays Cider's active synchronized lyric line in a KDE Plasma 6 widget.

## Architecture

The Cider plugin publishes normalized local state to a loopback-only bridge. The
bridge keeps the latest state only in memory and broadcasts it to one or more
Plasma widgets over WebSocket. The shared protocol package defines the boundary
between those components.

Bridge configuration, token management, and its local HTTP/WebSocket API are
documented in [docs/bridge.md](docs/bridge.md).

## Prerequisites

- Bun 1.3.14 or newer
- KDE Plasma 6 development tools (`qmllint`, `plasmoidviewer`)
- Cider 2.5 or newer for plugin validation

## Development

```bash
bun install
bun run typecheck
bun run lint
bun run test
bun run build
```

Phase 0 supplies foundations only. Lyric extraction is deliberately deferred to
Phase 1.
