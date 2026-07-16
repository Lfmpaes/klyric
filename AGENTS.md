# AGENTS.md

## Project

KLyric displays Cider's active synchronized lyric line in a KDE Plasma 6 widget.
The Cider plugin publishes validated state to an authenticated loopback bridge,
and the Plasma widget renders that state without persisting lyric text.

## Repository map

- `apps/cider-plugin/`: Cider integration and lyric extraction
- `apps/bridge/`: authenticated loopback state service
- `apps/plasmoid/`: KDE Plasma 6 widget
- `packages/protocol/`: shared protocol types and validation
- `scripts/`: installation, release, and management tooling
- `packaging/`: systemd and distribution packaging
- `docs/`: scoped technical and operational documentation

## Commands

```bash
bun install
bun run format
bun run lint
bun run typecheck
bun run test
bun run build
```

Use Bun for workspace commands. Use the smallest relevant validation during
focused work. Run the full suite before completing a broad cross-component
change or release-critical phase.

## Before changing code

1. Read `docs/CURRENT.md` when it exists and describes active unfinished work.
2. Inspect `git status` and commits after its last verified commit.
3. Read only documentation related to the component being changed:
   - Architecture: `docs/architecture.md`
   - Bridge: `docs/bridge.md`
   - Protocol: `docs/protocol.md`
   - Cider extraction: `docs/cider-research.md`
   - Packaging or installation: `docs/installation.md`
   - Runtime validation: `docs/testing.md`

Do not read archived plans or completed release journals unless the task
specifically requires historical investigation.

## Development constraints

- Use English for code, documentation, identifiers, source strings, and commit messages.
- Keep TypeScript strict and validate external and cross-process data at runtime.
- Keep undocumented Cider access inside `apps/cider-plugin/src/cider/`.
- Access lyrics through the project's lyric-source abstraction.
- Keep the bridge loopback-only and authenticate every state write.
- Never persist complete lyrics or log lyric text, account data, or tokens.
- Keep protocol changes backward-compatible within a major version.
- Use Plasma 6 APIs, theme-aware components, accessibility, and `i18n()`.
- Prefer focused modules, explicit cleanup, event-driven updates, and no unnecessary dependencies.
- Add or update tests for behavior changes.

## Validation and definition of done

- Run focused tests and checks while iterating.
- Run `bun run format`, `bun run lint`, `bun run typecheck`, `bun run test`, and
  `bun run build` for broad or release-critical code changes.
- Run relevant QML checks and real Plasma validation for widget behavior or layout changes.
- Use `docs/testing.md` to determine required runtime scenarios.
- Record checks that cannot run with the exact reason.
- Inspect the complete diff and confirm no unrelated work changed before completion.
- Documentation-only changes normally require link checks and `git diff --check`,
  not the complete source suite, unless they change executable instructions or paths.

## User intervention

- Complete every safe, non-disruptive preparation step before requesting user action.
- Never suspend, log out, reboot, terminate Plasma, or change display configuration
  without explicit approval in the current conversation.
- Request one intervention at a time and state the exact action, expected result,
  whether it ends the session, and how work resumes.
- Cider may be started, stopped, restarted, or launched with remote debugging when
  required for development or validation. Do not inspect or record account data or tokens.

## Git and user-work safety

- Preserve unrelated modified, staged, and untracked user work.
- Never reset, clean, stash, amend, or discard work without explicit instruction.
- Do not commit generated output, secrets, tokens, local configuration, complete lyric data,
  or unrelated changes.
- Use Conventional Commits and keep commits focused when commit creation is authorized.
- Do not commit unless the user explicitly requests it.
- Do not push, tag, publish a release, or deploy without explicit authorization for
  the exact outward-facing action and target.
