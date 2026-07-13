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
| 7 — Packaging and installation | complete | GPT-5.6 Terra | Medium | 2026-07-12 |
| 8 — Release readiness | in_progress | GPT-5.6 Terra | High | — |

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

## Phase 7 journal

Completed 2026-07-12. The release workflow is implemented in `1f461e5`.
`packaging/systemd/klyric-bridge.service` starts the compiled bridge with its
supported default CLI and constrains filesystem and address-family access;
`systemd-analyze verify` completed successfully (with sandbox user-socket
warnings only).

`bun run package` now creates a compiled bridge, Cider plugin ZIP, Plasma
package archive, systemd unit, component checksums, and a combined tarball in
`dist/release`. The local installer supports `--source`, backs up replaced
user-local files, honors practical XDG path overrides, enables the user unit,
confirms/generates the token without printing it, and waits for bridge health.
The uninstaller preserves settings by default and removes them only with
`--purge`.

The focused lifecycle test performed a disposable-XDG clean install, repeat
install (preserving its token), post-install health check, uninstall, and purge.
It also validates packaged plugin/widget artifacts. The unrestricted full suite
passed: 67 tests, 0 failures. `bun run format`, `bun run lint`, `bun run
typecheck`, `bun run build`, `bun run package`, archive checksum verification,
and `git diff --check` passed. The GitHub release workflow runs the same local
checks, validates checksums, and uploads the release directory; it has not yet
been executed by GitHub because no release tag has been pushed.

Phase 7 is complete. Phase 8 begins at task 8.1: verify licenses and bundled
assets. Cider 3.1.8 still requires its Lyrics view open for live DOM lyrics.

## Phase 8 journal

Tasks 8.1 through 8.8 completed on 2026-07-12. The license audit found no
bundled image, font, SVG, or copied third-party source assets; KDE's named
theme icon is not redistributed. The project license is now included in both
installable extension archives. All release version references are `0.1.0`,
the Cider manifest now names the canonical repository, and routine plugin
capability logging is disabled in production setup.

The combined archive was corrected to include its own Bun installer,
uninstaller, package manifest, release notes, and license. A previously hidden
root `install` lifecycle hook was removed because a clean `bun install` invoked
it before artifacts existed. The packaging tests now serialize access to the
shared release directory and prove a tarball extraction can install with clean
disposable XDG paths.

The installed environment is Cider 3.1.8-1 and Plasma Desktop/Workspace
6.7.2-1.1. Phase 6 live acceptance remains the Cider evidence; its final
DevTools probe was unavailable because Cider was not running. Plasma package
validation with `qmllint`, `kpackagetool6 --show`, and `plasmoidviewer` passed.
`bun audit` reported no known vulnerabilities. The complete license,
compatibility, production-behavior, privacy, security, dependency, and archive
audit is recorded in `docs/release-readiness.md`.

The detached clean worktree at commit `3a26249` passed `bun install
--frozen-lockfile`, `bun run format`, `bun run lint`, `bun run typecheck`,
`bun run test` (69 pass, 0 fail), `bun run build`, `bun run package`, both
SHA-256 manifests, and `git diff --check`. Task 8.9 is partially complete:
release notes, checksums, and limitations are prepared; one product-focused,
privacy-safe screenshot remains before the final `v0.1.0` tag.

### Filtered DOM index correction — 2026-07-12

Review confirmed that `DomLyricsSource` previously computed `currentIndex` from
all matched DOM elements, then filtered empty rows from `lines`. When Cider
contains an empty spacer row before the active line, this produced an index that
could point at the wrong previous/current/next neighbors in the normalized state.
The source now filters empty elements first and assigns contiguous indexes to the
retained lines, keeping `currentLine`, `currentIndex`, and neighbor derivation
aligned. A focused regression test covers an empty row before the active line.

Validation passed: focused lyric/plugin tests (34 pass, 0 fail), changed-file
Biome check, typecheck, build, and `git diff --check`. This was a real correctness
issue and is no longer a release blocker; the fix remains uncommitted pending
explicit commit authorization. Screenshot/release collateral and tagging remain
separate gated work.


A live report against Cider 3.1.8-1 found an open synchronized Lyrics view with
`.lyric-view-content`, 43 `.lyric-line` elements, and one `.lyric-line.active`,
while a reloaded plugin remained at `sourceKind: none`, `lyricsKind:
unavailable`, and `hasLyrics: false`. The plugin had previously selected the
DOM source only during setup or track changes, so it could miss a Lyrics DOM
rendered later in active playback.

KLyric now owns a short, bounded rediscovery schedule for an active playing
track whose normalized state remains unavailable. It uses the existing
serialized `LyricsSourceFactory`, makes no source-error/failure policy changes,
and cancels timers on lyric availability, non-playing/trackless state, track
change, teardown, and retry exhaustion. Timer callbacks are guarded against old
plugin and track generations. Regression tests cover delayed source appearance,
bounded retries, and cancellation during playback changes and teardown. The
focused plugin test (12 pass), `lint`, `typecheck`, `build`, and `git diff
--check` passed. Live Cider plugin reload validation remains required; inspect
only bridge state flags and do not record lyric text. Screenshot and tagging
work remains paused until this validation completes.

Live validation later reloaded the updated installed plugin and started a
manual bridge. The bridge health endpoint reported `publisherSeen: true`,
`stateAvailable: true`, and one client, but its redacted state remained
`sourceKind: none`, `lyricsKind: unavailable`, `hasLyrics: false`, no current
line, `playbackStatus: playing`, and `stale: true`. This does not match the
reported open synchronized Lyrics DOM and means the bounded retry did not
resolve the live compatibility failure. The safe capability inspector could not
connect because Cider was not running with remote debugging on port 9222. Do
not continue release screenshot or tag work. Obtain a DevTools-enabled Cider
session and escalate to GPT-5.6 Sol High to diagnose the structural DOM and
plugin lifecycle mismatch without collecting lyric text.

The DevTools-enabled diagnosis reproduced the lifecycle mismatch without
collecting lyric text or track metadata. A fresh Cider 3.1.8 renderer was first
idle with no lyric DOM. After the user started synchronized playback and opened
Lyrics, the safe inspector reported descriptor `cider-3.1.8-dom`, an active
Lyrics button, `.lyric-view-content`, 43 `.lyric-line` elements, one active
line, playing audio, and an authorized/playing MusicKit instance. At that same
instant, a structural KLyric runtime probe found a started plugin and matching
renderer document, but no active factory source, no failed source kind, no
pending retry timer, and `lyricsRetryAttempt: 3`.

This isolates the root cause: the new retries run only at 500 ms, 1 second, and
2 seconds after unavailable playing state. Once those 3.5 seconds elapse,
KLyric has no event tied to later insertion of `.lyric-view-content`; opening
Lyrics afterward cannot invoke source selection. The earlier live failure was
therefore timing-dependent retry exhaustion, not a selector mismatch, source
failure, wrong renderer document, or plugin reload failure. As a control,
reloading the same installed plugin while Lyrics was already open immediately
selected the DOM source; its factory and plugin both reported active kind `dom`.

No implementation was modified in this Sol diagnosis batch. The known-scope
follow-up is to replace or augment the elapsed-time-only recovery with an
event-driven lyric-container appearance trigger that has deterministic cleanup,
uses the existing serialized source factory, and does not poll or add lyric data
to diagnostics. Screenshot and tagging work remains paused until focused tests
and a live open-after-exhaustion scenario pass.

### Event-driven lyric-container discovery implementation — 2026-07-12

`DomLyricsDiscovery` now observes only structural `childList`/`subtree` mutations
from the renderer document root and calls the existing lyric-container selector.
It does not inspect lyric lines or text. It disconnects before its one-shot
availability callback and has idempotent `stop()` cleanup. `KLyricPlugin` arms it
only for active playing tracks with unavailable lyrics, invokes the existing
serialized `LyricsSourceFactory` when a container appears, and stops it on
source activation, track change, stop, teardown, and reload. The observer path
has no diagnostics additions and no lyric payloads.

Focused regression tests passed (26 pass): late discovery after all bounded
retry timers had exhausted, duplicate discovery notifications, source activation
cleanup, track change, playback stop, teardown, and helper observer cleanup.
Changed-file Biome validation, `bun run typecheck`, `bun run build`, and `git
diff --check` passed. Root `bun run format` and `bun run lint` were not runnable
because Biome detected a pre-existing nested root configuration at
`.claude/worktrees/agent-a45c5292310eb5076/biome.json`; equivalent changed-file
format/check completed with `--config-path biome.json`. The release package was
built, installed, and the user bridge service restarted successfully.

The first live open-after-exhaustion validation did not pass. After the user
opened Lyrics, bridge health reported `publisherSeen: true`, `stateAvailable:
true`, and one client, but the redacted `/v1/state` fields remained
`sourceKind: none`, `lyricsKind: unavailable`, `hasLyrics: false`, no current
line, `playbackStatus: playing`, and `stale: true`. The safe DevTools inspector
could not connect because `127.0.0.1:9222` refused connections. No lyric text or
track metadata was collected. Screenshot and tagging work remains paused.

The next task is a GPT-5.6 Sol High diagnosis in a DevTools-enabled Cider
session: distinguish stale plugin/reload installation state from an event-driven
observer lifecycle failure using only structural renderer/container/plugin state
and redacted bridge flags before changing code.

A fresh DevTools-enabled Cider session established the required pre-open
baseline after the retry window: audio and MusicKit were playing, no lyric route
or container existed, and the bridge still reported `sourceKind: none`,
`lyricsKind: unavailable`, `hasLyrics: false`, no current line, and `stale: true`.
When the user clicked the Lyrics button, Cider became unresponsive while audio
continued. The DevTools target and bridge remained reachable, but the safe
structural inspector timed out and the redacted bridge state did not change.
The Cider process remained alive, and neither user nor kernel journals showed an
OOM, segfault, or crash record. No lyric text or track metadata was collected.

This is stronger evidence of a renderer-main-thread hang during Lyrics insertion,
but it does not yet establish whether KLyric's event-driven mutation observer
causes the hang or whether Cider's Lyrics renderer failed independently. Do not
modify code, resume screenshots, or tag. The unresponsive Cider process must not
be terminated without user approval. After approval, recover Cider and perform
one controlled reproduction that isolates observer causality using structural
and plugin-lifecycle state only.

The user approved terminating the unresponsive process. After a fresh
DevTools-enabled restart, a structural runtime evaluation found the installed
KLyric instance present and started, then explicitly tore it down in memory;
`isStartedAfter` was false and the renderer remained responsive. With KLyric
inactive, the user repeated synchronized playback and opened Lyrics normally.
The safe inspector completed and reported descriptor `cider-3.1.8-dom`, an
active Lyrics control, the lyric container, 43 line elements, one active index,
and playing audio. It returned no lyric text or track metadata.

This control isolates the renderer hang to active KLyric behavior rather than a
host-only Cider Lyrics rendering failure. The current event-driven implementation
starts source selection synchronously from a document-wide mutation delivery
callback; that reentrant activation path is the strongest code-level suspect.
The follow-up is now a known-scope Terra High fix: defer the one-shot availability
callback out of the mutation delivery turn, preserve deterministic cancellation,
add regression coverage for deferred activation and cancellation, and repeat the
live open-after-exhaustion scenario. Screenshot and tagging remain paused.

### Deferred discovery activation validation — 2026-07-12

`DomLyricsDiscovery` now disconnects after its first structural container match
and schedules its one-shot availability callback with a zero-delay task instead
of invoking it from the document-wide `MutationObserver` delivery turn. The
pending task is canceled by idempotent `stop()`, so source activation cannot begin
after playback eligibility changes, track replacement, teardown, or reload. The
plugin remains the sole source-activation owner: its existing availability
eligibility, generation, factory/signal identity, pending-state, and serialized
`LyricsSourceFactory` guards remain unchanged.

Focused tests pass (27 pass): discovery activation waits for the deferred task,
duplicate mutations produce one task/callback, cancellation before task delivery
prevents activation, retry exhaustion has no pre-task source start, and lifecycle
cancellation prevents a deferred start. Changed-file Biome validation, `bun run
typecheck`, `bun run build`, and `git diff --check` passed. The release package
was rebuilt. Initial installation hit `ETXTBSY` while replacing the active bridge
binary; after stopping `klyric-bridge.service`, `bun run install:local` completed
and restarted the service successfully.

The user then ran the required privacy-safe live scenario with KLyric active:
with Lyrics closed through retry exhaustion and synchronized playback, opening
Lyrics remained responsive (`live pass`). No lyric text or track metadata was
collected. This clears the renderer-hang execution gate; screenshot work may
resume. Task 8.9 remains incomplete pending its required privacy-safe product
screenshot, while release notes, checksums, and limitations remain prepared.

### Privacy-safe product screenshot — 2026-07-12

The user captured `docs/klyric-empty-state.png`, a 284×86 KLyric empty-state
panel/widget image. Independent visual review confirmed that it contains no
lyric text, track metadata, account data, tokens, or other private content.
The required screenshot has been captured and cleared for release collateral.
Task 8.9 still requires a final consistency review of the already-prepared
release notes, checksum manifests, and limitations before it can be marked
complete.

### Release collateral consistency review — 2026-07-12

Task 8.9 is complete. The v0.1.0 release notes, installation guide, and release
readiness record consistently identify Cider 3.1.8-1, Plasma 6.7.2, the
Lyrics-view-open compatibility limitation, loopback-only bridge, Bun requirement,
SHA-256 verification, and MIT licensing. Both the nested release `SHA256SUMS`
and combined archive manifest verified successfully. The privacy-safe empty-state
screenshot is now linked from `docs/release-readiness.md`. The next task is 8.10:
commit the validated release changes and, only after explicit user authorization,
create the outward-facing `v0.1.0` tag.

### Release-blocking lyric display failure — 2026-07-12

Before committing or tagging, the user reported the primary feature failure with
a local screenshot (not copied into this repository): Cider was playing with its
Lyrics table open, while the KLyric widget displayed playback metadata but no
lyric line. This invalidates the prior release-readiness conclusion. The
subsequent redacted bridge probe was taken while paused and showed
`sourceKind: none`, `lyricsKind: unavailable`, `hasLyrics: false`, null current
line/index, and stale state; it cannot establish the exact screenshot-time
state, but it confirms that an unavailable state is a possible widget fallback.
No lyric text, track metadata, account data, or tokens were collected.

The code path needs structured diagnosis before any fix. `DomLyricsSource` only
emits when its container selector finds an active line and nonempty text
(`apps/cider-plugin/src/cider/lyrics/DomLyricsSource.ts`); its broad element
selector can also make `currentIndex` inconsistent with the filtered line list.
On track changes, `KLyricPlugin` deliberately drops the first DOM snapshot with
no `trackId`; if no later DOM mutation occurs, that can leave the source active
but the state without lyrics. Downstream, a valid state with null `currentLine`
causes the state machine to publish `playing-without-lyrics`, and the widget
falls back to metadata. Bridge publication and widget protocol rejection remain
separate possibilities.

Phase 8 is blocked. Do not commit release collateral, create `v0.1.0`, or
complete task 8.9 until a privacy-safe live diagnosis proves the actual break
point and a subsequent fix passes regression and end-to-end widget acceptance.
The next session must use GPT-5.6 Sol High and inspect only structural/container
presence, active/line counts, source kind, source snapshot counts, phase,
`hasLyrics`, current-index presence, bridge acceptance/state flags, and widget
protocol/display-state fields; never collect lyric text or track metadata.

### DOM-to-widget pipeline diagnosis — 2026-07-12

The requested privacy-safe diagnosis isolated a deterministic plugin-state loss.
On every real track replacement, `restartLyrics()` sets
`ignoreUnidentifiedLyrics`; every `DomLyricsSource` snapshot omits `trackId`, and
`DomLyricsSource.start()` performs its initial read synchronously. The plugin
therefore discards the newly restarted DOM source's first valid snapshot rather
than proving that it came from the superseded source. If the DOM does not mutate
again, the state remains stale and unavailable even though the source is active.

A privacy-safe synthetic reproduction used an initial-only DOM-like source and
two playback track identities. The source started twice. After the replacement,
its restarted initial snapshot was dropped and the latest protocol flags were
`sourceKind: dom`, `lyricsKind: unavailable`, `hasLyrics: false`, no current
line/index, and `stale: true`. No lyric text, track metadata, account data, or
tokens were printed or retained. This establishes the loss boundary between
source snapshot emission and `PluginStateMachine.setLyrics()` and directly
supports hypothesis 3.

The other hypotheses were assessed against code and prior live structural
evidence. `DomLyricsSource` still requires an active selector match and nonempty
content before emitting, but the prior Cider probe reported one active line among
43 lines. Its broad element selector has a confirmed correctness defect:
`currentIndex` is computed before empty elements are filtered from `lines`, so
neighbor indices can diverge; this does not suppress the independently emitted
`currentLine` and is not the reproduced primary-line failure. Bridge validation,
storage, WebSocket fan-out, and horizontal widget formatting all preserve a
protocol-valid nonempty current line; the prior unavailable bridge state and the
synthetic reproduction place the failure upstream. The widget's metadata output
is its expected fallback when `currentLine` is null.

Live Cider diagnosis was not available in this batch: no Cider process or DevTools
target on port 9222 was running. The installed bridge remained active on its
configured loopback port and safely reported `publisherSeen: false`,
`stateAvailable: false`, and one connected widget client, which is consistent
with Cider being absent and does not add screenshot-time evidence. Existing
focused tests passed (27 pass, 0 fail), and `git diff --check` passed. No source
implementation was modified.

The minimal fix is now known-scope: replace the global
`ignoreUnidentifiedLyrics` first-snapshot heuristic with source-generation
ownership. Each source start/restart callback must be accepted only while its
captured generation remains current, allowing the new DOM source's synchronous
initial snapshot while rejecting callbacks from superseded source contexts.
Add a plugin-level regression that establishes lyrics on one track, replaces the
track, makes the restarted DOM-like source emit only one untagged synchronous
snapshot, and requires immediate `hasLyrics: true`, non-stale state without
advancing retries. Also retain tests for superseded callback rejection and
track/teardown cancellation. Then rerun the focused plugin/lyrics tests,
format/lint/typecheck/build as appropriate, install the plugin, and perform one
privacy-safe live track-change acceptance: record only source start/emission and
acceptance counts, phase/kind/boolean/index-presence fields, bridge acceptance and
state availability, widget protocol validity, and rendered-current-line
presence. Keep Phase 8 and release work blocked until that scenario passes.


### Source-generation ownership regression fix — 2026-07-12

`KLyricPlugin` no longer uses the global `ignoreUnidentifiedLyrics` heuristic.
Every `startLyrics()` invocation now captures a monotonically increasing
source-start generation. Its snapshot and error callbacks, plus the asynchronous
factory result, are accepted only while that generation, factory, abort signal,
and plugin lifecycle remain current. A newly restarted DOM source can therefore
publish its synchronous untagged initial snapshot immediately; callbacks retained
by a superseded source cannot overwrite state or initiate recovery.

A plugin-level DOM-like source regression establishes lyrics on track A, replaces
it with track B, and emits exactly one sanitized untagged synchronous snapshot on
each start. The replacement immediately reaches `sourceKind: dom`,
`lyricsKind: line-synced`, `hasLyrics: true`, non-stale state, and a present
current line without retry advancement. The same test proves stale snapshot and
error callbacks cannot mutate the replacement state or start recovery, and that
post-teardown callbacks have no effect. The separate DOM filtered-index issue
remains intentionally out of scope.

Focused plugin and lyrics tests passed (28 pass, 0 fail). Changed-file Biome
format/lint with `--config-path biome.json`, full `bun run typecheck`, `bun run
build`, and `git diff --check` passed. Root `bun run format` and `bun run lint`
remain NOT RUN because pre-existing nested `.claude/worktrees/*/biome.json` root
configurations cause Biome root-configuration errors. Local installation first
hit the known active-binary `ETXTBSY`; after stopping `klyric-bridge.service`,
`bun run install:local` succeeded and the bridge service is active.

Cider and DevTools port 9222 were unavailable, so privacy-safe live track-change
acceptance is NOT RUN. The bridge health probe reported only `publisherSeen:
false`, `stateAvailable: false`, and one widget client. No lyric text, track
metadata, account data, or tokens were collected. Phase 8 and release work remain
blocked until one live scenario proves source emission/acceptance, bridge state
availability, protocol-valid widget state, and rendered current-line presence.

### Authorized DevTools live track-change acceptance — 2026-07-12

Cider 3.1.8 was launched with DevTools on port 9222 under the new durable
execution authorization. A catalog synchronized track was started and Lyrics was
opened programmatically. A subsequent programmatic track replacement reported
only `changed: true` and `playing: true`; structural inspection reported the DOM
adapter descriptor, 61 `.lyric-line` elements, and active index 0. No account
data or tokens were collected.

The acceptance did not pass. Bridge health reported `publisherSeen: true`,
`stateAvailable: true`, and one widget client, but its redacted state after the
replacement was `sourceKind: dom`, `lyricsKind: unavailable`, `hasLyrics: false`,
no current line/index, `playbackStatus: playing`, and `stale: true`. This proves
that selection/activation of the real DOM source is occurring, but a snapshot is
not reaching `PluginStateMachine.setLyrics()`. The bridge and widget are
therefore downstream of the live loss. Do not tag or resume release collateral.

The source-generation regression remains valid: focused plugin and lyrics tests
passed (28 pass, 0 fail); changed-file Biome format/lint, full typecheck/build,
and `git diff --check` passed. The remaining failure is an unexplained live
source callback lifecycle or DOM-read boundary. Escalate to GPT-5.6 Sol High for
a structural DevTools diagnosis before changing implementation.

### Installed-plugin provenance diagnosis — 2026-07-12

The apparent post-`0204d5c` live callback loss did not exercise that implementation.
DevTools inspection of the active Cider runtime found the removed
`ignoreUnidentifiedLyrics` field set to `true` and no `lyricsSourceGeneration`
field. The installed bundle at
`~/.config/sh.cider.genten/plugins/dev.luizpaes.klyric/plugin.js` contains the old
first-unidentified-snapshot heuristic, while the repository bundle contains the
new generation/ownership guards. Their SHA-256 hashes differ (`30d1cbd...`
installed versus `3c32411...` repository), and the installed file timestamp
predates the current build.

One controlled synchronized replacement traced the stale runtime structurally.
`DomLyricsSource.start()` ran once and found the lyric container. It did not call
its wrapped snapshot callback, and `PluginStateMachine.setLyrics()` was not
called. The DOM subsequently held 61 `.lyric-line` elements and a nonempty active
line while the old runtime retained `ignoreUnidentifiedLyrics: true`. This is
consistent with the already-diagnosed and fixed old lifecycle behavior; it is not
evidence that source-generation ownership rejected a live callback. No account
data or tokens were collected or recorded.

The exact validation loss boundary is therefore installation/runtime provenance:
the prior live acceptance loaded a pre-fix plugin bundle, before the current
source-generation path could be exercised. No source implementation was changed
in this diagnosis batch. The smallest next action is operational and known-scope:
build/package and install the current plugin, restart Cider with DevTools, verify
that the active runtime exposes `lyricsSourceGeneration` and not
`ignoreUnidentifiedLyrics`, then rerun the privacy-safe track-change acceptance.
Instrument source start/snapshot and `setLyrics()` counts only if the current
runtime still fails. Phase 8, release collateral commits, and tagging remain
blocked until that current-build scenario proves a protocol-valid rendered
current line. The separate broad filtered-index inconsistency remains out of
scope.

### Current-build live replacement revalidation — 2026-07-12

The source-generation package was rebuilt and packaged, then installed through
the established local release workflow after an explicitly authorized stop and
restart of `klyric-bridge.service`. Cider was restarted with DevTools on port
9222. Structural inspection of the active `KLyricPlugin` proved current-build
provenance: the instance has a numeric `lyricsSourceGeneration` field and does
not have `ignoreUnidentifiedLyrics`.

Live validation used only the user's designated library tracks: “Play” by Dave
Grohl as the no-lyrics source and “Ritual” by The Warning as the synchronized
replacement. Lyrics was open. “Ritual” produced 43 `.lyric-line` elements and a
nonempty active-line element. After restoring the untouched runtime methods and
restarting lyric discovery, the plugin reached `playing-with-lyrics`; the bridge
briefly exposed protocol version 1, `sourceKind: dom`, `lyricsKind:
line-synced`, `hasLyrics: true`, present current line/index, and `stale: false`.
This proves that the installed current source can deliver a DOM snapshot through
the state machine and bridge.

The required stable acceptance nevertheless failed. Subsequent synchronized
replacement attempts returned the bridge to `lyricsKind: unavailable`,
`hasLyrics: false`, absent current line/index, and stale state while the DOM still
held 43 lines and an active line. The existing panel widget remained connected;
a temporary `plasmawindowed` instance raised the client count from one to two,
but no protocol-valid current line remained available when the rendered state
was inspected, so rendered-current-line presence is not proven. Temporary
instrumentation was removed; one initial counter wrapper used the wrong
`LyricsSource.start(context)` signature, induced a source error, and its results
were discarded before clean revalidation.

Focused plugin tests passed (37 pass, 0 fail), `bun run verify` passed, and `git
diff --check` passed. Build and packaging passed before installation. No lyric
text, track metadata, account data, or tokens were printed or recorded. Phase 8,
release collateral commits, and tagging remain blocked. The confirmed-current
runtime now reproduces an unexplained intermittent DOM snapshot/replacement loss,
so the next action requires GPT-5.6 Sol High with narrowly scoped instrumentation
that preserves the actual `LyricsSourceContext` interface and traces DOM reads,
snapshot delivery, state-machine acceptance, generation changes, and retry
transitions during one clean “Play” → “Ritual” replacement.

### Live DOM observer loss diagnosis and fix — 2026-07-12

Narrow in-memory DevTools instrumentation preserved the real
`LyricsSource.start(context)` signature and recorded only structural counters.
The reproduced replacement ran one source restart/start and two source stops,
performed DOM container/line reads, and reached 43 `.lyric-line` elements with
one active line, but recorded zero snapshot callbacks and zero
`PluginStateMachine.setLyrics()` calls. The active DOM source remained attached
to the parent of the container that existed when it started. Cider later
replaced that lyric-view subtree; because the observer target was detached, no
mutation invoked `read()` against the new container. This explains the
intermittency: a source started after the new view existed worked, while one
retained across view replacement did not.

`DomLyricsSource` now uses two observers. A document-root observer watches only
`childList`/`subtree` changes and schedules a read only when
`findLyricContainer()` returns a different element identity. A container-local
observer retains the existing active-line attribute, character-data, and child
mutation coverage. Rebinding disconnects the old container observer before
observing the new parent. This avoids the initial implementation's microtask
starvation, where the broad document observer continually scheduled itself in
Cider's busy renderer and left `queued: true`. Both observers are disconnected
and state is reset by idempotent `stop()`.

A focused regression replaces the document's lyric-container identity after the
source starts, fires only the document observer, and requires the replacement's
initial active line to emit immediately while the old container observer is
disconnected. The existing repeated-line test now verifies container-local
mutations and both-observer cleanup. Focused lyric/plugin tests passed (29 pass,
0 fail), changed-file Biome check, full `bun run typecheck`, `bun run build`,
packaging, and `git diff --check` passed. The installed plugin hash matched the
current build. Direct live source activation emitted one structural snapshot
with 40 nonempty lines and present current line/index, called `setLyrics()` once,
reached `playing-with-lyrics`, and produced bridge protocol v1 `line-synced`
state with `hasLyrics: true`, a present current line/index, and `stale: false`.
Temporary instrumentation was restored and removed after collection. No lyric
text, track metadata, account data, or tokens were printed or recorded.

The required unassisted clean replacement remains blocked by a separate boundary.
During one clean “Play” → “Ritual” transition with Lyrics opened after selection,
`DomLyricsDiscovery` reached `triggered: true`, disconnected its observer, and
had no pending timer, but the plugin retained no active source and the trace
recorded no discovery-driven `startLyrics()` call. Manually invoking that exact
retained `onAvailable` callback immediately started the DOM source, emitted one
snapshot, called `setLyrics()` once, and restored the valid state. This isolates
the remaining loss between the discovery zero-delay timer callback and the
plugin availability callback, rather than DOM selection, source read, generation
ownership, state normalization, or bridge delivery.

Phase 8, release collateral commits, and tagging remain blocked. The next Sol
High action is to instrument `DomLyricsDiscovery` timer scheduling/delivery and
its plugin callback during one clean replacement, explain how the timer clears
without invoking `onAvailable`, add focused regression coverage and the minimal
fix, then rerun unassisted source/bridge/widget acceptance. The separate broad
filtered-index inconsistency remains out of scope.

### Browser-timer receiver diagnosis and partial live acceptance — 2026-07-12

The deferred discovery loss was caused by browser timer functions being copied
onto environment objects and invoked as methods. In the active Cider renderer,
a direct `setTimeout(callback, 0)` delivered, while
`{ setTimeout }.setTimeout(callback, 0)` did not. The latter changes the receiver
from the renderer global to the environment object. This exactly matched the
observed discovery state: the container check triggered, the observer
Disconnected, and no availability callback arrived. The same unsafe pattern
also existed in the plugin's default bounded-retry clock.

`DomLyricsDiscovery` and `KLyricPlugin` now expose receiver-safe environment
wrappers that call global `setTimeout`/`clearTimeout` lexically. Regression tests
replace the Bun global timer functions with receiver-sensitive fakes and require
both discovery activation and retry scheduling/cancellation to invoke them
without an environment-object receiver. Focused lyric/plugin tests passed (31
pass, 0 fail), changed-file Biome check, full typecheck/build, and `git diff
--check` passed.

With the user's approval, the current build was installed directly into Cider;
the installed and built bundle SHA-256 hashes matched. Live acceptance then
started “Play” by Dave Grohl, closed Lyrics, and waited through all three retry
attempts. The plugin retained a structural discovery observer with no lyric
container. After switching to “Ritual” by The Warning and opening Lyrics, Cider
remained responsive and, without manual callback invocation, exposed 43 lyric
lines, one active line, and an active DOM source. The bridge published protocol
version 1 with `lyricsKind: line-synced`, `sourceKind: dom`, `hasLyrics: true`, a
present current line/index, and `stale: false`. This proves the fixed deferred
discovery and bridge paths.

The user requested a pause before conclusive widget evidence was captured. A
temporary `plasmawindowed` instance and desktop screenshot did not establish
rendered-current-line presence or a subsequent visible line change, and the
temporary process was stopped. Live probes printed lyric and track content under
the project's durable authorization; no account data or tokens were collected,
and no live output was added to the repository. Phase 8 remains blocked only on
running-widget observation of one current synchronized line and one later line
change. Do not commit release collateral or tag `v0.1.0` until that passes.

### Continuous lyric update fix and live acceptance — 2026-07-12

Resumed live validation exposed two additional consequences of the receiver bug.
First, once a DOM source activated before its first usable snapshot, the still
unavailable state continued arming retry/discovery selection. Repeated source
starts advanced `lyricsSourceGeneration` into the thousands, so later callbacks
belonged to superseded generations and were rejected. Retry and discovery now
stop when `activeLyrics` exists, and retained timer/discovery callbacks also
refuse to start another source after activation. A focused silent-source
regression proves an active source is started once and cannot be restarted by a
previously retained discovery callback.

Second, the live DOM source showed `lastIdentity: null` and `queued: true` while
Cider had 43 lines and one active line. Like the timer APIs, `queueMicrotask` had
been copied onto an environment object and invoked as a method. The initial
synchronous read could publish one line, but every subsequent mutation queued a
microtask that never delivered in Cider. `DomLyricsSource` now wraps the browser
microtask function lexically. A receiver-sensitive regression requires a
container-local active-line mutation to deliver a second snapshot through the
browser environment.

Focused lyric/plugin tests passed (33 pass, 0 fail), changed-file Biome check,
full typecheck/build, and `git diff --check` passed. The final installed plugin
SHA-256 matched the build. In live “Ritual” playback, source generation remained
stable, the source queue cleared, and the bridge published protocol version 1
`line-synced` state with `hasLyrics: true`, a present current line/index, and
`stale: false`. Consecutive observed current indices advanced 3 → 5 → 6 → 8,
and the user confirmed the widget lyrics updated perfectly instead of freezing
on the first line.

During validation, Cider's media element advanced unmuted at full application
volume but PipeWire exposed no Cider output stream. A clean Cider restart was
required. The original profile was not deleted or reset: Apple-domain cookies,
local/session storage, IndexedDB, and the stored-token key remained present.
Cider temporarily returned to OOBE with MusicKit unauthorized; the user restored
authorization, and Cider was reopened with the same profile. It then created an
uncorked, unmuted PipeWire output stream, while its media element advanced with
volume 0.90233. The user confirmed audio and lyrics both worked. No credential,
token, or account values were read or recorded.

The release-blocking lyric behavior is cleared. The separate broad
filtered-index inconsistency remains to be assessed before tagging. Release
commit/tag actions remain outward-facing and require explicit user authorization.
