# Integration testing

## Scope and environment

Phase 6 validation was run on 2026-07-11 with Cider 3.1.8-1, KDE Plasma 6 on
Wayland, Breeze Dark, Bun 1.3.14, and the repository at the Phase 6 working
tree. Early runtime widget checks used `plasmawindowed`; Plasma SDK was
installed during the final continuation, and the required horizontal
`plasmoidviewer` command then passed. Tests marked
`MANUAL — NOT RUN` remain required before Phase 6 can complete.

The automated end-to-end harness in `tests/integration-hardening.test.ts`
connects the real plugin state machine and publication queue to a real
loopback bridge, then validates received messages with the same JavaScript
protocol parser used by the plasmoid. It uses sanitized fixture text only.

## End-to-end scenario matrix

| # | Scenario | Result | Evidence and remaining work |
|---:|---|---|---|
| 1 | Start Plasma and bridge before Cider | PASS — automated | A widget client connects before the simulated extraction event and receives the later plugin publication. |
| 2 | Start Cider before bridge | PASS — automated | Publication retry retains the newest state during bridge downtime and resumes after the retry clock fires. |
| 3 | Restart bridge during playback | PASS — live + automated | Two automated clients receive the clear event and the restarted bridge has no cached state. After the live WebSocket retry fix, applet 53 reconnected to a stopped-and-restarted real bridge without a PlasmaShell restart and displayed a fresh publication. |
| 4 | Restart Plasma during playback | PASS — live + automated | A newly handshaken WebSocket client receives cached state in the harness. Live validation replaced PlasmaShell while the bridge retained a sanitized paused line; the process changed from PID 312884 to 315101, the recreated widget reconnected as one client, and the cached line appeared directly in the panel. |
| 5 | Reload plugin during playback | PASS — automated | Repeat setup disposes the earlier playback and lyric observers before starting replacements. |
| 6 | Play a synchronized song | PASS — live + automated | Cider exposed 79 ordered DOM lines and an advancing active index; the automated pipeline delivered line changes to the widget parser. |
| 7 | Play an unsynchronized song | PASS — fixture | Widget fallback coverage verifies the unsynchronized/unavailable presentation. A live catalog example was not required to validate the state contract. |
| 8 | Play an instrumental track | PASS — automated | State-machine and formatting tests verify `instrumental` state and configured text. |
| 9 | Play a song with no lyrics | PASS — automated | Empty lyric snapshots produce `unavailable` with no current line and use the configured fallback. |
| 10 | Pause for several minutes | PASS — live + automated | Live Cider pause/resume held playback time and resumed correctly; paused-state retention/expiry is automated. A sanitized paused state also remained visible in two real panel widgets for more than eight minutes while other visual checks ran. |
| 11 | Seek forward and backward repeatedly | PASS — live + automated | A live 15-second forward seek succeeded; rapid position jumps clear the old line and remain stale until a fresh snapshot. |
| 12 | Skip tracks rapidly | PASS — live + automated | Live replacement rebuilt 79 lines to 61 and reset the active index; rapid simulated replacements reject an old-track snapshot. |
| 13 | Replay the same track | PASS — automated | Returning to a prior track identity clears the intervening track's lyric state before new lyrics are accepted. |
| 14 | Play consecutive repeated lyric lines | PASS — automated | Equal text at indexes 0 and 1 produces distinct states. |
| 15 | Close the Cider lyric view | PASS — known limitation | Playback continued, but all 61 DOM lines disappeared and no public API, store, or timeline source appeared. |
| 16 | Minimize Cider | PASS — live | With Lyrics left open, playback continued and the active index advanced while minimized. |
| 17 | Suspend and resume the system | PASS — live runtime | The user performed one real suspend/resume cycle. Immediately after waking, the still-running bridge reported `publisherSeen: true`, `stateAvailable: true`, and one connected widget client; a second probe eight seconds later matched. Cider DevTools also remained reachable. |
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
| Breeze Dark, 150% scale | PASS — live runtime | The real eDP-1 Wayland output was changed from scale 1.0 to 1.5 with `kscreen-doctor`; the panel text remained legible and bounded. |
| Breeze Dark, 200% scale | PASS — live runtime | The same real output was changed to scale 2.0; the panel text remained legible and bounded, then the original scale 1.0 was restored. |
| RTL text | PASS — live runtime | An original sanitized Arabic fixture passed through the real bridge and rendered right-to-left, fully contained, in the horizontal panel. The earlier `QT_LAYOUT_DIRECTION=RTL` smoke also remains valid. |
| Long Unicode line | PASS — automated | 2,000-code-point fixture passes validation; compact text is bounded and elided/wrapped. |
| Horizontal panel | PASS — live runtime | Plasma 6.7.2, Breeze Dark, 100% scale, 1920x1200 Wayland output, 32 px horizontal top panel. The real applet rendered disconnected fallback and sanitized short lyric text at 100/360 px bounds; a long line elided at both 360 px and 200 px; disabling the music icon retained the text. Settings were restored to 100/360 px with the icon enabled. |
| Vertical panel | PASS — live runtime | A temporary 64 px left panel hosted a second real widget. Default icon-only mode passed. Opt-in text initially remained horizontal, exposing missing vertical panel-axis hints; the working-tree fix allocates height and renders a bounded -90-degree label. After a managed PlasmaShell restart, `Vertical` rendered rotated and switching the setting off restored icon-only mode. |
| Multiple widget instances | PASS — live runtime | Horizontal widget 53 and vertical widget 56 connected concurrently; `/health` reported two clients and both received the same cached paused state before and after a managed PlasmaShell restart. |
| Breeze Light | PASS — live runtime | Both orientations remained legible with `BreezeLight`; the user subsequently restored the original Breeze Dark scheme. |
| Font setting extremes | PASS — live runtime | `fontSizeAdjustment=-6` rendered legibly in both real orientations. After `Text.VerticalFit` was installed, `+12` remained fully bounded in the real 32 px horizontal panel. The setting was restored to zero. |
| Horizontal `plasmoidviewer` | PASS — runtime smoke | The required command loaded for ten seconds without a QML error after Plasma SDK was installed. |
| Real system suspend/resume | PASS — live runtime | One user-performed suspend/resume cycle preserved bridge health and one connected widget client across two post-resume probes. |
| Full Plasma session restart | MANUAL — NOT RUN | Requires user logout/login and terminates the active GUI development session. |

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
- A live bridge-down recovery exposed that QtWebSockets can retain
  `active=true` after a failed connection, making later retry assignments a
  no-op. The closed-state handler now clears `active` before scheduling retry;
  the original real widget reconnected to a restarted bridge without a
  PlasmaShell restart and displayed a newly published RTL fixture.

## Remaining manual completion checklist

- Restart the Plasma session and confirm the widget reconnects.
- The desktop is restored: Breeze Dark, 100% scale, applet 53 font zero, no
  temporary panel or widget, and no temporary bridge.
