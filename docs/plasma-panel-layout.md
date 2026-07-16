# Plasma panel layout contract

## Horizontal panels

- Allocate a stable lyric viewport with explicit minimum, preferred, and maximum width hints.
- Keep lyric changes from resizing the panel for each line.
- Preserve complete validated lyric text in protocol state; constrain only the visual presentation.
- Elide long lines visually rather than truncating or rewriting protocol data.
- Keep the music icon visible and order it according to the configured alignment.

## Vertical panels

- Default to intentional icon-only presentation.
- When vertical text is enabled, keep the lyric bounded within the panel axis and legible.
- Do not let vertical behavior inherit horizontal sizing accidentally.

## Full-text access

When panel text is elided, expose the complete current line in the popup or tooltip
where applicable. The popup must size to the enabled previous/current/next rows
without reserving blank space for disabled or missing rows.

## Validation

Layout changes require `qmllint` plus validation in a real Plasma 6 panel;
`plasmawindowed` or `plasmoidviewer` alone is insufficient. Check:

1. short and long lines in a horizontal panel;
2. configured width bounds and left, center, and right alignment;
3. popup layouts for one, two, and three lyric rows;
4. tooltip access to full text;
5. icon-only and text-enabled vertical behavior;
6. relevant scaling, theme, and RTL cases.
