# Current development state

## Branch
- Branch: `v0.1.1`
- Status: `in_progress`
- Lifecycle: temporary; remove or reduce after the v0.1.1 release work is complete
- Last verified implementation commit: `abdbd72`
- Publication gate: do not push, tag, or publish without explicit authorization

## Current objective
Complete the v0.1.1 UX and distribution update, including release-based installation, the management CLI, polished playback states, and the compact lyric popup.

## Current task
Runtime-verify the remaining popup row configurations, alignment modes, tooltip, and requested playback states, then review the final diff.

## Next action
With synchronized lyrics playing and Cider's Lyrics view open, disable **Show previous lyric line**, apply the setting, reopen the popup after reconnect, and verify the current/next two-row layout.

## Known blockers
- None

## Relevant documentation
Read only the document related to the current task:
- Architecture: `docs/architecture.md`
- Bridge: `docs/bridge.md`
- Protocol: `docs/protocol.md`
- Cider extraction: `docs/cider-research.md`
- Installation and packaging: `docs/installation.md`
- Runtime validation: `docs/testing.md`

## Resume procedure
1. Inspect `git status`.
2. Inspect commits after the last verified commit.
3. Inspect the current diff.
4. Read only task-specific documentation.
5. Continue from the next action above.
