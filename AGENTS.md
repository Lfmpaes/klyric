# AGENTS.md

## Project

KLyric displays Cider’s active synchronized lyric line in a KDE Plasma 6 widget.

## Source of truth

Before changing code, read these files in order:

1. `AGENTS.md`
2. `docs/phase-status.md`
3. `KLYRIC_IMPLEMENTATION_PLAN.md`
4. The current Git branch, `git status`, and recent commits

`AGENTS.md` is the quick operational checkpoint. `docs/phase-status.md` is the detailed implementation journal. They must agree.

When documentation and repository state disagree, inspect the implementation and tests, reconcile both status files, and record the discrepancy. Do not assume a checked item is complete without supporting code or validation.

---

## Persistent checkpoint

> **The agent must update this section whenever work starts, a task is completed, a blocker is discovered, validation changes, or a phase ends.**

- **Current phase:** Phase 4 — Cider plugin MVP
- **Phase status:** `pending`
- **Current task:** 4.1 — Implement deterministic plugin setup, teardown, and hot-reload cleanup
- **Recommended model:** GPT-5.6 Terra
- **Reasoning:** High
- **Last completed task:** Phase 3 complete — Bridge MVP
- **Last verified commit:** `9855974` — feat(bridge): add authenticated loopback service
- **Last validation:** `bun run format`, `bun run lint`, `bun run typecheck`, `bun run test` (30 pass), and `bun run build` passed on 2026-07-11.
- **Known blockers:** Cider 3.1.8 exposes lyrics only while its Lyrics view is open; closing the view removes the only proven source. No public API, internal store, or complete timed-line source was detected.
- **Next exact action:** Start Phase 4 at task 4.1 by implementing deterministic plugin setup, teardown, and hot-reload cleanup.
- **Last updated:** 2026-07-11 — Phase 3 completed with a loopback-only authenticated Bun bridge, memory-only state lifecycle, WebSocket broadcasts, CLI, tests, and all required checks passing. The GitHub remote is reachable and `main` tracks `origin/main`.

Allowed phase statuses:

- `pending`
- `in_progress`
- `blocked`
- `complete`

---

## Checklist rules

- Use `[ ]` only for pending or incomplete work.
- Use `[x]` only after the implementation exists and its required validation passes.
- Add `BLOCKED — <reason>` beside an item that cannot proceed.
- Never mark an entire phase complete while one of its required items is unchecked.
- Keep the current task in the persistent checkpoint aligned with the first actionable unchecked item.
- Update `docs/phase-status.md` with more detailed evidence, commands, results, limitations, and handoff notes.
- When interrupted mid-phase, preserve partial work and leave the exact resume point in the persistent checkpoint.
- Do not erase completed checklist history during refactors.

---

## Master implementation checklist

### Phase 0 — Repository bootstrap

**Model:** GPT-5.6 Terra — Medium  
**Scope:** Foundations only. Do not investigate Cider internals or implement product functionality.

- [x] **0.1** Create the Bun workspace and root `package.json`.
- [x] **0.2** Add `bun.lock`, strict base TypeScript configuration, Biome, EditorConfig, and Git ignore rules.
- [x] **0.3** Import and rename the official Cider plugin template under `apps/cider-plugin`.
- [x] **0.4** Create skeleton packages for `apps/bridge`, `apps/plasmoid`, `packages/protocol`, and test utilities.
- [x] **0.5** Add root development, build, lint, typecheck, test, package, install, and uninstall scripts.
- [x] **0.6** Add CI and release workflow skeletons.
- [x] **0.7** Create `README.md`, architecture documentation, and `docs/phase-status.md`.
- [x] **0.8** Verify the empty bridge starts, the empty plasmoid loads, and Cider loads the renamed plugin.
- [x] **0.9** Run all checks available at this phase and record results.
- [x] **Phase 0 complete** — All exit criteria pass and status files are updated.

### Phase 1 — Lyric extraction spike

**Model:** GPT-5.6 Sol — High  
**Scope:** Prove and document lyric extraction only. Do not implement the production bridge, protocol, or Plasma UI.

- [x] **1.1** Add safe, redacted Cider capability-inspection tooling.
- [x] **1.2** Inspect synchronized playback, line changes, pause/resume, seeking, track changes, and lyric-view open/closed behavior.
- [x] **1.3** Identify the full lyric data source, active line/index, timestamps, playback position, and stable subscription mechanism.
- [x] **1.4** Implement the `LyricsSource` interface and source factory.
- [x] **1.5** Implement a minimal public-API adapter placeholder.
- [x] **1.6** Implement and test the internal-store adapter.
- [x] **1.7** Implement and test the timeline adapter when timed lines are available.
- [x] **1.8** Implement and test the DOM fallback.
- [x] **1.9** Confirm behavior while Cider is minimized and while the lyric view is closed.
- [x] **1.10** Add sanitized fixtures for every observed Cider shape.
- [x] **1.11** Document findings, limitations, and selected adapter priority in `docs/cider-research.md`.
- [x] **1.12** Run extraction-specific checks and record evidence.
- [x] **Phase 1 complete or blocked** — The extraction gate is satisfied, or the exact external blocker is documented.

### Phase 2 — Protocol package

**Model:** GPT-5.6 Terra — High  
**Scope:** Shared protocol, schemas, fixtures, validation, and protocol documentation only.

- [x] **2.1** Define protocol version constants and shared enums.
- [x] **2.2** Define track, lyric-line, playback, state, and WebSocket envelope types.
- [x] **2.3** Implement runtime schemas and normalization.
- [x] **2.4** Enforce text, payload-size, timestamp, sequence, and session rules.
- [x] **2.5** Add valid and invalid protocol fixtures.
- [x] **2.6** Add browser-safe and Bun-safe exports.
- [x] **2.7** Add complete protocol unit tests.
- [x] **2.8** Document compatibility and versioning in `docs/protocol.md`.
- [x] **Phase 2 complete** — All protocol exit criteria and checks pass.

### Phase 3 — Bridge MVP

**Model:** GPT-5.6 Terra — High  
**Scope:** Bridge and bridge tests only. Use protocol fixtures; do not implement the production Cider publisher or Plasma UI.

- [x] **3.1** Implement configuration and loopback-only host validation.
- [x] **3.2** Implement secure publisher-token creation, storage, display, and rotation.
- [x] **3.3** Implement authenticated `POST /v1/state` and `DELETE /v1/state`.
- [x] **3.4** Implement `GET /v1/state` and `GET /health`.
- [x] **3.5** Implement the in-memory state store, sequence handling, and duplicate suppression.
- [x] **3.6** Implement WebSocket handshake, cached-state delivery, broadcasts, ping/pong, and client limits.
- [x] **3.7** Implement state expiry and publisher heartbeat behavior.
- [x] **3.8** Implement rate limiting, payload limits, and safe structured logging.
- [x] **3.9** Implement the bridge CLI and graceful shutdown.
- [x] **3.10** Add bridge unit and process-level integration tests.
- [x] **3.11** Verify a mock publisher and client can complete the full state lifecycle.
- [x] **Phase 3 complete** — All bridge exit criteria and checks pass.

### Phase 4 — Cider plugin MVP

**Model:** GPT-5.6 Terra — High  
**Scope:** Production Cider plugin and bridge publication only. Do not implement or style the Plasma widget.

- [ ] **4.1** Implement deterministic plugin setup, teardown, and hot-reload cleanup.
- [ ] **4.2** Implement normalized playback metadata and playback-state observation.
- [ ] **4.3** Integrate the selected lyric adapters and fallback strategy from Phase 1.
- [ ] **4.4** Implement the plugin state machine.
- [ ] **4.5** Implement track-change, seek, pause, resume, stop, and stale-line handling.
- [ ] **4.6** Implement the authenticated bridge client.
- [ ] **4.7** Implement ordered publication, deduplication, heartbeat, retry, and backoff.
- [ ] **4.8** Add plugin settings, token handling, source override, and connection testing.
- [ ] **4.9** Add redacted diagnostics and compatibility reporting.
- [ ] **4.10** Add plugin unit tests using Phase 1 fixtures.
- [ ] **4.11** Verify no duplicate observers survive reload and bridge downtime does not affect Cider.
- [ ] **Phase 4 complete** — All plugin exit criteria and checks pass.

### Phase 5 — Plasma widget MVP

**Model:** GPT-5.6 Terra — High  
**Scope:** Plasma 6 widget and widget-specific tests only. Do not begin packaging or broad integration hardening.

- [ ] **5.1** Create valid Plasma 6 metadata and package structure.
- [ ] **5.2** Implement the QML WebSocket client and protocol handshake.
- [ ] **5.3** Implement message validation, cached state, ping/pong, and reconnection backoff.
- [ ] **5.4** Implement the compact horizontal-panel representation.
- [ ] **5.5** Implement safe vertical-panel behavior.
- [ ] **5.6** Implement the popup with track and adjacent-line context.
- [ ] **5.7** Implement fallback priority for paused, stopped, instrumental, unavailable, and disconnected states.
- [ ] **5.8** Implement connection, appearance, content, and diagnostic settings.
- [ ] **5.9** Add `i18n()`, accessibility, theme awareness, high-DPI, RTL, and Unicode handling.
- [ ] **5.10** Add optional subtle transitions without continuous animation.
- [ ] **5.11** Run `qmllint`, fixture tests, and available `plasmoidviewer` checks.
- [ ] **Phase 5 complete** — All widget exit criteria and checks pass.

### Phase 6 — Integration hardening

**Model:** GPT-5.6 Sol — High  
**Scope:** End-to-end reliability, compatibility, performance, security verification, and bug fixing. Do not prepare release artifacts yet.

- [ ] **6.1** Execute and document the full end-to-end scenario matrix.
- [ ] **6.2** Measure extraction-to-display latency and meet the 250 ms target under normal conditions.
- [ ] **6.3** Harden adapter fallback and Cider compatibility detection.
- [ ] **6.4** Verify minimized Cider and closed lyric-view behavior.
- [ ] **6.5** Verify pause, resume, rapid seek, rapid skip, repeated lines, replay, and no-lyrics cases.
- [ ] **6.6** Verify independent bridge, plugin, Plasma, and system-session restarts.
- [ ] **6.7** Verify suspend/resume and multiple widget instances.
- [ ] **6.8** Test themes, panel orientations, font scaling, DPI scaling, RTL, and long lines.
- [ ] **6.9** Audit loopback binding, authentication, schema validation, logging, and lyric persistence.
- [ ] **6.10** Fix leaks, stale timers, unbounded queues, and recovery defects.
- [ ] **6.11** Update compatibility and manual-test documentation.
- [ ] **Phase 6 complete** — Integration, security, performance, and compatibility criteria pass.

### Phase 7 — Packaging and installation

**Model:** GPT-5.6 Terra — Medium  
**Scope:** Packaging, installers, service files, release automation, and installation documentation only.

- [ ] **7.1** Finalize and validate the hardened systemd user service.
- [ ] **7.2** Implement local installation, upgrade, uninstall, and `--purge` behavior.
- [ ] **7.3** Package the Cider Marketplace plugin archive.
- [ ] **7.4** Package the Plasma widget archive.
- [ ] **7.5** Build the bridge release artifact.
- [ ] **7.6** Generate checksums and a combined release archive.
- [ ] **7.7** Add environment verification and post-install health checks.
- [ ] **7.8** Add installation, upgrade, uninstall, and troubleshooting documentation.
- [ ] **7.9** Add and test the release workflow.
- [ ] **7.10** Add the optional Arch `PKGBUILD` only after manual packaging works.
- [ ] **7.11** Verify clean installation, upgrade preservation, service startup, and uninstall behavior.
- [ ] **Phase 7 complete** — All packaging and installation exit criteria pass.

### Phase 8 — Release readiness

**Model:** GPT-5.6 Sol — High  
**Scope:** Final review, compatibility verification, release validation, and `v0.1.0` preparation only.

- [ ] **8.1** Verify licenses and bundled assets.
- [ ] **8.2** Finalize versions across all components and artifacts.
- [ ] **8.3** Verify current stable Cider compatibility and record exact limitations.
- [ ] **8.4** Verify current supported Plasma 6 compatibility.
- [ ] **8.5** Remove or disable development endpoints, unsafe flags, and verbose diagnostics.
- [ ] **8.6** Complete final architecture, privacy, security, and dependency reviews.
- [ ] **8.7** Run the complete CI and acceptance suite from a clean checkout.
- [ ] **8.8** Install and test final release artifacts on a clean target environment.
- [ ] **8.9** Prepare screenshots, release notes, checksums, and known limitations.
- [ ] **8.10** Tag and prepare `v0.1.0` only after all required criteria pass.
- [ ] **Phase 8 complete** — The implementation plan is complete; do not begin future-work features.

---

## Phase workflow

- Implement exactly one phase per user request: the first phase not marked complete.
- Mark the phase `in_progress` before implementation.
- Work from the first actionable unchecked task in that phase.
- Do not implement, scaffold, or partially start later phases.
- Finish every applicable checklist item and exit criterion for the active phase.
- Run required checks, fix phase-related failures, and update documentation.
- Mark a phase `complete` only when all required items are checked and evidence is recorded.
- Use `blocked` only for a concrete external blocker that cannot be resolved in the current environment.
- End with the required handoff report and stop. Never continue automatically.

---

## Resume protocol for a new chat or agent

At the beginning of every new thread:

1. Read the source-of-truth files in the required order.
2. Run:

   ```bash
   git status --short --branch
   git log -5 --oneline --decorate
   ```

3. Inspect uncommitted changes without discarding or overwriting them.
4. Confirm that the persistent checkpoint, master checklist, phase journal, Git history, and implementation agree.
5. Run the smallest relevant validation needed to confirm the last completed task when its state is uncertain.
6. Update the persistent checkpoint if it is stale.
7. Continue from the first actionable unchecked task in the current phase.
8. Do not ask the user where development stopped unless repository evidence is genuinely insufficient.
9. Do not repeat completed tasks merely because the conversation is new.
10. Never reset, clean, stash, amend, or discard existing work without explicit user instruction.

Use this continuation instruction when needed:

```text
Continue the KLyric implementation. Read AGENTS.md,
KLYRIC_IMPLEMENTATION_PLAN.md, docs/phase-status.md, Git status, and recent
commits. Reconcile the persistent checkpoint with the repository, implement
only the first actionable unchecked task in the current phase, finish the
phase when possible, validate it, update all status records, provide the
required handoff report, and stop before the next phase.
```

---

## Model schedule

| Phase | Model | Reasoning |
|---|---|---|
| 0 — Repository bootstrap | GPT-5.6 Terra | Medium |
| 1 — Lyric extraction spike | GPT-5.6 Sol | High |
| 2 — Protocol package | GPT-5.6 Terra | High |
| 3 — Bridge MVP | GPT-5.6 Terra | High |
| 4 — Cider plugin MVP | GPT-5.6 Terra | High |
| 5 — Plasma widget MVP | GPT-5.6 Terra | High |
| 6 — Integration hardening | GPT-5.6 Sol | High |
| 7 — Packaging and installation | GPT-5.6 Terra | Medium |
| 8 — Release readiness | GPT-5.6 Sol | High |

Do not use Max or Ultra by default. When consecutive phases use the same configuration, tell the user to keep it rather than switch.

---

## Development rules

- Use English for code, documentation, commits, identifiers, and source strings.
- Use Bun. Do not add npm, pnpm, or Yarn lockfiles.
- Keep TypeScript strict. Avoid `any`; validate cross-process and Cider-derived data at runtime.
- Keep undocumented Cider access inside `apps/cider-plugin/src/cider/`.
- Access lyrics only through `LyricsSource`.
- Keep the bridge loopback-only, authenticate writes, and never persist lyrics or log tokens.
- Keep the protocol versioned and backward-compatible within a major version.
- Use Plasma 6 QML APIs, theme-aware components, accessibility properties, and `i18n()`.
- Prefer small modules, explicit cleanup, and event-driven updates over frequent polling.
- Add or update tests for every behavior change and Cider compatibility shape.
- Avoid dependencies when platform or existing workspace APIs are sufficient.
- Do not mix unrelated phases in one commit.

---

## Required checks

Run before completing every phase:

```bash
bun run format
bun run lint
bun run typecheck
bun run test
bun run build
```

Run checks that exist for the current repository state. If a command is intentionally unavailable during an early phase, record it as `NOT RUN` with the reason in both the phase journal and final handoff.

For widget changes, also run:

```bash
qmllint apps/plasmoid/package/contents/ui/**/*.qml
plasmoidviewer -a apps/plasmoid/package -l topedge -f horizontal
```

Manual GUI validation may be `NOT RUN` only when the environment cannot launch Plasma or Cider. Record the exact user verification still required.

---

## Commits

Use Conventional Commits:

```text
feat(scope): description
fix(scope): description
test(scope): description
docs(scope): description
refactor(scope): description
chore(scope): description
research(scope): description
release: description
```

Keep commits focused. Do not commit generated output, secrets, tokens, local configuration, full lyric data, or unrelated changes.

Record the latest verified commit SHA in the persistent checkpoint after committing.

---

## Required handoff report

End every implementation session with:

```text
PHASE <number> — <name>: IN PROGRESS | COMPLETE | BLOCKED

Checkpoint:
- Current task: <task number and name>
- Last completed task: <task number and name>
- Last verified commit: <short SHA or "uncommitted">
- Next exact action: <single concrete action>

Implemented:
- ...

Validation:
- <command>: PASS | FAIL | NOT RUN
- ...

Status files updated:
- AGENTS.md: yes
- docs/phase-status.md: yes

Known limitations or blockers:
- ...

Next phase or continuation:
- Current/next phase: Phase <number> — <name>
- Recommended model: GPT-5.6 <model>
- Reasoning: <level>
- Action: <keep or change model, then continue from the recorded checkpoint>
```

When a phase remains in progress, the report must direct the next agent to the first unchecked task in that same phase. When Phase 8 completes, state that no implementation phase remains.
