# Phase 6 horizontal-panel lyric layout checkpoint

## Status

- **Phase:** 6 — Integration hardening
- **Task:** 6.8 — Themes, panel orientations, font scaling, DPI scaling, RTL, and long lines
- **Branch:** `agent/fix-compact-lyrics`
- **Pull request:** Draft PR #1 — `fix(plasmoid): show lyric text in horizontal panels`
- **Status:** implementation complete; automated and real-panel validation pending

## Problem

KLyric's compact representation is intended to show the current lyric directly in a horizontal Plasma taskbar. In a real panel, the widget could collapse to an icon-sized square even though the compact QML contained a lyric label.

The original layout relied on `implicitWidth`. That value depended on a `Row` that filled the compact root, while the lyric label width depended on the width assigned to the same row. Plasma could resolve this circular sizing relationship before the label received usable width, leaving only the music icon visible.

This explains why `plasmawindowed` validation could appear correct while the actual taskbar remained icon-only.

## Implemented fix

Commit `46b09da`:

- imports `QtQuick.Layouts`;
- adds explicit `Layout.minimumWidth`, `Layout.preferredWidth`, and `Layout.maximumWidth` hints;
- uses a stable preferred viewport based on the configured maximum width;
- replaces `Row` with `RowLayout`;
- gives the lyric label `Layout.fillWidth: true` and `Layout.minimumWidth: 0`;
- preserves icon-only sizing when text is intentionally disabled;
- keeps complete lyric text in state while applying right-side elision in the panel.

Commit `9281dc1` adds `docs/plasma-panel-layout.md`, which defines the layout contract, long-line and character-count policy, validation procedure, and regression criteria.

## Current evidence

Static inspection confirms that the compact representation now follows Plasma's expected Qt Quick Layout sizing pattern. The implementation plan already requires lyric text to appear directly in horizontal panels and therefore does not require a requirements change.

The fix remains unverified in the user's active horizontal panel. Task 6.8 and Phase 6 must remain incomplete until the real-panel checks pass.

## Required validation

Run branch-wide checks:

```bash
bun run format
bun run lint
bun run typecheck
bun run test
bun run build

qmllint \
  apps/plasmoid/package/contents/ui/**/*.qml \
  apps/plasmoid/package/contents/config/*.qml \
  apps/plasmoid/package/contents/ui/js/*.js
```

Install or upgrade the branch applet:

```bash
kpackagetool6 \
  --type Plasma/Applet \
  --upgrade apps/plasmoid/package
```

Then validate in a real horizontal panel:

1. Restart Plasma or remove and re-add KLyric if the old QML instance is cached.
2. Add KLyric directly to the panel, not inside the system tray.
3. Confirm fallback text appears while the bridge or Cider is unavailable.
4. Start the bridge and Cider, keep Cider's Lyrics view open, and play a synchronized track.
5. Confirm the active lyric appears directly in the taskbar without clicking the widget.
6. Test short and long lyric lines.
7. Confirm long lines elide within the configured width.
8. Disable the music icon and confirm the lyric remains visible.
9. Change minimum and maximum width settings.
10. Verify the tooltip and popup retain the complete lyric.
11. Verify a vertical panel remains icon-only unless vertical text is enabled.
12. Record Plasma version, orientation, scale, theme, configured widths, and result in the Phase 6 integration matrix.

## Next exact action

Validate draft PR #1 in the active horizontal Plasma panel using `docs/plasma-panel-layout.md`. Record the result, then continue the remaining task 6.1, 6.6, 6.7, and 6.8 scenario rows.

## Merge handling

After PR #1 is validated and merged:

1. copy the evidence from this checkpoint into `docs/phase-status.md`;
2. update `AGENTS.md` to the merged commit SHA and next unresolved Phase 6 task;
3. remove this supplemental checkpoint when its information has been incorporated into the main journal;
4. keep task 6.8 unchecked if any required theme, orientation, scaling, RTL, font, or long-line checks remain.