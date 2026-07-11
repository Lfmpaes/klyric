# AGENTS.md

## Project

KLyric displays Cider’s active synchronized lyric line in a KDE Plasma 6 widget.

## Source of truth

Before changing code, read these files in order:

1. `AGENTS.md`
2. `docs/phase-status.md`
3. `docs/phase-6-panel-layout-checkpoint.md`, when present
4. `KLYRIC_IMPLEMENTATION_PLAN.md`
5. The current Git branch, `git status`, and recent commits

`AGENTS.md` is the operational checkpoint. `docs/phase-status.md` is the detailed implementation journal. Supplemental checkpoint documents record branch-specific work that has not yet been merged into the main journal. Repository state and passing validation take precedence over stale status text.

When documentation and repository state disagree, inspect the implementation and tests, reconcile the status files, and record the discrepancy. Do not assume a checked item is complete without supporting code or validation.

---

## Persistent checkpoint

> Update this section whenever work starts, a task completes, a blocker is discovered, validation changes, or a phase ends.

- **Current phase:** Phase 6 — Integration hardening
- **Phase status:** `in_progress`
- **Current task:** 6.1 — Execute and document the full end-to-end scenario matrix; active subtask is 6.8 horizontal-panel lyric validation
- **Recommended model:** GPT-5.6 Sol
- **Reasoning:** High
- **Last completed task:** 6.11 — Update compatibility and manual-test documentation; panel sizing implementation and layout documentation are committed in draft PR #1
- **Last verified commit:** `9281dc1` — docs(plasmoid): document taskbar lyric layout
- **Open pull request:** Draft PR #1 — `fix(plasmoid): show lyric text in horizontal panels` on `agent/fix-compact-lyrics`
- **Last validation:** Previous Phase 6 checks passed on 2026-07-11. The panel-sizing patch has received static review, but branch-wide automated checks and real horizontal-panel validation remain pending.
- **Known blockers:** Cider 3.1.8 exposes lyrics only while its Lyrics view is open. Real horizontal-panel validation of PR #1, suspend/resume, Plasma-session restart, real vertical-panel, Breeze Light, and font-extreme checks require interaction with the active Plasma session. `plasmoidviewer` is unavailable.
- **Next exact action:** Validate draft PR #1 in a real horizontal Plasma panel using `docs/plasma-panel-layout.md`, record the result in the Phase 6 matrix, then resume the remaining task 6.1 scenarios.
- **Last updated:** 2026-07-11 — Added the horizontal-panel sizing fix, taskbar layout contract, draft PR #1, and pending real-panel validation checkpoint.

Allowed phase statuses:

- `pending`
- `in_progress`
- `blocked`
- `complete`

---

## Checklist rules

- Use `[ ]` only for pending or incomplete work.
- Use `[x]` only after implementation exists and required validation passes.
- Add `BLOCKED — <reason>` beside work that cannot proceed.
- Never mark a phase complete while a required item is unchecked.
- Keep the persistent checkpoint aligned with the first actionable unchecked item.
- Update `docs/phase-status.md` with detailed evidence after merging branch work.
- Use a supplemental checkpoint document for active PR work that has not yet been merged.
- Preserve partial work and the exact resume point when interrupted.
- Do not erase completed checklist history.

---

## Master implementation checklist

### Phase 0 — Repository bootstrap

**Model:** GPT-5.6 Terra — Medium  
**Status:** complete

- [x] Workspace, tooling, package skeletons, CI, documentation, and initial runtime validation completed.
- [x] **Phase 0 complete**

### Phase 1 — Lyric extraction spike

**Model:** GPT-5.6 Sol — High  
**Status:** complete

- [x] Capability inspection, adapters, fixtures, live Cider 3.1.8 research, and limitations documented.
- [x] **Phase 1 complete**

### Phase 2 — Protocol package

**Model:** GPT-5.6 Terra — High  
**Status:** complete

- [x] Versioned types, schemas, validation, fixtures, tests, and protocol documentation completed.
- [x] **Phase 2 complete**

### Phase 3 — Bridge MVP

**Model:** GPT-5.6 Terra — High  
**Status:** complete

- [x] Loopback service, authentication, state lifecycle, WebSocket support, CLI, tests, and documentation completed.
- [x] **Phase 3 complete**

### Phase 4 — Cider plugin MVP

**Model:** GPT-5.6 Terra — High  
**Status:** complete

- [x] Lifecycle, playback observation, lyric-source integration, state publication, settings, diagnostics, and tests completed.
- [x] **Phase 4 complete**

### Phase 5 — Plasma widget MVP

**Model:** GPT-5.6 Terra — High  
**Status:** complete

- [x] Plasma package, WebSocket client, compact and full representations, settings, fallbacks, accessibility, and QML checks completed.
- [x] **Phase 5 complete**

### Phase 6 — Integration hardening

**Model:** GPT-5.6 Sol — High  
**Scope:** End-to-end reliability, compatibility, performance, security verification, and bug fixing. Do not prepare release artifacts yet.

- [ ] **6.1** Execute and document the full end-to-end scenario matrix.
- [x] **6.2** Measure extraction-to-display latency and meet the 250 ms target.
- [x] **6.3** Harden adapter fallback and Cider compatibility detection.
- [x] **6.4** Verify minimized Cider and closed lyric-view behavior.
- [x] **6.5** Verify pause, resume, rapid seek, rapid skip, repeated lines, replay, and no-lyrics cases.
- [ ] **6.6** Verify independent bridge, plugin, Plasma, and system-session restarts.
- [ ] **6.7** Verify suspend/resume and multiple widget instances.
- [ ] **6.8** Test themes, panel orientations, font scaling, DPI scaling, RTL, and long lines. Panel sizing fix is implemented in draft PR #1; real horizontal-panel validation remains pending.
- [x] **6.9** Audit loopback binding, authentication, schema validation, logging, and lyric persistence.
- [x] **6.10** Fix leaks, stale timers, unbounded queues, and recovery defects.
- [x] **6.11** Update compatibility and manual-test documentation.
- [ ] **Phase 6 complete** — All integration, security, performance, and compatibility criteria pass.

### Phase 7 — Packaging and installation

**Model:** GPT-5.6 Terra — Medium  
**Status:** pending

- [ ] Finalize the hardened systemd user service.
- [ ] Implement install, upgrade, uninstall, and `--purge` behavior.
- [ ] Package the Cider plugin, Plasma widget, and bridge.
- [ ] Generate checksums and release archives.
- [ ] Add environment verification, health checks, documentation, and release workflow.
- [ ] Verify clean installation, upgrade preservation, service startup, and uninstall behavior.
- [ ] **Phase 7 complete**

### Phase 8 — Release readiness

**Model:** GPT-5.6 Sol — High  
**Status:** pending

- [ ] Verify licenses, versions, current Cider compatibility, and supported Plasma 6 compatibility.
- [ ] Remove development-only behavior and complete architecture, privacy, security, and dependency reviews.
- [ ] Run the full acceptance suite from a clean checkout and test final artifacts.
- [ ] Prepare screenshots, release notes, checksums, known limitations, and `v0.1.0`.
- [ ] **Phase 8 complete**

---

## Phase workflow

- Implement exactly one phase per user request: the first phase not marked complete.
- Work from the first actionable unchecked task.
- A targeted fix within the current phase may become the active subtask, but it must not hide earlier incomplete phase criteria.
- Do not implement, scaffold, or partially start later phases.
- Run applicable checks, fix phase-related failures, and update documentation.
- Mark a phase complete only when all required items are checked and evidence is recorded.
- End with the required handoff report and stop.

---

## Resume protocol for a new chat or agent

At the beginning of every new thread:

1. Read the source-of-truth files in order.
2. Run:

   ```bash
   git status --short --branch
   git log -5 --oneline --decorate
   ```

3. Inspect uncommitted changes without modifying them.
4. Check for open PRs and branch-specific checkpoint documents.
5. Reconcile the persistent checkpoint, checklist, journals, Git history, code, and tests.
6. Run the smallest relevant validation when completion state is uncertain.
7. Continue from the recorded next exact action.
8. Do not repeat completed work because the conversation is new.
9. Never reset, clean, stash, amend, rebase, force-push, or discard work without explicit instruction.

Continuation prompt:

```text
Continue the KLyric implementation. Read AGENTS.md, docs/phase-status.md,
any active supplemental checkpoint, KLYRIC_IMPLEMENTATION_PLAN.md, Git status,
recent commits, and open PRs. Reconcile the checkpoint with the repository,
continue from the next exact action, validate the work, update status records,
provide the required handoff report, and stop before the next phase.
```

---

## Development rules

- Use English for code, documentation, commits, identifiers, and source strings.
- Use Bun. Do not add npm, pnpm, or Yarn lockfiles.
- Keep TypeScript strict. Avoid `any`; validate cross-process and Cider-derived data at runtime.
- Keep undocumented Cider access inside `apps/cider-plugin/src/cider/`.
- Access lyrics only through `LyricsSource`.
- Keep the bridge loopback-only, authenticate writes, and never persist lyrics or log tokens.
- Keep the protocol versioned and backward-compatible within a major version.
- Use Plasma 6 QML APIs, Qt Quick Layout hints, theme-aware components, accessibility properties, and `i18n()`.
- In horizontal panels, show lyric or fallback text directly without requiring the popup.
- Constrain panel presentation by pixel width, not character count; preserve complete lyric text in state and expose it through tooltip and popup.
- Keep vertical panels icon-only by default unless text is explicitly enabled.
- Prefer small modules, explicit cleanup, and event-driven updates over frequent polling.
- Add or update tests for behavior changes and Cider compatibility shapes.
- Avoid dependencies when platform or existing workspace APIs are sufficient.
- Do not mix unrelated phases in one commit.

---

## Required checks

Run before completing a phase or merging a behavior fix:

```bash
bun run format
bun run lint
bun run typecheck
bun run test
bun run build
```

For widget changes, also run:

```bash
qmllint \
  apps/plasmoid/package/contents/ui/**/*.qml \
  apps/plasmoid/package/contents/config/*.qml \
  apps/plasmoid/package/contents/ui/js/*.js
```

When available, run:

```bash
plasmoidviewer -a apps/plasmoid/package -l topedge -f horizontal
```

Panel-sizing fixes must also be validated in an actual Plasma panel. Follow `docs/plasma-panel-layout.md` and record any unavailable manual validation explicitly.

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

---

## Required handoff report

End every implementation session with:

```text
PHASE <number> — <name>: IN PROGRESS | COMPLETE | BLOCKED

Checkpoint:
- Current task: ...
- Active subtask: ...
- Last completed task: ...
- Last verified commit: ...
- Open PR: ...
- Next exact action: ...

Implemented:
- ...

Validation:
- <command>: PASS | FAIL | NOT RUN

Status files updated:
- AGENTS.md: yes | no
- docs/phase-status.md or supplemental checkpoint: yes | no

Known limitations or blockers:
- ...

Next phase or continuation:
- Current/next phase: ...
- Recommended model: ...
- Reasoning: ...
- Action: ...
```

When a phase remains in progress, direct the next agent to the first unchecked requirement in that phase while preserving any active targeted subtask.