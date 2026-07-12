# KLyric phase status

As of 2026-07-11, the workspace has a usable local git repository and the `main` branch tracks the reachable `origin/main` remote. The phase journals below retain the earlier historical note that the workspace initially arrived without usable git metadata.

| Phase | Status | Recommended model | Reasoning | Completed |
|---|---|---|---|---|
| 0 — Repository bootstrap | complete | GPT-5.6 Terra | Medium | 2026-07-10 |
| 1 — Lyric extraction spike | complete | GPT-5.6 Sol | High | 2026-07-10 |
| 2 — Protocol package | complete | GPT-5.6 Terra | High | 2026-07-11 |
| 3 — Bridge MVP | complete | GPT-5.6 Terra | High | 2026-07-11 |
| 4 — Cider plugin MVP | complete | GPT-5.6 Terra | High | 2026-07-11 |
| 5 — Plasma widget MVP | complete | GPT-5.6 Terra | High | 2026-07-11 |
| 6 — Integration hardening | complete | GPT-5.6 Terra | Medium | 2026-07-12 |
| 7 — Packaging and installation | pending | GPT-5.6 Terra | Medium | — |
| 8 — Release readiness | pending | GPT-5.6 Sol | High | — |

## Phase 0 journal

Started 2026-07-10. The supplied workspace has no Git metadata despite an empty
`.git` directory, so no baseline commit exists. The phase created the Bun
workspace, strict TypeScript and Biome configuration, skeleton component
packages, documentation, and CI/release workflow skeletons. The PluginKit
playground template was imported conceptually as the minimal PluginKit context
and renamed to `dev.luizpaes.klyric`.

The public `ciderapp/Cider-PluginKit` repository was used as the supported
PluginKit template reference. The standalone official template repository named
in the plan could not be resolved publicly. `bun install` succeeded and wrote
`bun.lock`. The following checks passed: `bun run format`, `bun run lint`,
`bun run typecheck`, `bun run test`, `bun run build`, and `qmllint
apps/plasmoid/package/contents/ui/main.qml`. The empty bridge command also
started and reported its loopback placeholder.

Follow-up verification on 2026-07-10 completed task 0.8. The empty bridge
started with `timeout 5s bun run --cwd apps/bridge dev` and printed the
loopback bootstrap placeholder. `plasmoidviewer` is not installed in this
environment, but the Plasma 6 package validated with
`kpackagetool6 --type Plasma/Applet --show apps/plasmoid/package`, installed
with `kpackagetool6 --type Plasma/Applet --install apps/plasmoid/package`, and
remained loaded until timeout with `timeout 10s plasmawindowed
dev.luizpaes.klyric`.

The Cider plugin skeleton now produces an installable `dist/plugin.js` from
`apps/cider-plugin/src/main.ts`. That artifact was copied to Cider's local
plugin directory at
`~/.config/sh.cider.genten/plugins/dev.luizpaes.klyric/plugin.js`, and a Cider
renderer DevTools evaluation successfully imported
`/plugins/dev.luizpaes.klyric/plugin.js`, ran `setup()`, and returned
`{ identifier: "dev.luizpaes.klyric", name: "KLyric", version: "0.1.0" }`.
Cider still logs transient `ERR_CONNECTION_REFUSED` messages while its local
server starts, but the renderer reached `http://127.0.0.1:10767/index.html#/`
and loaded the renamed plugin module successfully.

After the plugin build change, the following checks passed again:
`bun run format`, `bun run lint`, `bun run typecheck`, `bun run test`,
`bun run build`, and `qmllint apps/plasmoid/package/contents/ui/main.qml`.
`plasmoidviewer` remains unavailable, so Plasma runtime validation used
`plasmawindowed` instead. The workspace still has no usable Git metadata, so
the last verified commit remains uncommitted.

At the Phase 0 handoff, Phase 1 was pending at task 1.1: add safe, redacted
Cider capability-inspection tooling. The Phase 1 journal below supersedes that
historical handoff.

## Phase 1 journal

Started 2026-07-10 at task 1.1. The persistent checkpoint, Phase 0 journal,
implementation plan, and workspace state agree. The workspace still has no
usable Git metadata, so branch and recent-commit inspection remain unavailable;
existing files were preserved and Phase 1 was marked `in_progress` before code
changes.

Task 1.1 is complete. `CapabilityInspectionTool` performs a read-only probe and
returns only capability booleans and allow-listed detected path names. The
diagnostic redactor removes token, cookie, authorization, account, lyric, and
text fields from arbitrary diagnostic objects. The plugin logs the safe report
at setup without serializing full stores or lyric content.

The source abstraction, factory, public-API placeholder, candidate Pinia store
descriptor, timed-line adapter, and DOM fallback are implemented behind
`apps/cider-plugin/src/cider/`. Eight extraction-specific tests pass, covering
redaction, store subscription cleanup, timeline binary search and scheduling,
DOM duplicate-line identity, factory priority, and the public placeholder.
Live inspection then confirmed the actual Cider 3.1.8 host shape and lifecycle
behavior. With the Lyrics view open, `.lyric-view-content` contains ordered
`.lyric-line` elements and the current line has `.active`. Playback position is
available through MusicKit, but line timestamps and a complete off-DOM timed
array are not. A `MutationObserver` is therefore the selected stable line-change
mechanism for this descriptor.

Redacted runtime actions verified line advancement, pause/resume with held
position, a 15-second seek with active-index advancement, a track replacement
that rebuilt the line list and reset the index, minimized operation, and Lyrics
view open/closed behavior. Minimized extraction works when the view remains
open. Closing it removes all lyric lines while playback continues, and no
public API, internal store, or timed-line source becomes available. This is a
documented compatibility limitation, not an unrecorded assumption.

The final implementation includes the common `LyricsSource` contract and
factory, public API placeholder, fail-closed candidate Pinia descriptor,
event-driven timeline adapter with boundary scheduling and a drift guard, and
the observed DOM adapter with cleanup, debouncing, duplicate-line identity, and
container rediscovery. Sanitized candidate and observed Cider 3.1.8 fixtures
contain no real lyric or track data. Detailed evidence and adapter priority are
in `docs/cider-research.md`.

Final validation on 2026-07-10:

- `bun run format`: PASS
- `bun run lint`: PASS
- `bun run typecheck`: PASS
- `bun run test`: PASS — 10 tests, 0 failures
- `bun run build`: PASS
- `bun run --cwd apps/cider-plugin inspect:cider`: PASS against the installed
  Cider 3.1.8 research build; finalized probe detected the open lyric DOM and
  renderer audio capability without returning lyric text or metadata

Phase 1 is complete. The workspace still has no usable Git metadata, so the
last verified commit remains uncommitted. Phase 2 is next and must begin at task
2.1; no Phase 2 implementation was started.

## Phase 2 journal

Started 2026-07-11 at task 2.1. The persistent checkpoint, Phase 1 journal,
implementation plan, local `main` branch, and clean worktree agree. The
protocol package contains only its intentional Phase 0 placeholder, so no
partial Phase 2 implementation requires reconciliation. This phase will remain
strictly limited to the shared protocol package, its fixtures and tests, and
protocol documentation.

Phase 2 completed 2026-07-11. The package now exports protocol version and
limit constants; playback, lyric, source, clear-reason, state, and WebSocket
message types; and browser/Bun-safe runtime validation with no platform or
Node-only imports. State parsing normalizes text, enforces Unicode and payload
limits, validates protocol versions, timestamps, sequence transitions, session
identifiers, and flat field shapes, and rejects malformed envelopes. Sanitized
valid and invalid fixtures are published from the package, while
`docs/protocol.md` records the versioning contract and validation behavior.

The protocol unit suite covers all enum values, normalization, Unicode bounds,
malformed and oversized data, timestamp and session validation, sequence and
session transitions, and every WebSocket envelope. Final validation on
2026-07-11 passed:

- `bun run format`: PASS
- `bun run lint`: PASS
- `bun run typecheck`: PASS
- `bun run test`: PASS — 21 tests, 0 failures
- `bun run build`: PASS

Phase 2 is complete. The Phase 2 implementation commit is `971f53f`
(`feat(protocol): define validated state schema`).

## Phase 3 journal

Started 2026-07-11 at task 3.1. The persistent checkpoint, Phase 2 journal,
implementation plan, clean `main` worktree, and local protocol implementation
agree. The GitHub remote is now reachable and no longer blocks repository
operations. This phase is limited to the Bun bridge, its tests, and related
bridge documentation; it will not implement the Cider publisher or Plasma UI.

Phase 3 completed 2026-07-11. The bridge resolves default, JSON-file,
environment, and CLI configuration while rejecting every non-loopback host.
It creates a 256-bit publisher token in the XDG config directory with `0600`
permissions, supports explicit display and rotation commands, and never emits
the token or lyric state through structured logs.

The Bun server implements authenticated publication and clearing, normalized
state reads, non-sensitive health reporting, sequence conflict handling,
payload limits, rate limiting, in-memory duplicate suppression, playing-state
staleness, paused-state expiry, bounded WebSocket clients, protocol handshake,
cached-state delivery, broadcast updates, application pings/pongs, and graceful
shutdown. `docs/bridge.md` records the operating contract and CLI usage.

Bridge unit tests cover configuration precedence and host rejection, private
token lifecycle, sequence handling, duplicate suppression, stopped-state
normalization, and expiry. Integration tests cover unauthorized and malformed
publications, cached state and later WebSocket broadcasts, duplicate response
suppression, ping/pong behavior, clear lifecycle, and a spawned CLI bridge
process. The process test is the mock publisher/client full lifecycle evidence.

Final validation on 2026-07-11:

- `bun run format`: PASS
- `bun run lint`: PASS
- `bun run typecheck`: PASS
- `bun run test`: PASS — 30 tests, 0 failures
- `bun run build`: PASS
- `git diff --check`: PASS

The loopback integration and process tests require temporary local port binds;
they passed outside the restricted execution sandbox. No Plasma or Cider GUI
validation applies to this bridge-only phase. Phase 3 implementation is
`9855974` (`feat(bridge): add authenticated loopback service`).

Phase 3 is complete. Phase 4 is next at task 4.1: implement deterministic
plugin setup, teardown, and hot-reload cleanup. Keep GPT-5.6 Terra with High
reasoning.

## Phase 4 journal

Started 2026-07-11 at task 4.1. The persistent checkpoint, Phase 3 journal,
implementation plan, clean `main` worktree, and existing extraction adapters
agree. This implementation session is limited to tasks 4.1 through 4.4:
deterministic lifecycle cleanup, normalized playback observation, selected
lyrics-source integration, and the plugin state machine. Bridge publication,
settings, diagnostics expansion, and later Phase 4 behavior remain out of
scope.

Tasks 4.1 through 4.4 completed 2026-07-11. `KLyricPlugin` now owns every
observer and source through a reverse-order, idempotent cleanup registry.
Plugin setup replaces a prior global instance before starting a new one, so a
hot reload cannot retain duplicate playback or lyric observers. Teardown aborts
subscriptions, stops the active lyric source, and disconnects playback
observation without creating or retaining plugin DOM.

`PlaybackSource` confines Cider-specific reads to `src/cider/`: it normalizes
the guarded MusicKit now-playing item and playback position, observes audio
events, and uses a single document observer solely to attach to a replaced
audio element. The default lyrics factory follows the Phase 1 priority:
capability-gated PluginKit public API, validated internal store, complete
PluginKit timeline, then the observed DOM adapter. A failed adapter is stopped
and the next compatible source is tried; no compatible source remains an
explicit unavailable state.

`PluginStateMachine` maps those observations to versioned protocol states and
the required phases, including connecting, idle, loading, playing with or
without lyrics, paused, stopped, source error, bridge error, and disabled.
It produces ordered session-local state snapshots, selects adjacent lyric
context, and invalidates lyric data when a new track identity is observed.
Publication and bridge connection behavior are deliberately deferred to the
later Phase 4 tasks.

Added plugin unit coverage for reverse-order idempotent cleanup, repeat setup,
adapter fallback after failure, playback metadata normalization, protocol state
normalization, and track-change lyric invalidation. Final validation on
2026-07-11 passed:

- `bun run format`: PASS
- `bun run lint`: PASS
- `bun run typecheck`: PASS
- `bun run test`: PASS — 36 tests, 0 failures
- `bun run build`: PASS
- `git diff --check`: PASS

The restricted execution sandbox blocks bridge integration-test loopback port
binds with `EADDRINUSE`; the required full test suite was rerun outside that
sandbox and passed. Manual Cider validation is still pending. The existing
Cider 3.1.8 limitation remains: DOM lyrics require the Lyrics view to stay
open; minimized Cider works only while that view remains open.

Phase 4 remains in progress. Task 4.5 is next: implement track-change, seek,
pause, resume, stop, and stale-line handling using the current observers.
The implementation commit for tasks 4.1–4.4 is `e11a8ea`
(`feat(cider-plugin): add lifecycle and state machine`).

Phase 4 resumed 2026-07-11 at task 4.5 after the clean `main` worktree,
persistent checkpoint, journal, implementation plan, and recent commits were
reconciled. The remaining work stays limited to the Cider plugin MVP.

Phase 4 completed 2026-07-11. Playback transitions now invalidate incompatible
lyric state immediately: track changes enter `loading-track`, seeks clear an
old active line and mark state stale until a fresh snapshot arrives, pauses
retain the displayed line, and stopped playback clears it. An untagged DOM
snapshot received immediately after a track replacement is ignored once, which
prevents the previous track's rendered line from being published while the new
lyrics view rebuilds.

The plugin now publishes only to a validated loopback bridge through an
authenticated `BridgeClient`; it uses `credentials: omit`, never logs the
publisher token, and recognizes authentication, network, server, and response
validation failures. `PublishQueue` serializes writes, coalesces bursts to the
latest pending state, deduplicates display-equivalent updates, sends an ordered
default-five-second playing heartbeat, retries transient failures with bounded
exponential backoff, and stops retrying authentication failures. Shutdown
cancels all pending work and attempts a best-effort authenticated clear.

`PluginSettingsStore` persistently validates the enabled state, loopback host,
port, publisher token, lyric-source override, heartbeat interval, and
diagnostic logging preference. Its exported connection test calls only the
bridge health endpoint. `Diagnostics` exposes only capability names and safe
operational metadata; it excludes token values, lyric text, account data, and
host-store contents.

The plugin test suite now uses the sanitized Phase 1 fixtures and covers source
fallback, track replacement, seek staleness, pause/resume and stop handling,
cleanup across reloads, bridge downtime, authenticated request construction,
queue ordering/deduplication/retry behavior, settings validation, and redacted
diagnostics. All Phase 4 tasks are complete. Final validation on 2026-07-11:

- `bun run format`: PASS
- `bun run lint`: PASS
- `bun run typecheck`: PASS
- `bun run test`: PASS — 46 tests, 0 failures
- `bun run build`: PASS
- `git diff --check`: PASS

Bridge integration tests cannot bind loopback ports inside the restricted
sandbox, so the full suite was rerun with normal local loopback access and
passed. The built plugin was copied to Cider's local plugin directory, but
`bun run --cwd apps/cider-plugin inspect:cider` is `NOT RUN`: Cider was not
running and `127.0.0.1:9222` refused the remote-debugging connection. Manual
verification still required: start Cider with remote
debugging, configure the bridge token through the exported plugin settings
surface, then verify track change, seek, pause/resume, stop, reload, and bridge
downtime against a live lyrics view. The existing Cider 3.1.8 limitation
remains: its DOM lyrics require the Lyrics view to remain open.

Phase 4 is complete. Phase 5 is next at task 5.1; it has not been started.
The Phase 4 implementation commit is `1d79324`
(`feat(cider-plugin): publish plugin state to bridge`).

## Phase 5 journal

Started 2026-07-11 at task 5.1. The persistent checkpoint, Phase 4 journal,
implementation plan, recent commits, and clean `main` worktree agree. This
session is limited to the Plasma 6 widget MVP: package structure, bridge
WebSocket client, safe envelope handling, representations, configuration,
accessibility, transitions, and widget-specific validation. Packaging and
broad cross-component hardening remain out of scope.

Phase 5 completed 2026-07-11. The plasmoid now has valid Plasma 6 metadata,
the `Plasma/Applet` package structure, KConfig-backed connection, appearance,
content, and diagnostic settings, and a Kirigami configuration page that warns
against non-loopback bridge hosts. The `view-media-lyrics` icon was verified in
the installed Breeze icon theme.

The QML root owns a `QtWebSockets.WebSocket` client for `/v1/events`. It sends
the v1 plasmoid hello after opening, requires the server hello before state,
returns application-level pings with pongs, ignores unknown additive message
types, identifies incompatible protocol versions, and reconnects with jittered
backoff from 500 ms to a 30-second maximum. The JavaScript protocol helper
size-checks and validates all state and server-envelope fields before QML state
is updated; malformed data cannot directly bind into display properties.

The compact representation displays an elided current line in horizontal
panels with tooltip details, a theme-aware optional status badge, configurable
width, line count, alignment, icon, and font weight. Vertical panels default to
an accessible icon-first view and expose text only when explicitly enabled.
The popup shows track metadata, previous/current/next context, bridge status,
and optional diagnostic source and update-age information. Fallback behavior
covers paused track metadata, stopped state, instrumental text, unavailable
lyrics, waiting for Cider, and disconnected bridge; a configurable stop delay
retains the preceding state briefly. All visible source strings use `i18n()`;
the layout uses Kirigami units and theme colors, preserves Unicode, and sets
accessible names/descriptions. Text transition behavior is optional and never
loops while the text is unchanged.

Widget fixture tests execute the QML JavaScript helpers against the shared
protocol fixtures. They accept every valid bridge envelope, reject malformed
and incompatible messages, preserve Unicode within protocol bounds, and cover
the display fallback priority. Final validation on 2026-07-11 passed:

- `bun run format`: PASS
- `bun run lint`: PASS
- `bun run typecheck`: PASS
- `bun run test`: PASS — 50 tests, 0 failures
- `bun run build`: PASS
- `qmllint apps/plasmoid/package/contents/ui/**/*.qml apps/plasmoid/package/contents/config/*.qml apps/plasmoid/package/contents/ui/js/*.js`: PASS
- `kpackagetool6 --type Plasma/Applet --show apps/plasmoid/package`: PASS
- `plasmawindowed dev.luizpaes.klyric`: PASS — widget remained loaded through a 10-second timeout after package upgrade
- `plasmoidviewer -a apps/plasmoid/package -l topedge -f horizontal`: NOT RUN — `plasmoidviewer` is not installed in this environment
- `git diff --check`: PASS

The bridge integration tests need temporary local loopback ports and therefore
fail in the restricted sandbox with `EADDRINUSE`; the full suite was rerun with
normal local loopback access and passed. The Phase 5 implementation commits
are `57b16ea` (`feat(plasmoid): add Plasma widget MVP`) and `2514c02`
(`fix(plasmoid): animate lyric text changes`). Manual live validation against
Cider remains part of Phase 6, alongside end-to-end recovery and
visual scenario coverage. Phase 5 is complete. Phase 6 is next at task 6.1;
use GPT-5.6 Sol with High reasoning and do not start automatically.

## Phase 6 journal

Started 2026-07-11 at task 6.1. The source-of-truth files, implementation,
tests, clean `main` worktree, and recent history agree that Phase 6 is the first
incomplete phase. The persistent checkpoint named `2514c02` as the last
verified implementation commit, while Git already contained the clean Phase 5
documentation commit `5565a35`; the checkpoint was corrected before Phase 6
work began. This session is limited to integration reliability, compatibility,
performance, security verification, and related defect fixes. Packaging and
release-artifact work remain out of scope.

Phase 6 automated hardening and available live validation completed on
2026-07-11, but the phase remains `in_progress` because disruptive desktop
session scenarios and several visual combinations are still manual. The new
`tests/integration-hardening.test.ts` pipeline connects the real plugin state
machine and publication queue to a real loopback bridge, then parses delivery
through the plasmoid's JavaScript protocol helper. It verifies five
plugin-to-widget latency samples (1.774 ms maximum), multi-widget broadcast,
memory-empty bridge restart, immediate cross-process token rotation, and the
absence of lyric/token sentinels from logs and persisted files.

Adapter and recovery hardening fixed four concrete defects. An in-flight
failed publication no longer overwrites a newer pending state. The running
bridge reloads its token before authentication, so CLI rotation invalidates
the old token immediately. Lyric-source transitions are serialized and failed
source kinds cannot oscillate back into selection for the same track; the
failure set resets on track replacement. Capability detection now validates
public API, store, and timeline shapes and emits a safe descriptor ID. Bridge
shutdown broadcasts `publisher-disconnected` before closing clients, and the
plasmoid reconnects when the Qt application becomes active after resume.

The playback state suite now verifies repeated equal lines by index,
pause/resume, rapid seeks, rapid skips, old-track rejection, replay, no lyrics,
and instrumental states. Live redacted Cider 3.1.8-1 checks started a
synchronized catalog track, observed 79 lines and advancing active indexes,
held time across pause/resume, completed a 15-second seek, replaced the track
with a 61-line DOM reset to index 0, and continued while minimized. Closing
Lyrics removed all 61 lines while playback continued; a post-close inspection
again detected no public API, store, or timeline. The hardened installed build
reported descriptor `unsupported` while idle, as expected.

The upgraded widget remained loaded under `plasmawindowed` for 10 seconds at
normal scaling, five seconds at 150%, and five seconds at 200% with RTL layout,
all on Breeze Dark. `docs/integration-testing.md` records all 20 end-to-end
rows, the visual/session matrix, exact latency samples, compatibility table,
security audit, and remaining manual checks. The unresolved checks are a
several-minute live pause, real suspend/resume with two widgets, a Plasma
session restart, real horizontal/vertical panels, Breeze Light, and font-size
extremes. `plasmoidviewer` is not installed, and suspending or restarting the
active user session was intentionally not triggered automatically.

Validation after the Phase 6 changes:

- `bun run format`: PASS
- `bun run lint`: PASS
- `bun run typecheck`: PASS
- `bun run test`: PASS — 59 tests, 0 failures, with normal loopback access
- `bun run build`: PASS
- `qmllint apps/plasmoid/package/contents/ui/**/*.qml apps/plasmoid/package/contents/config/*.qml apps/plasmoid/package/contents/ui/js/*.js`: PASS
- `KLYRIC_REPORT_PERF=1 bun test tests/integration-hardening.test.ts -t 'propagates extraction events'`: PASS — five samples, 1.774 ms maximum
- `kpackagetool6 --type Plasma/Applet --upgrade apps/plasmoid/package`: PASS
- `plasmawindowed dev.luizpaes.klyric`: PASS — 100%, 150%, and 200%/RTL smoke runs
- `bun run --cwd apps/cider-plugin inspect:cider`: PASS — installed hardened build and live redacted scenario actions
- `git diff --check`: PASS

Tasks 6.2 through 6.5 and 6.9 through 6.11 are complete. Tasks 6.1, 6.6,
6.7, and 6.8 remain incomplete pending the manual rows above. The exact resume
point is task 6.1: run suspend/resume with Cider, bridge, and two live widget
instances, then record the result in `docs/integration-testing.md` before
continuing the remaining manual matrix.
The implementation and automated integration commit is `9ab1f30`
(`fix(integration): harden recovery and compatibility`). Documentation and
checkpoint updates are recorded in `dc15731`
(`docs(phase): record integration hardening matrix`).

Phase 6 resumed later on 2026-07-11 after the horizontal-panel sizing fix was
merged through PR #1. The clean `main` branch is now at merge commit `c7d43ab`;
the branch CI evidence is recorded at `c9fcbfb`. The persistent checkpoint
still described PR #1 as an open draft even though Git showed it merged, and
this journal had not recorded the later panel-fix work. Both status files were
reconciled before runtime validation began. The first actionable work remains
task 6.1, with current focus on task 6.8: upgrade the installed plasmoid and
verify lyric and fallback text directly in a real horizontal Plasma panel.

The first real-panel load found that the merged width hints were necessary but
not sufficient: PlasmaShell reported `configuration is not defined`, leaving
the compact representation without settings and still icon-only. It also
reported an unavailable shared-script `i18n()` context, invalid heading-font
assignments, and deprecated implicit WebSocket signal parameters. Commit
`d2224e0` (`fix(plasmoid): wire panel runtime context`) binds settings through
`Plasmoid.configuration`, restores the importing QML translation context,
uses supported label font properties, declares signal parameters explicitly,
and adds regression coverage for those runtime contracts.

Real horizontal-panel validation now passes on Plasma 6.7.2, Wayland, Breeze
Dark, a 1920x1200 output at 100% scale, and a 32 px horizontal top panel. The
installed applet displayed disconnected fallback text and sanitized short
lyric text directly in the panel. A long line elided within the default 360 px
maximum and a temporary 200 px maximum, and the text remained visible with the
music icon disabled. The applet settings were restored to minimum 100 px,
maximum 360 px, and icon enabled. A live PlasmaShell replacement changed the
process from PID 312884 to 315101 while a paused state was cached; the recreated
widget reconnected as one bridge client and displayed the cached line.

Validation after the runtime fix:

- `bun run format`: PASS
- `bun run lint`: PASS
- `bun run typecheck`: PASS
- `bun run test`: PASS — 60 tests, 0 failures
- `bun run build`: PASS
- `qmllint apps/plasmoid/package/contents/ui/**/*.qml apps/plasmoid/package/contents/config/*.qml apps/plasmoid/package/contents/ui/js/*.js`: PASS
- `kpackagetool6 --type Plasma/Applet --show apps/plasmoid/package`: PASS
- `kpackagetool6 --type Plasma/Applet --upgrade apps/plasmoid/package`: PASS
- final installed-build PlasmaShell log check: PASS — no KLyric QML warning or error
- `plasmoidviewer -a apps/plasmoid/package -l topedge -f horizontal`: NOT RUN — not installed
- `git diff --check`: PASS

Task 6.8 remains incomplete because a real vertical panel, Breeze Light,
font-size extremes, and real 150%/200% compositor scales are not yet validated.
Tasks 6.1, 6.6, and 6.7 also remain incomplete pending the several-minute live
pause, full Plasma-session restart, suspend/resume, and two-real-widget checks.
The next exact action is to move KLyric temporarily into a real vertical panel
and validate default icon-only plus opt-in text behavior before restoring the
current horizontal layout.

Phase 6 continued on 2026-07-11 with a temporary 64 px left panel and a second
real KLyric instance. Both widget clients connected to the loopback bridge and
received the same sanitized paused state. The state remained visible for more
than eight minutes, closing the several-minute pause row when combined with the
earlier live Cider pause/resume and automated expiry coverage. A managed
`plasma-plasmashell.service` restart recreated both clients and delivered the
cached line, adding live two-instance restart evidence.

The default vertical icon-only mode passed, but enabling vertical text exposed
another real-containment defect: the compact representation supplied only
horizontal-axis layout hints and reused its horizontal `RowLayout`, so the
vertical panel showed only a clipped horizontal prefix. The current uncommitted
fix passes the form factor into `CompactRepresentation`, adds vertical-axis
minimum/preferred/maximum lengths, separates horizontal and vertical content,
and renders opt-in text as a bounded label rotated -90 degrees. After package
upgrade and a service-managed PlasmaShell restart, the word `Vertical` rendered
rotated in the real left panel and disabling the option restored icon-only
mode. Two new static regression assertions cover the form-factor binding,
height hint, rotation, horizontal-layout exclusion, and `Text.VerticalFit`.

Breeze Light and the minimum `fontSizeAdjustment=-6` were also visually
validated in both real panel orientations. The pre-fix `+12` setting then
clipped in the 32 px horizontal panel. The working tree now applies
`Text.VerticalFit` with a one-pixel lower bound to both compact labels, but the
environment exhausted its approval quota before that final change could be
installed and visually rechecked. The reversible test setup is still active:
temporary panel 54 remains, both live widgets were last set to `+12` while the
on-disk Plasma config still records `-6`, Breeze Light remains active instead
of the original Breeze Dark, and Show Desktop mode may remain active. The
temporary bridge was stopped cleanly. No workaround was attempted. The first
action after explicit approval or quota reset must be to restore the desktop,
then install and recheck the font-fit change before continuing real 150%/200%
scaling, real RTL, suspend/resume, and the full session restart.

Repository validation for the vertical fix:

- `bun run format`: PASS
- `bun run lint`: PASS
- `bun run typecheck`: PASS
- `bun run build`: PASS
- `qmllint apps/plasmoid/package/contents/ui/**/*.qml apps/plasmoid/package/contents/config/*.qml apps/plasmoid/package/contents/ui/js/*.js`: PASS
- `bun test apps/plasmoid/tests/protocol.test.ts`: PASS — 6 tests, 0 failures
- `bun run test`: PARTIAL — 53 tests pass; eight bridge/integration tests fail with sandbox `EADDRINUSE` because normal loopback access was not approved in this continuation
- `git diff --check`: PASS

Tasks 6.1, 6.6, 6.7, and 6.8 remain incomplete. Multiple real widget
instances, real vertical behavior, Breeze Light, minimum font size, and the
several-minute pause row now pass. Real suspend/resume, a full Plasma-session
restart, live revalidation of the maximum-font fix, real 150%/200% compositor
scaling and RTL, desktop cleanup, full tests with loopback access, and a focused
commit remain required.

The user subsequently restored the desktop before the next continuation:
Breeze Dark is active, temporary panel 54/applet 56 is absent, applet 53 has no
persisted override group, and `plasmoidviewer` is now installed through Plasma
SDK. The approval-quota cleanup blocker is resolved. The current working tree
still contains only the intended vertical-layout/font-fit implementation and
its Phase 6 documentation; live `+12`, real scale/RTL, suspend/resume, full
session restart, full loopback tests, and commits remain.

The current working tree was then upgraded into the live Plasma installation
and PlasmaShell was restarted through its managed user service. With applet 53
set to `fontSizeAdjustment=+12`, the disconnected fallback remained fully
bounded inside the real 32 px horizontal panel, closing the maximum-font
regression exposed by the preceding run. The required
`plasmoidviewer -a apps/plasmoid/package -l topedge -f horizontal` smoke check
also loaded for ten seconds without a QML error. Applet font cleanup and real
150%/200% compositor scaling are the next exact validation step.

Applet 53 was restored to font adjustment zero. The real eDP-1 Wayland output
was recorded at 1920x1200 and scale 1.0, then changed with `kscreen-doctor` to
1.5 and 2.0. At both real compositor scales, the horizontal widget remained
legible and bounded; the output was restored exactly to scale 1.0 afterward.
An original sanitized Arabic state was then published through the real
loopback bridge. A temporary panel widget rendered the line right-to-left and
fully contained, closing the remaining task 6.8 RTL requirement; widget 54 was
removed immediately afterward.

That setup exposed a recovery defect in the restored applet 53: QtWebSockets
can leave `active=true` after a failed connection, so the retry timer's later
`active=true` assignment did not create a new socket. The closed-state handler
now clears `socket.active` before scheduling the reconnect, with a focused
static regression assertion. Investigation also found that the visible
desktop was owned by an unmanaged `plasmashell --replace` process (PID 397737),
so nominal `plasma-plasmashell.service` restarts had started a second process
that exited immediately and had not reloaded the widget. Replacing the actual
active process loaded the installed fix. The original widget then connected,
the bridge was stopped and restarted independently, and `/health` reported one
automatically reconnected client without any PlasmaShell restart. A fresh RTL
publication appeared in applet 53, proving full recovery. Task 6.8 is now
complete; only real suspend/resume and full Plasma-session restart evidence
keep tasks 6.1, 6.6, and 6.7 open.

Final repository validation after the retry change:

- `bun run format`: PASS
- `bun run lint`: PASS
- `bun run typecheck`: PASS
- `bun run test`: PASS — 61 tests, 0 failures
- `bun run build`: PASS
- `qmllint apps/plasmoid/package/contents/ui/**/*.qml apps/plasmoid/package/contents/config/*.qml apps/plasmoid/package/contents/ui/js/*.js`: PASS
- `plasmoidviewer -a apps/plasmoid/package -l topedge -f horizontal`: PASS — loaded for the bounded ten-second smoke window; timeout exit 124 was expected
- `git diff --check`: PASS

Cleanup was verified after validation: eDP-1 is back at scale 1.0,
`fontSizeAdjustment=0`, temporary widgets 54 and 56 are absent, the temporary
bridge is stopped, and the active shell is PID 445227 running
`plasmashell --replace`. An RTC-timed suspend cannot be made self-recovering in
this environment because `/dev/rtc0` needs privilege and non-interactive sudo
reports that a password is required. A real suspend therefore needs the user
present to wake the machine. A full Plasma logout similarly requires the user
to log back in and would terminate the active GUI development session. Those
are the only remaining Phase 6 execution gates; they keep tasks 6.1, 6.6, and
6.7 unchecked. The verified implementation was committed as `f00ef43`
(`fix(plasmoid): harden panel layout and reconnect`).

Phase 6 is now `blocked`, not complete: every non-disruptive implementation
and validation step is finished, but the remaining real suspend/resume and
logout/login checks require the user to wake and re-enter the Plasma session.
Resume with the bridge and applet active, perform those two user-present
cycles, confirm the applet reconnects after each, then close tasks 6.1, 6.6,
6.7, and the Phase 6 exit criterion if both pass.

Phase 6B preparation resumed later on 2026-07-11 with the user present. The
worktree was clean and only documentation commits followed `f00ef43`. Applet
53 connected to a temporary loopback bridge run as the transient user unit
`klyric-phase6b.service`; `/health` reported one client. Cider 3.1.8 was open
with its Lyrics view visible, but the bridge reported `publisherSeen: false`
and no state. The applet therefore retained a prior sanitized Arabic RTL
fixture in its local display cache instead of receiving a current lyric.

The Cider Extensions > Plugins screen reported both `No running plugins` and
`No installed plugins`. The current plugin was rebuilt successfully
(`plugin.js`, 48,968 bytes) and installed at
`~/.config/sh.cider.genten/plugins/dev.luizpaes.klyric/plugin.js`; after a full
Cider restart it still did not appear in that UI. The bridge remained healthy
and had one applet client, but no publisher. This is an unexplained Cider
plugin-discovery failure affecting `apps/cider-plugin` and Cider's local plugin
loader, not a suspend/resume failure. Do not attempt an unverified discovery
format or packaging fix during Phase 6B. Diagnose the expected Cider 3.1.8
plugin layout/manifest and loading mechanism first, with GPT-5.6 Sol at High
reasoning; then restore a discoverable, configured plugin before repeating the
user-present suspend/resume gate.

Diagnosis established the root cause later on 2026-07-11. Cider's installed
3.1.8/3.1.10 loader serves plugin directories statically but includes a plugin
in `/plugins/list` only when `<identifier>/plugin.yml` exists. The renderer then
persists enabled identifiers in `c3api/applied-plugins` and imports
`/plugins/<identifier>/plugin.js`. The official `ciderapp/plugin-template`
independently emits the same `plugin.yml` metadata and `entry.plugin.js.type =
main` layout. KLyric had only `plugin.js`, so Cider correctly omitted it from
the installed list and never enabled or loaded it.

The current uncommitted fix adds `apps/cider-plugin/plugin.yml`, copies it into
`dist` during the Bun build, and adds a focused discovery regression test. The
plugin build, focused test, and `git diff --check` pass. Both build artifacts
were installed locally, and live Cider `/plugins/list` returned the complete
KLyric metadata, proving discovery is restored. The user paused work before
the plugin was enabled and before runtime setup or bridge publication could be
verified. The temporary bridge was stopped, and no suspend or logout action
was initiated. Resume by reviewing the uncommitted changes, enabling the
discovered plugin with redacted loader evidence, confirming publisher health,
and only then preparing the gated suspend/resume scenario.

A follow-up review on 2026-07-11 confirmed the uncommitted discovery fix is
correctly scoped: `plugin.yml` supplies the expected identifier and `plugin.js`
main entry, the package build copies it unchanged into `dist`, the installed
manifest and entrypoint match those artifacts, and
`bun test apps/cider-plugin/tests/plugin-discovery.test.ts` passes (1 test).
A transient loopback bridge started cleanly and reported no publisher before
plugin setup, then was stopped. Cider was already running without a reachable
DevTools endpoint; launching it with `--remote-debugging-port=9222` passed the
flag to that existing process rather than starting a fresh debug-enabled one.
A safe D-Bus quit request did not close the existing process. No plugin
enablement, setup, or publication was therefore observed, and no disruptive
desktop action was performed. The next action is to gracefully close Cider,
start a fresh DevTools-enabled process, enable KLyric, and repeat the redacted
bridge-health verification.

On 2026-07-12, the user performed the required real suspend/resume cycle.
Immediately after the user confirmed resumption, the existing bridge process
was still running and `/health` reported `publisherSeen: true`, `stateAvailable:
true`, and one connected widget client. A second probe eight seconds later
reported the same healthy state. Cider 3.1.8 DevTools remained reachable. The
post-resume redacted inspection found Cider idle, with no lyric DOM and
`descriptorId: unsupported`, which is expected when the Lyrics view is not
open and does not affect bridge/widget recovery. This completes the
suspend/resume and multiple-widget acceptance scenario (tasks 6.1 and 6.7).

The final outstanding Phase 6 scenario is a full Plasma logout/login. The
checkpoint now records this result before requesting logout because it will
terminate the active GUI and Codex session. After logging back in, start a new
Codex session with the continuation prompt in `AGENTS.md`; verify that the
running bridge reports the restored KLyric applet as a client, record the
result, and only then complete task 6.6 and Phase 6.

On 2026-07-12, following the user’s full Plasma logout/login, the pre-existing
transient `klyric-phase6b.service` bridge remained active on loopback port
37654. Two post-login `/health` probes eight seconds apart each reported
`publisherSeen: true`, `stateAvailable: true`, and one connected widget client.
This is redacted evidence that restored applet 53 reconnected automatically.
The bridge journal contains only its startup and accepted-publication event
names, without lyric text or secrets. This completes the full Plasma-session
restart scenario (task 6.6) and the final end-to-end matrix row. Along with the
previous suspend/resume validation, tasks 6.1 and 6.7 and all Phase 6 exit
criteria are complete. `docs/integration-testing.md` records the completed row
and restored desktop baseline.
