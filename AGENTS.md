# AGENTS.md

## Project

KLyric displays Cider’s active synchronized lyric line in a KDE Plasma 6 widget.

For live playback validation, use the scenario notes in `docs/integration-testing.md`.

## Read first

Before changing code, read:

1. `docs/klyric-operating-guide.md`
2. `docs/klyric-live-checkpoint.md`
3. The current phase section in `docs/phase-status.md`
4. The current phase section in `KLYRIC_IMPLEMENTATION_PLAN.md`
5. `git status` and commits since the last verified implementation commit

## What lives where

- Operating rules, resume protocol, model routing, and handoff template: `docs/klyric-operating-guide.md`
- Current phase snapshot: `docs/klyric-live-checkpoint.md`
- Detailed runtime evidence and live journal: `docs/phase-status.md`
- Temporary v0.1.1 maintenance history: `docs/v0.1.1-IMPLEMENTATION-HANDOFF.md`

When those sources disagree with Git, inspect the implementation and tests, reconcile the records, and update the live journal.
