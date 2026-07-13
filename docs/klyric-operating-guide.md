# KLyric operating guide

## Purpose

KLyric displays Cider’s active synchronized lyric line in a KDE Plasma 6 widget.

For live playback validation, use the scenario notes in `docs/integration-testing.md`.

## Source of truth

Before changing code, read:

1. `docs/phase-status.md`
2. `KLYRIC_IMPLEMENTATION_PLAN.md`
3. `git status` and commits since the last verified implementation commit

Read either complete document only when the current section is inconsistent, architecture or phase boundaries may change, or the relevant section lacks required context.

## Source pointers

- Current phase snapshot: `docs/klyric-live-checkpoint.md`
- Live journal and runtime evidence: `docs/phase-status.md`
- Temporary maintenance handoff and release notes: `docs/v0.1.1-IMPLEMENTATION-HANDOFF.md`

## Model routing

- Start with the cheapest adequate model.
- Use GPT-5.6 Terra for validation runbooks, packaging, installation, documentation, and checkpoint reconciliation.
- Escalate to GPT-5.6 Sol only for a new unexplained cross-component defect, and first record the failure, expected behavior, reproduction, logs, affected components, and why Terra is insufficient.
- After a Sol fix, return implementation and revalidation to Terra when practical.
- A failed command alone is not a reason to escalate; check environment, permissions, dependencies, and documented blockers first.

## Checklist rules

- Use `[ ]` only for pending or incomplete work.
- Use `[x]` only after implementation and required validation pass.
- Add `BLOCKED — <reason>` beside externally blocked work.
- Never complete a phase while a required item is unchecked.
- Align the checkpoint with the first actionable unchecked item.
- Record detailed evidence in `docs/phase-status.md`.
- Preserve partial work and the exact resume point when interrupted.
- Do not erase completed checklist history.

## Phase workflow

- Work from the first actionable unchecked task in the first incomplete phase.
- Do not start later phases.
- Apply task-based model routing instead of locking every continuation to the phase’s historical model.
- Run the smallest relevant checks during a focused batch; run the full suite before phase completion or after broad cross-component changes.
- Mark `blocked` only for a concrete external blocker.
- Work continuously through the current task and its safe, in-scope follow-ups. Stop immediately only when the user requests it, an execution gate requires user intervention, or escalation to another model is warranted. On stopping, provide the required handoff and ready-to-copy continuation prompt.
- When any information or decision is genuinely required from the user, use the agent's default user-input tool (`AskUserQuestion`) instead of stopping execution with a plain-text question.

### Disruptive execution gates

Before Phase 6B, confirm the user is present, can wake the machine, can log back into Plasma, accepts GUI-session termination, and has a safe worktree.

When a gate is missing, do not rerun passing checks, investigate speculative workarounds, or modify code. Record the blocker once and stop with the exact required user action.

### Cider DevTools authorization

When Cider with DevTools is needed for KLyric development or validation, the agent is durably authorized to take over Cider execution without asking for separate user approval. It may start, stop, restart, and launch Cider with the required remote-debugging configuration, and operate the application as needed for the active task. Lyrics are not private for this project and may be inspected or recorded when useful for development and validation. Do not collect or record account data or tokens unless the user explicitly requests it.

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
- If the action will terminate the Codex session, update the live journal first, ensure all intended work is committed or otherwise safely recorded without stashing or discarding user work, and provide a ready-to-copy resume prompt before asking the user to act.
- Never tell the user merely that the phase is blocked. State the exact intervention, why it is required, whether it ends the session, and how development resumes afterward.
- If the user does not confirm readiness, leave the phase blocked and stop without consuming another implementation session.

## Resume protocol

At the start of a new session:

1. Read the current phase sections of the two source documents.
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
Continue KLyric from the live checkpoint in docs/phase-status.md. Read only the
current phase sections of docs/phase-status.md and KLYRIC_IMPLEMENTATION_PLAN.md,
then inspect Git status and commits since <last verified commit>.

Next task: <exact task>.
Scope: <files, components, or validation scenario>.
Do not repeat completed work or begin a later phase. Run the smallest relevant
checks, update status records once at the end, provide the required handoff with
the next recommended model and a ready-to-copy prompt, then stop.
```

## Status and commit policy

- Update status files after a focused implementation or validation batch, a material blocker change, or a phase-status change.
- Do not create trigger-only, synchronization-only, empty, or temporary-workflow commits. Prefer one implementation commit and at most one meaningful documentation commit per focused session.
- Use Conventional Commits and never commit secrets, tokens, local configuration, complete lyric data, generated output, or unrelated changes.

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

- Start with the cheapest adequate model.
- Use GPT-5.6 Terra for validation runbooks, packaging, installation, documentation, and checkpoint reconciliation.
- Escalate to GPT-5.6 Sol only for a new unexplained cross-component defect, and first record the failure, expected behavior, reproduction, logs, affected components, and why Terra is insufficient.
- After a Sol fix, return implementation and revalidation to Terra when practical.
- A failed command alone is not a reason to escalate; check environment, permissions, dependencies, and documented blockers first.

## Checklist rules

- Use `[ ]` only for pending or incomplete work.
- Use `[x]` only after implementation and required validation pass.
- Add `BLOCKED — <reason>` beside externally blocked work.
- Never complete a phase while a required item is unchecked.
- Align the checkpoint with the first actionable unchecked item.
- Record detailed evidence in `docs/phase-status.md`.
- Preserve partial work and the exact resume point when interrupted.
- Do not erase completed checklist history.

## Phase workflow

- Work from the first actionable unchecked task in the first incomplete phase.
- Do not start later phases.
- Apply task-based model routing instead of locking every continuation to the phase’s historical model.
- Run the smallest relevant checks during a focused batch; run the full suite before phase completion or after broad cross-component changes.
- Mark `blocked` only for a concrete external blocker.
- Work continuously through the current task and its safe, in-scope follow-ups. Stop immediately only when the user requests it, an execution gate requires user intervention, or escalation to another model is warranted. On stopping, provide the required handoff and ready-to-copy continuation prompt.
- When any information or decision is genuinely required from the user, use the agent's default user-input tool (`AskUserQuestion`) instead of stopping execution with a plain-text question.

### Disruptive execution gates

Before Phase 6B, confirm the user is present, can wake the machine, can log back into Plasma, accepts GUI-session termination, and has a safe worktree.

When a gate is missing, do not rerun passing checks, investigate speculative workarounds, or modify code. Record the blocker once and stop with the exact required user action.

### Cider DevTools authorization

When Cider with DevTools is needed for KLyric development or validation, the agent is durably authorized to take over Cider execution without asking for separate user approval. It may start, stop, restart, and launch Cider with the required remote-debugging configuration, and operate the application as needed for the active task. Lyrics are not private for this project and may be inspected or recorded when useful for development and validation. Do not collect or record account data or tokens unless the user explicitly requests it.

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
- If the action will terminate the Codex session, update the live journal first, ensure all intended work is committed or otherwise safely recorded without stashing or discarding user work, and provide a ready-to-copy resume prompt before asking the user to act.
- Never tell the user merely that the phase is blocked. State the exact intervention, why it is required, whether it ends the session, and how development resumes afterward.
- If the user does not confirm readiness, leave the phase blocked and stop without consuming another implementation session.

## Resume protocol

At the start of a new session:

1. Read the current phase sections of the source documents.
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
Continue KLyric from the live checkpoint in docs/phase-status.md. Read only the
current phase sections of docs/phase-status.md and KLYRIC_IMPLEMENTATION_PLAN.md,
then inspect Git status and commits since <last verified commit>.

Next task: <exact task>.
Scope: <files, components, or validation scenario>.
Do not repeat completed work or begin a later phase. Run the smallest relevant
checks, update status records once at the end, provide the required handoff with
the next recommended model and a ready-to-copy prompt, then stop.
```

## Status and commit policy

- Update status files after a focused implementation or validation batch, a material blocker change, or a phase-status change.
- Do not create trigger-only, synchronization-only, empty, or temporary-workflow commits. Prefer one implementation commit and at most one meaningful documentation commit per focused session.
- Use Conventional Commits and never commit secrets, tokens, local configuration, complete lyric data, generated output, or unrelated changes.

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
