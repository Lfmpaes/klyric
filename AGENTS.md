# AGENTS.md

## Project

KLyric displays Cider’s active synchronized lyric line in a KDE Plasma 6 widget.

## Source of truth

Before changing code, read:

1. `AGENTS.md`.
2. Only the current phase section in `docs/phase-status.md`.
3. Only the current phase section in `KLYRIC_IMPLEMENTATION_PLAN.md`.
4. `git status` and commits since the last verified implementation commit.

Read either complete document only when the checkpoint is inconsistent, architecture or phase boundaries may change, or the relevant section lacks required context.

`AGENTS.md` is the operational checkpoint. `docs/phase-status.md` is the detailed journal. When they disagree with Git, inspect the implementation and tests, reconcile the records, and document the discrepancy.

---

## Persistent checkpoint

Update this section once after a meaningful implementation or validation batch, when a material blocker changes, or when the phase status changes.

- **Current phase:** Phase 8 — Release readiness
- **Phase status:** `in_progress`
- **Current work mode:** Phase 8 release blocked pending privacy-safe live track-change acceptance
- **Current task:** Run the privacy-safe live DOM-to-widget track-change scenario with the installed source-generation fix
- **Current validation focus:** Confirm the restarted DOM source's initial snapshot reaches the plugin, bridge, protocol-valid widget state, and rendered current line
- **Recommended next model:** GPT-5.6 Terra
- **Reasoning:** Medium
- **Escalation:** GPT-5.6 Sol High only if the source-generation regression passes but live acceptance loses lyric state at an unexplained boundary
- **Last completed task:** Implemented and regression-tested source-generation ownership for lyric callbacks
- **Last verified implementation commit:** `275a341` — retry delayed lyric discovery (all Phase 8 discovery and ownership changes remain uncommitted)
- **Open pull request:** None — PR #1 merged into `main` at `c7d43ab`.
- **Last validation:** Focused plugin and lyrics tests passed (28 pass, 0 fail). Changed-file Biome format/lint with `--config-path biome.json`, full `typecheck`, `build`, and `git diff --check` passed. Root `bun run format`/`bun run lint` remain unavailable because pre-existing nested `.claude/worktrees/*/biome.json` root configurations conflict with the repository configuration. The local plugin installation succeeded after stopping the active user bridge service to avoid `ETXTBSY`, and the service is active. Cider and DevTools port 9222 were unavailable, so the required live track-change scenario was NOT RUN. Bridge health safely reported `publisherSeen: false`, `stateAvailable: false`, and one widget client; no lyric text, metadata, account data, or tokens were collected.
- **Known blockers:** RELEASE BLOCKER — automated source-generation ownership now accepts the restarted DOM source's untagged synchronous initial snapshot and rejects superseded/teardown callbacks, but privacy-safe end-to-end track-change acceptance has not run because Cider and DevTools were unavailable. The broad DOM selector's filtered-index inconsistency remains confirmed but out of scope; do not commit release collateral or create `v0.1.0`.
- **Execution gate:** Do not tag or release until a privacy-safe live track-change scenario proves source snapshot emission/acceptance, bridge state availability, protocol-valid widget state, and rendered current-line presence.
- **Next exact action:** Start Cider with DevTools available, ensure the installed KLyric plugin and bridge are active, perform one synchronized track change with Lyrics open, and collect only the approved redacted structural/protocol flags.
- **Last updated:** 2026-07-12 — source-generation ownership fix and focused regression validation completed; live acceptance is still required.

Allowed statuses: `pending`, `in_progress`, `blocked`, `complete`.

---

## Model selection

The user manually selects a model and prompts Codex again after every session. Every handoff must therefore recommend the model for the **next exact action** and include a ready-to-copy continuation prompt.

| Model | Use for |
|---|---|
| GPT-5.6 Luna — Low/Medium | Small documentation, checklist, Git, formatting, or exact mechanical edits |
| GPT-5.6 Terra — Medium | Validation runbooks, packaging, installation, documentation, checkpoint reconciliation, narrow routine debugging |
| GPT-5.6 Terra — High | Known implementation fixes, regression tests, substantial work inside an established architecture |
| GPT-5.6 Sol — High | Unexplained cross-component defects, race/lifecycle/recovery failures, architecture or security decisions |

Rules:

- Start with the cheapest adequate model.
- Do not use Sol for established commands, manual validation, installation, desktop restoration, status updates, or routine Git work.
- Before escalating to Sol, record the failure, expected behavior, reproduction, relevant redacted logs, affected components, and why the issue is not a known-scope Terra task.
- After Sol identifies the root cause and fix, return implementation and revalidation to Terra when practical.
- A failed command alone is not a reason to escalate; first check environment, permissions, dependencies, and documented blockers.

---

## Checklist rules

- Use `[ ]` only for pending or incomplete work.
- Use `[x]` only after implementation and required validation pass.
- Add `BLOCKED — <reason>` beside externally blocked work.
- Never complete a phase while a required item is unchecked.
- Align the checkpoint with the first actionable unchecked item.
- Record detailed evidence in `docs/phase-status.md`.
- Preserve partial work and the exact resume point when interrupted.
- Do not erase completed checklist history.

---

## Master implementation checklist

### Phase 0 — Repository bootstrap

**Historical model:** GPT-5.6 Terra — Medium  
**Scope:** Foundations only.

- [x] **0.1** Create the Bun workspace and root `package.json`.
- [x] **0.2** Add `bun.lock`, strict TypeScript configuration, Biome, EditorConfig, and Git ignore rules.
- [x] **0.3** Import and rename the official Cider plugin template.
- [x] **0.4** Create skeleton packages for the bridge, plasmoid, protocol, and test utilities.
- [x] **0.5** Add root development, build, lint, typecheck, test, package, install, and uninstall scripts.
- [x] **0.6** Add CI and release workflow skeletons.
- [x] **0.7** Create the initial documentation and phase journal.
- [x] **0.8** Verify the empty bridge, plasmoid, and renamed Cider plugin load.
- [x] **0.9** Run and record all checks available at this phase.
- [x] **Phase 0 complete**.

### Phase 1 — Lyric extraction spike

**Historical model:** GPT-5.6 Sol — High  
**Scope:** Prove and document lyric extraction only.

- [x] **1.1** Add safe, redacted Cider capability inspection.
- [x] **1.2** Inspect playback, line changes, pause/resume, seeking, track changes, and lyric-view behavior.
- [x] **1.3** Identify lyric data, active line/index, timestamps, playback position, and subscription mechanisms.
- [x] **1.4** Implement the `LyricsSource` interface and source factory.
- [x] **1.5** Implement a public-API adapter placeholder.
- [x] **1.6** Implement and test the internal-store adapter.
- [x] **1.7** Implement and test the timeline adapter.
- [x] **1.8** Implement and test the DOM fallback.
- [x] **1.9** Confirm minimized and closed lyric-view behavior.
- [x] **1.10** Add sanitized fixtures.
- [x] **1.11** Document findings, limitations, and adapter priority.
- [x] **1.12** Run extraction-specific checks.
- [x] **Phase 1 complete or blocked**.

### Phase 2 — Protocol package

**Historical model:** GPT-5.6 Terra — High

- [x] **2.1** Define protocol constants and enums.
- [x] **2.2** Define state and WebSocket types.
- [x] **2.3** Implement runtime schemas and normalization.
- [x] **2.4** Enforce payload, timestamp, sequence, session, and text rules.
- [x] **2.5** Add valid and invalid fixtures.
- [x] **2.6** Add browser-safe and Bun-safe exports.
- [x] **2.7** Add protocol unit tests.
- [x] **2.8** Document compatibility and versioning.
- [x] **Phase 2 complete**.

### Phase 3 — Bridge MVP

**Historical model:** GPT-5.6 Terra — High

- [x] **3.1** Implement configuration and loopback-only validation.
- [x] **3.2** Implement publisher-token lifecycle.
- [x] **3.3** Implement authenticated state publication and clearing.
- [x] **3.4** Implement state and health reads.
- [x] **3.5** Implement state storage, sequencing, and duplicate suppression.
- [x] **3.6** Implement WebSocket lifecycle and client limits.
- [x] **3.7** Implement expiry and heartbeat behavior.
- [x] **3.8** Implement rate limits, payload limits, and safe logging.
- [x] **3.9** Implement the CLI and graceful shutdown.
- [x] **3.10** Add bridge unit and process integration tests.
- [x] **3.11** Verify the mock publisher/client lifecycle.
- [x] **Phase 3 complete**.

### Phase 4 — Cider plugin MVP

**Historical model:** GPT-5.6 Terra — High

- [x] **4.1** Implement deterministic lifecycle cleanup.
- [x] **4.2** Implement playback metadata and state observation.
- [x] **4.3** Integrate lyric adapters and fallback.
- [x] **4.4** Implement the plugin state machine.
- [x] **4.5** Handle track change, seek, pause, resume, stop, and stale lines.
- [x] **4.6** Implement the bridge client.
- [x] **4.7** Implement publication ordering, deduplication, heartbeat, retry, and backoff.
- [x] **4.8** Add settings and connection testing.
- [x] **4.9** Add redacted diagnostics.
- [x] **4.10** Add plugin tests.
- [x] **4.11** Verify reload cleanup and bridge downtime behavior.
- [x] **Phase 4 complete**.

### Phase 5 — Plasma widget MVP

**Historical model:** GPT-5.6 Terra — High

- [x] **5.1** Create valid Plasma 6 package structure.
- [x] **5.2** Implement the WebSocket client and handshake.
- [x] **5.3** Implement validation, cached state, ping/pong, and reconnection.
- [x] **5.4** Implement the horizontal compact representation.
- [x] **5.5** Implement safe vertical-panel behavior.
- [x] **5.6** Implement the popup.
- [x] **5.7** Implement fallback display states.
- [x] **5.8** Implement settings.
- [x] **5.9** Add localization, accessibility, themes, high-DPI, RTL, and Unicode handling.
- [x] **5.10** Add optional transitions.
- [x] **5.11** Run QML and widget checks.
- [x] **Phase 5 complete**.

### Phase 6 — Integration hardening

**Default continuation model:** GPT-5.6 Terra — Medium  
**Escalation:** GPT-5.6 Sol — High only for an unexplained cross-component defect

#### Phase 6A — Automated hardening: complete

- [x] **6.2** Measure latency and meet the 250 ms target.
- [x] **6.3** Harden adapter fallback and compatibility detection.
- [x] **6.4** Verify minimized and closed lyric-view behavior.
- [x] **6.5** Verify playback edge cases.
- [x] **6.8** Test themes, orientations, font/DPI scaling, RTL, and long lines.
- [x] **6.9** Audit security and persistence behavior.
- [x] **6.10** Fix leaks, stale timers, queues, and recovery defects.
- [x] **6.11** Update compatibility and test documentation.

#### Phase 6B — Manual desktop acceptance: complete

- [x] **6.1** Complete the end-to-end scenario matrix.
- [x] **6.6** Verify all restart scenarios.
- [x] **6.7** Verify suspend/resume and multiple widgets.
- [x] **Phase 6 complete**.

### Phase 7 — Packaging and installation

**Default model:** GPT-5.6 Terra — Medium

- [x] **7.1** Finalize the systemd user service.
- [x] **7.2** Implement install, upgrade, uninstall, and `--purge`.
- [x] **7.3** Package the Cider plugin.
- [x] **7.4** Package the Plasma widget.
- [x] **7.5** Build the bridge release artifact.
- [x] **7.6** Generate checksums and the combined archive.
- [x] **7.7** Add environment and post-install checks.
- [x] **7.8** Add installation and troubleshooting documentation.
- [x] **7.9** Add and test the release workflow.
- [x] **7.10** Add the optional Arch `PKGBUILD` after manual packaging works.
- [x] **7.11** Verify clean install, upgrade, startup, and uninstall.
- [x] **Phase 7 complete**.

### Phase 8 — Release readiness

**Default model:** GPT-5.6 Terra — High  
**Use Sol High for:** 8.3, 8.4, 8.6, or an unexplained final acceptance failure

- [x] **8.1** Verify licenses and bundled assets.
- [x] **8.2** Finalize versions.
- [x] **8.3** Verify current Cider compatibility.
- [x] **8.4** Verify current Plasma 6 compatibility.
- [x] **8.5** Remove or disable development-only behavior.
- [x] **8.6** Complete architecture, privacy, security, and dependency reviews.
- [x] **8.7** Run CI and acceptance tests from a clean checkout.
- [x] **8.8** Test final artifacts on a clean target.
- [ ] **8.9** Prepare screenshots, release notes, checksums, and limitations. **BLOCKED — release-blocking lyric display failure requires correction and renewed acceptance evidence before collateral can be finalized.**
- [ ] **8.10** Tag and prepare `v0.1.0` after all criteria pass.
- [ ] **Phase 8 complete** — Do not begin future-work features.

---

## Phase workflow

- Work from the first actionable unchecked task in the first incomplete phase.
- Do not start later phases.
- Apply task-based model routing instead of locking every continuation to the phase’s historical model.
- Run the smallest relevant checks during a focused batch; run the full suite before phase completion or after broad cross-component changes.
- Mark `blocked` only for a concrete external blocker.
- End with the handoff report and stop.

### Disruptive execution gates

Before Phase 6B, confirm the user is present, can wake the machine, can log back into Plasma, accepts GUI-session termination, and has a safe worktree.

When a gate is missing, do not rerun passing checks, investigate speculative workarounds, or modify code. Record the blocker once and stop with the exact required user action.

### Cider DevTools authorization

When Cider with DevTools is needed for KLyric development or validation, the agent
is durably authorized to take over Cider execution without asking for separate
user approval. It may start, stop, restart, and launch Cider with the required
remote-debugging configuration, and operate the application as needed for the
active task. Lyrics are not private for this project and may be inspected or
recorded when useful for development and validation. Do not collect or record
account data or tokens unless the user explicitly requests it.

### User intervention protocol

A blocked or user-gated task must never rely on the user inferring what to do.

- Complete every safe, non-disruptive preparation step first.
- Never suspend, log out, reboot, terminate Plasma, change display configuration, or perform another disruptive desktop action without explicit approval in the current conversation.
- Request only one user intervention at a time.
- Immediately before the intervention, output this structure:

  ```text
  USER ACTION REQUIRED

  Task: <scenario being validated>
  Why I need you: <why the agent cannot safely or autonomously complete it>
  Before you act: <confirmation that work is saved and the environment is ready>
  Please do: <one exact action, including menu path or command when useful>
  Expected result: <what should happen>
  Afterward: <exactly what the user should reply or run>
  ```

- Ask a direct confirmation question before the action, such as: `The environment is prepared. Are you ready to perform the suspend test now?`
- Do not mark the task complete until post-action evidence is collected.
- If the action is expected to preserve the Codex session, tell the user exactly what to reply after returning, then continue verification in that session.
- If the action will terminate the Codex session, update the persistent checkpoint and detailed journal first, ensure all intended work is committed or otherwise safely recorded without stashing or discarding user work, and provide a ready-to-copy resume prompt before asking the user to act.
- Never tell the user merely that the phase is blocked. State the exact intervention, why it is required, whether it ends the session, and how development resumes afterward.
- If the user does not confirm readiness, leave the phase blocked and stop without consuming another implementation session.

---

## Resume protocol

At the start of a new session:

1. Read `AGENTS.md` and only the current phase sections of the two source documents.
2. Run:

   ```bash
   git status --short --branch
   git log --oneline --decorate <last-verified-commit>..HEAD
   ```

   Use `git log -5 --oneline --decorate` when there are no later commits.

3. Inspect uncommitted changes without modifying them.
4. Reconcile only material inconsistencies.
5. Run the smallest relevant validation when prior state is uncertain.
6. Continue from the first actionable unchecked task.
7. Never reset, clean, stash, amend, or discard work without explicit instruction.

Continuation prompt template:

```text
Continue KLyric from the persistent checkpoint in AGENTS.md. Read only the
current phase sections of docs/phase-status.md and KLYRIC_IMPLEMENTATION_PLAN.md,
then inspect Git status and commits since <last verified commit>.

Next task: <exact task>.
Scope: <files, components, or validation scenario>.
Do not repeat completed work or begin a later phase. Run the smallest relevant
checks, update status records once at the end, provide the required handoff with
the next recommended model and a ready-to-copy prompt, then stop.
```

---

## Phase defaults

Task-based routing takes precedence.

| Phase | Default |
|---|---|
| 6B — Manual desktop acceptance | Terra Medium; Sol High only after a structured unexplained failure |
| 7 — Packaging and installation | Terra Medium; Terra High for substantial fixes |
| 8 — Release readiness | Terra High; Sol High for compatibility, architecture, privacy, security, or unexplained failures |

Do not use Max or Ultra by default. Tell the user to keep the current model when the next task uses the same configuration.

---

## Status and commit policy

Update status files after a focused implementation or validation batch, a material blocker change, or a phase-status change.

Do not create trigger-only, synchronization-only, empty, or temporary-workflow commits. Prefer one implementation commit and at most one meaningful documentation commit per focused session.

Use Conventional Commits and never commit secrets, tokens, local configuration, complete lyric data, generated output, or unrelated changes.

---

## Development rules

- Use English for code, documentation, commits, identifiers, and source strings.
- Use Bun only.
- Keep TypeScript strict and validate external data at runtime.
- Keep undocumented Cider access inside `apps/cider-plugin/src/cider/`.
- Access lyrics only through `LyricsSource`.
- Keep the bridge loopback-only, authenticate writes, and never persist lyrics or log tokens.
- Keep the protocol versioned and backward-compatible within a major version.
- Use Plasma 6 APIs, theme-aware components, accessibility, and `i18n()`.
- Prefer small modules, explicit cleanup, and event-driven updates.
- Add or update tests for every behavior change.
- Avoid unnecessary dependencies.
- Do not mix unrelated phases in one commit.

---

## Required checks

Use the smallest checks covering the current change. Before completing a phase or after broad cross-component changes, run:

```bash
bun run format
bun run lint
bun run typecheck
bun run test
bun run build
```

For widget behavior changes, run the relevant QML checks:

```bash
qmllint apps/plasmoid/package/contents/ui/**/*.qml
plasmoidviewer -a apps/plasmoid/package -l topedge -f horizontal
```

Do not rerun the full suite for documentation-only changes unless implementation state is uncertain. Record unavailable or gated checks as `NOT RUN` with the exact reason.

---

## Required handoff report

End every implementation session with:

```text
PHASE <number> — <name>: IN PROGRESS | COMPLETE | BLOCKED

Checkpoint:
- Current task: <task>
- Last completed task: <task>
- Last verified implementation commit: <SHA or "uncommitted">
- Next exact action: <one action>

Implemented:
- ...

Validation:
- <check>: PASS | FAIL | NOT RUN

Status files updated:
- AGENTS.md: yes | no, not required
- docs/phase-status.md: yes | no, not required

Known limitations or blockers:
- ...

Next model selection:
- Recommended model: GPT-5.6 <Luna | Terra | Sol>
- Reasoning: <Low | Medium | High>
- Why: <one sentence tied to the next action>
- Escalate to: <model or none>
- Escalation condition: <specific condition or none>

Ready-to-copy continuation prompt:
<complete prompt for the next exact task, required context, validation, status
update, handoff, and stop condition>
```

When blocked, do not recommend another session until the execution gate is satisfied unless the user explicitly requests separate permitted work.

### Current Phase 6B prompt

Use GPT-5.6 Terra with Medium reasoning while the user is present:

```text
Continue KLyric Phase 6B from the persistent checkpoint in AGENTS.md. Follow the
User intervention protocol exactly. The user can wake the machine and log back
into Plasma, but do not initiate any disruptive action without explicit approval
in the current conversation.

Verify the worktree is safe without resetting, stashing, amending, or discarding
anything. Read only the Phase 6 sections of docs/phase-status.md and
KLYRIC_IMPLEMENTATION_PLAN.md, then inspect commits since f00ef43. Prepare the
bridge, applet, logs, and observations needed for the suspend/resume scenario.

When preparation is complete, stop and output a USER ACTION REQUIRED block asking
the user to perform one suspend/resume cycle. State exactly how to suspend, what
to expect, and ask the user to reply `resumed` after waking. Do not perform the
suspend without explicit permission. After the user returns, verify bridge and
applet reconnection and record the evidence.

Then prepare the Plasma logout/login scenario. Because logout will terminate the
active Codex and GUI session, update the persistent checkpoint and detailed
journal before asking the user to log out. Output a USER ACTION REQUIRED block
that explains the session will end and includes a complete ready-to-copy prompt
for the post-login Codex session. Do not log out on the user's behalf unless the
user explicitly commands it.

In the post-login session, verify applet 53 reconnects to the running bridge. If
a scenario fails, collect reproduction steps, redacted logs, affected components,
and expected versus observed behavior, then stop and recommend GPT-5.6 Sol High
for diagnosis. Do not attempt speculative fixes with Terra Medium.

If both scenarios pass, complete tasks 6.1, 6.6, 6.7 and Phase 6, update both
status files once, provide the required handoff recommending the appropriate
model for Phase 7, and stop before starting Phase 7.
```
