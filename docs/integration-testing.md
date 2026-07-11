# Integration testing

## Scope and environment

Phase 6 validation was run on 2026-07-11 with Cider 3.1.8-1, KDE Plasma 6 on
Wayland, Breeze Dark, Bun 1.3.14, and the repository at the Phase 6 working
tree. `plasmoidviewer` is not installed, so runtime widget checks use
`plasmawindowed`. Tests marked `MANUAL — NOT RUN` remain required before Phase
6 can complete.

The automated end-to-end harness in `tests/integration-hardening.test.ts`
connects the real plugin state machine and publication queue to a real
loopback bridge, then validates received messages with the same JavaScript
protocol parser used by the plasmoid. It uses sanitized fixture text only.

## End-to-end scenario matrix

| # | Scenario | Result | Evidence and remaining work |
|---:|---|---|---|
| 1 | Start Plasma and bridge before Cider | PASS — automated | A widget client connects before the simulated extraction event and receives the later plugin publication. |
| 2 | Start Cider before bridge | PASS — automated | Publication retry retains the newest state during bridge downtime and resumes after the retry clock fires. |
| 3 | Restart bridge during playback | PASS — automated | Two clients receive the clear event; the restarted bridge has no cached state; publication retry and QML reconnect paths are covered separately. |
| 4 | Restart Plasma during playback | PASS — automated | A newly handshaken WebSocket client receives the bridge's cached state. |
| 5 | Reload plugin during playback | PASS — automated | Repeat setup disposes the earlier playback and lyric observers before starting replacements. |
| 6 | Play a synchronized song | PASS — live + automated | Cider exposed 79 ordered DOM lines and an advancing active index; the automated pipeline delivered line changes to the widget parser. |
| 7 | Play an unsynchronized song | PASS — fixture | Widget fallback coverage verifies the unsynchronized/unavailable presentation. A live catalog example was not required to validate the state contract. |
| 8 | Play an instrumental track | PASS — automated | State-machine and formatting tests verify `instrumental` state and configured text. |
| 9 | Play a song with no lyrics | PASS — automated | Empty lyric snapshots produce `unavailable` with no current line and use the configured fallback. |
| 10 | Pause for several minutes | PARTIAL | Live pause/resume held playback time and resumed correctly; paused-state retention/expiry is automated. A several-minute wall-clock GUI observation remains manual. |
| 11 | Seek forward and backward repeatedly | PASS — live + automated | A live 15-second forward seek succeeded; rapid position jumps clear the old line and remain stale until a fresh snapshot. |
| 12 | Skip tracks rapidly | PASS — live + automated | Live replacement rebuilt 79 lines to 61 and reset the active index; rapid simulated replacements reject an old-track snapshot. |
| 13 | Replay the same track | PASS — automated | Returning to a prior track identity clears the intervening track's lyric state before new lyrics are accepted. |
| 14 | Play consecutive repeated lyric lines | PASS — automated | Equal text at indexes 0 and 1 produces distinct states. |
| 15 | Close the Cider lyric view | PASS — known limitation | Playback continued, but all 61 DOM lines disappeared and no public API, store, or timeline source appeared. |
| 16 | Minimize Cider | PASS — live | With Lyrics left open, playback continued and the active index advanced while minimized. |
| 17 | Suspend and resume the system | MANUAL — NOT RUN | QML now reconnects immediately when the application becomes active. A real suspend was not triggered because it would disrupt the active user session. |
| 18 | Rotate the publisher token | PASS — automated | A second token-store instance rotates the file; the running bridge immediately rejects the old token and accepts the new token. |
| 19 | Change bridge port | PASS — component | Bridge/plugin settings validate the new port, and QML reconnects when its configured port changes. |
| 20 | Upgrade the widget over an installation | PASS — runtime | `kpackagetool6 --type Plasma/Applet --upgrade apps/plasmoid/package` succeeded and the upgraded widget survived runtime smoke checks. |

## Latency

The instrumented end-to-end test records time immediately before the simulated
extraction callback and stops after the real WebSocket message passes the
plasmoid protocol parser. Five local samples were `1.774`, `0.297`, `0.177`,
`0.154`, and `0.145` ms; the observed maximum was **1.774 ms**, below the 250
ms target. Run the measurement with:

```bash
KLYRIC_REPORT_PERF=1 bun test tests/integration-hardening.test.ts \
  -t 'propagates extraction events'
```

This is sanitized local pipeline latency. Live Cider DOM-to-visible-pixel
instrumentation remains disabled; the measurement does not claim compositor
frame timing.

## Compatibility matrix

| Cider version | Public API | Store adapter | Timeline adapter | DOM adapter | Lyrics view closed | Result |
|---|---:|---:|---:|---:|---:|---|
| 3.1.8-1 stable | No | No | No | Yes | No | Supported with the Lyrics view kept open |
| Current preview | Not tested | Not tested | Not tested | Not tested | Not tested | Optional; no preview build installed |

Capability detection reports one safe descriptor ID:
`plugin-kit-public-api`, `candidate-internal-store`, `plugin-kit-timeline`,
`cider-3.1.8-dom`, or `unsupported`. Public, store, and timeline descriptors
are selected only after their required callable/collection shape validates.
Failed adapters are excluded for the current track to prevent fallback
oscillation; failures reset on track replacement so a track-specific source
can be reconsidered.

## Plasma visual and session matrix

| Scenario | Result | Notes |
|---|---|---|
| Breeze Dark, 100% scale | PASS — runtime smoke | Upgraded widget remained loaded for 10 seconds. |
| Breeze Dark, 150% scale | PASS — runtime smoke | `QT_SCALE_FACTOR=1.5`; widget remained loaded for 5 seconds. |
| Breeze Dark, 200% scale and RTL layout | PASS — runtime smoke | `QT_SCALE_FACTOR=2 QT_LAYOUT_DIRECTION=RTL`; widget remained loaded for 5 seconds. |
| Long Unicode line | PASS — automated | 2,000-code-point fixture passes validation; compact text is bounded and elided/wrapped. |
| Horizontal panel | PARTIAL | `plasmawindowed` smoke passed; a real panel placement remains manual. |
| Vertical panel | MANUAL — NOT RUN | Static logic defaults to icon-only; `plasmoidviewer` is unavailable for a true vertical form factor. |
| Breeze Light | MANUAL — NOT RUN | Changing the active user's global theme was intentionally avoided. |
| Font setting extremes | MANUAL — NOT RUN | Kirigami-unit and bounded font logic passes `qmllint`; visual review remains. |
| Full Plasma session restart | MANUAL — NOT RUN | Would disrupt the active user session. |
| Real system suspend/resume | MANUAL — NOT RUN | Would disrupt the active user session. |

## Security, privacy, and resource audit

- Bridge host validation accepts only `127.0.0.1` or `::1`.
- Every state write and clear requires a 256-bit bearer token stored with
  `0600` permissions.
- Token rotation is reloaded by the running bridge before authentication, so
  a separate CLI process invalidates the old token immediately.
- Protocol parsing enforces schema, clock, sequence, Unicode, and 64 KiB
  payload limits; rate limiting and bounded WebSocket clients remain active.
- The hardening test publishes a unique sentinel and verifies it and the token
  do not appear in logger fields or persisted files. Only `publisher-token`
  exists in the temporary bridge configuration directory.
- The bridge stores one state in memory only. Shutdown broadcasts a clear
  before closing clients and clears the in-memory state.
- Publication retries retain one pending state only. A newer in-flight update
  can no longer be overwritten by an older failed request.
- Lyric-source transitions are serialized, stopped deterministically, and do
  not reconsider a failed adapter until the track changes.
- Plasmoid reconnect, stable-connection, and delayed-stop timers are stopped on
  destruction; application resume triggers an immediate reconnect.

## Remaining manual completion checklist

- Observe a paused live track for several minutes, then resume.
- Suspend and resume the machine with Cider, bridge, and two widget instances
  active.
- Restart the Plasma session and confirm both widgets reconnect.
- Place the widget in real horizontal and vertical panels.
- Review Breeze Light, font-size extremes, and the real 100%, 150%, and 200%
  compositor scaling settings.
