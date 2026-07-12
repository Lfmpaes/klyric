# KLyric

KLyric displays Cider's active synchronized lyric line in a KDE Plasma 6 widget.

## Architecture

The Cider plugin publishes normalized local state to a loopback-only bridge. The
bridge keeps the latest state only in memory and broadcasts it to one or more
Plasma widgets over WebSocket. The shared protocol package defines the boundary
between those components.

Bridge configuration, token management, and its local HTTP/WebSocket API are
documented in [docs/bridge.md](docs/bridge.md).

Installation, upgrades, removal, and troubleshooting are documented in
[docs/installation.md](docs/installation.md).

The v0.1.0 highlights and release limitations are in
[RELEASE_NOTES.md](RELEASE_NOTES.md); the complete release audit is in
[docs/release-readiness.md](docs/release-readiness.md).

The Phase 6 scenario matrix, performance results, compatibility table,
security audit, and remaining manual checks are in
[docs/integration-testing.md](docs/integration-testing.md).

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

Live Cider compatibility currently requires its Lyrics view to remain open.
See the integration matrix before reporting a new compatibility result.
