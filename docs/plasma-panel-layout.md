# Plasma panel lyric layout

## Intended behavior

KLyric's compact representation is the primary lyric interface. In a horizontal
Plasma panel, the current lyric line must be visible directly in the taskbar;
opening the popup is optional and only provides track metadata and adjacent-line
context.

Expected behavior:

- horizontal panel: reserve a configurable text viewport and render the current
  lyric line;
- vertical panel: use icon-only mode by default, unless `verticalTextEnabled` is
  enabled;
- long lines: retain the complete lyric text in state, display it with
  right-side elision in the panel, and expose the full value through the
  tooltip and popup;
- lyric changes: update the panel text without resizing the panel for every
  line.

## Root cause of icon-only horizontal rendering

The original `CompactRepresentation.qml` exposed only `implicitWidth`. Its
width depended on `row.implicitWidth`, while the `Row` filled the compact root
and the lyric label width depended on the width assigned to that row. In a real
Plasma panel containment, that circular relationship could be resolved as an
icon-sized square before the label received usable width.

The music icon therefore remained visible while the lyric label was allocated
zero or negligible width. This could appear correct in `plasmawindowed`, which
does not reproduce every panel containment sizing decision.

## Layout contract

The compact representation must:

1. import `QtQuick.Layouts`;
2. provide `Layout.minimumWidth`, `Layout.preferredWidth`, and
   `Layout.maximumWidth` hints;
3. use a stable preferred text viewport based on `maximumWidth`;
4. use `RowLayout` rather than manually deriving child widths from a filling
   `Row`;
5. give the lyric label `Layout.fillWidth: true` and
   `Layout.minimumWidth: 0` so elision can operate correctly;
6. use `Text.PlainText`, `Text.ElideRight`, and the configured one- or two-line
   behavior;
7. collapse to an icon-sized width only when text is intentionally disabled.

The default maximum width is currently 360 px. Users can change it from the
widget settings. A range around 360–400 px is appropriate for a typical
horizontal taskbar, while the complete lyric line remains available in the
underlying protocol state.

## Character-count policy

Cider does not expose a documented fixed maximum character count for a lyric
line. KLyric must therefore not size or truncate protocol data using an assumed
catalog limit.

Panel rendering is constrained by measured width, not character count, because
proportional fonts and different writing systems produce substantially
different pixel widths for the same number of Unicode characters.

KLyric should:

- preserve the complete validated lyric line in state;
- use the protocol's safety limits only to reject unreasonable payloads;
- constrain the taskbar presentation by configured pixel width;
- elide overflow visually;
- expose the complete line through the tooltip and popup.

A future optional marquee must activate only when the QML label reports that
its text is truncated. It must not replace the static elided behavior by
default.

## Validation procedure

This behavior must be tested in an actual Plasma panel, not only through
`plasmawindowed`.

1. Build and install or upgrade the plasmoid:

   ```bash
   kpackagetool6 --type Plasma/Applet --upgrade apps/plasmoid/package
   ```

2. Restart the panel or remove and re-add KLyric if Plasma retained the previous
   QML instance.
3. Add KLyric directly to a horizontal panel, not inside the system tray.
4. Confirm that the widget occupies the configured width and displays its
   fallback text while Cider or the bridge is unavailable.
5. Start the bridge and Cider, open Cider's Lyrics view, and play a synchronized
   track.
6. Confirm that the active lyric appears directly in the taskbar.
7. Test a short line and a long line. The long line must elide instead of
   collapsing the widget or expanding beyond `maximumWidth`.
8. Disable **Show music icon** and confirm the lyric text remains visible.
9. Change minimum and maximum width settings and confirm the panel responds.
10. Test a vertical panel. It should remain icon-only unless
    **Use text in vertical panels** is enabled.
11. Hover over an elided line and confirm the full line remains available in the
    tooltip.
12. Open the popup and confirm the current, previous, and next lines remain
    available.

Record the Plasma version, panel orientation, scaling factor, theme, configured
widths, and result in the Phase 6 integration matrix.

## Regression criteria

The issue is fixed when all of the following are true:

- a horizontal panel shows lyric or fallback text without requiring a click;
- the compact representation does not collapse to the icon-only width while
  `showText` is true;
- disabling the music icon does not hide the lyric;
- long lines elide within the configured width;
- vertical-panel icon-only behavior remains intentional and configurable;
- tooltip and popup retain access to the full line;
- `qmllint` passes for the modified QML;
- the behavior is verified in a real Plasma panel.
