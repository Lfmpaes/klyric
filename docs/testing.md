# Runtime testing

## Supported environment

KLyric is currently validated with Cider 3.1.8-1, KDE Plasma 6.7.2 on Wayland,
and Bun 1.3.14. Other Plasma 6 and Cider versions may work but require explicit
compatibility validation.

## Compatibility matrix

| Environment | Status | Limitation |
|---|---|---|
| Cider 3.1.8-1 stable | Supported | Keep the Lyrics view open for DOM extraction. |
| Current Cider preview | Not tested | Revalidate extraction before claiming support. |
| Plasma 6.7.2 Wayland | Supported | Horizontal and vertical panels have runtime coverage. |
| Other Plasma 6 versions or X11 | Not tested | Run focused widget and session checks. |

Cider minimization is supported while its Lyrics view remains open. Closing the
view removes the only proven synchronized-line source in Cider 3.1.8.

## Automated validation

Use the smallest command that covers the change:

```bash
bun run lint
bun run typecheck
bun run test
bun run build
```

Focused integration and extraction checks:

```bash
bun test tests/integration-hardening.test.ts
bun run test:extraction
bun test apps/plasmoid/tests/protocol.test.ts
```

For QML changes, run `qmllint` on the affected files. The integration hardening
test exercises plugin publication, the real loopback bridge, WebSocket delivery,
and the plasmoid protocol parser with sanitized fixtures.

## Required manual scenarios

Release-critical runtime validation must cover:

1. Start Plasma and the bridge before Cider, then reverse the order.
2. Restart the bridge, Plasma, and the Cider plugin during playback.
3. Play synchronized lyrics and observe at least one current-line advance.
4. Pause, resume, seek, switch tracks, and replay a track.
5. Close and reopen Cider's Lyrics view and verify the displayed availability state.
6. Verify no-song, no-lyrics, instrumental, Cider-disconnected, and bridge-disconnected states.
7. Verify popup layouts with previous/current/next, current/next, previous/current,
   and current-only rows.
8. Verify left, center, and right alignment plus the track/artist tooltip.
9. Verify long-line elision in a real horizontal panel and intentional vertical-panel behavior.
10. Verify upgrade, `klyric version`, `klyric help`, uninstall, and purge in a disposable environment.

## When real Plasma or Cider testing is required

- Use real Cider for extraction adapters, playback-state detection, or Lyrics-view behavior.
- Use a real Plasma panel for compact sizing, elision, popup activation, configuration,
  orientation, scaling, theme, RTL, or session-recovery changes.
- Use disposable XDG and HOME paths for installer, upgrade, CLI, or removal changes.
- Suspend/resume and full session restart checks are required only when lifecycle code
  changes or before a release that claims those recovery guarantees.

## Release-critical checks

Before release preparation, run the full workspace validation, package the release,
verify outer and inner checksums, run QML lint, complete the applicable manual
scenarios, and run `git diff --check`. Never publish solely from automated test results.

## Privacy and safety

Use sanitized lyric fixtures in automated tests. Do not record tokens, account data,
or complete lyric text in logs, screenshots, reports, or repository files.
