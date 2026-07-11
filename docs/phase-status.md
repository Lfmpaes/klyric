# KLyric phase status

| Phase | Status | Recommended model | Reasoning | Completed |
|---|---|---|---|---|
| 0 — Repository bootstrap | complete | GPT-5.6 Terra | Medium | 2026-07-10 |
| 1 — Lyric extraction spike | complete | GPT-5.6 Sol | High | 2026-07-10 |
| 2 — Protocol package | pending | GPT-5.6 Terra | High | — |
| 3 — Bridge MVP | pending | GPT-5.6 Terra | High | — |
| 4 — Cider plugin MVP | pending | GPT-5.6 Terra | High | — |
| 5 — Plasma widget MVP | pending | GPT-5.6 Terra | High | — |
| 6 — Integration hardening | pending | GPT-5.6 Sol | High | — |
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
