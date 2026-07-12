# KLyric v0.1.0

KLyric displays Cider's active synchronized lyric line in a KDE Plasma 6 panel
widget. This first release contains the local bridge, Cider plugin, Plasma
widget, systemd user service, local installer, checksums, and an optional Arch
`PKGBUILD`.

## Highlights

- Loopback-only, token-authenticated publishing from the Cider plugin.
- Plasma 6 panel and popup representations with settings for text, icon, and
  layout behavior.
- Automatic recovery across bridge, Plasma, plugin, suspend/resume, and
  full-session restart scenarios.
- Local installation, upgrade, uninstall, and `--purge` workflows.

## Compatibility and limitations

- Verified with Cider 3.1.8-1 and Plasma 6.7.2 on Wayland.
- Cider's Lyrics view must remain open for live DOM lyric extraction. Cider
  minimization continues to work while that view remains open.
- The bridge is intentionally local-only and requires Bun 1.3.14 or later.

See `README.md` and `docs/installation.md` in the source repository for
installation, troubleshooting, privacy, and full compatibility details.

## Integrity and license

Verify `SHA256SUMS` before installation. KLyric is licensed under the MIT
License; every bundled extension includes a copy of `LICENSE`.
