# Installation and management

KLyric installs only into the current user account. It does not modify system
files or add a widget to a Plasma panel automatically.

## Requirements

- Linux with KDE Plasma 6 and user systemd
- Cider 2.5 or newer
- Bun 1.3.14 or newer
- `curl`, `sha256sum`, `tar`, `unzip`, and `kpackagetool6`

Verify the local desktop tooling from a source checkout with:

```bash
bun run verify
```

## Install or upgrade

Install the latest GitHub Release:

```bash
curl -fsSL https://raw.githubusercontent.com/Lfmpaes/klyric/main/install.sh | bash
```

This release-facing command becomes available after the v0.1.1 installer is on
`main` and matching release assets are published. The bootstrap then queries the
latest release, downloads the versioned archive and `SHA256SUMS`, verifies the
archive checksum, and runs the bundled installer.
A repeat installation upgrades managed components and preserves KLyric settings,
including the publisher token. Replaced files are backed up under the KLyric data directory.

## Installed paths

Defaults follow the XDG base directories:

| Component | Default path | Override |
|---|---|---|
| Bridge binary and `klyric` command | `~/.local/bin/` | `XDG_BIN_HOME` |
| Bridge config and publisher token | `~/.config/klyric/` | `XDG_CONFIG_HOME` |
| systemd user unit | `~/.config/systemd/user/klyric-bridge.service` | `XDG_CONFIG_HOME` |
| Managed CLI runtime and backups | `~/.local/share/klyric/` | `XDG_DATA_HOME` |
| Plasma widget | `~/.local/share/plasma/plasmoids/dev.luizpaes.klyric/` | `XDG_DATA_HOME` |
| Cider plugin | `~/.config/sh.cider.genten/plugins/dev.luizpaes.klyric/` | `KLYRIC_CIDER_PLUGIN_HOME` |

## First use and token handling

1. Restart Cider and enable **KLyric** in **Extensions → Plugins**.
2. Print the local bridge token in a private terminal:

   ```bash
   ~/.local/bin/klyric-bridge token show
   ```

3. Enter the token in the KLyric plugin settings.
4. Open a synchronized track and Cider's **Lyrics** view.
5. Add the KLyric widget through Plasma panel edit mode.

The token authorizes state writes to the loopback bridge. Do not paste it into
issues, logs, screenshots, or support requests. Rotate it with
`klyric-bridge token rotate` if exposure is suspected, then update the plugin setting.

## Management command

```bash
klyric update
klyric uninstall
klyric uninstall --purge
klyric version
klyric help
```

- `update` downloads, verifies, and installs the latest release while preserving settings.
- `uninstall` removes managed binaries, service, plugin, widget, and CLI files while preserving `~/.config/klyric`.
- `uninstall --purge` also removes KLyric configuration and invalidates the previous publisher token.
- `version` prints the installed product version.
- `help` prints the supported command list.

## Bridge troubleshooting

Check the service and loopback health endpoint:

```bash
systemctl --user status klyric-bridge.service
curl --fail http://127.0.0.1:37654/health
```

Reload and restart the user unit when needed:

```bash
systemctl --user daemon-reload
systemctl --user restart klyric-bridge.service
```

If `klyric` is not found, confirm that `${XDG_BIN_HOME:-$HOME/.local/bin}` is on
`PATH`. If the widget reports that Cider is unavailable, confirm that Cider is
running, the plugin is enabled, and its token matches the bridge token.

## Compatibility limitations

KLyric is validated with Cider 3.1.8-1 and Plasma 6.7.2 on Wayland. Cider 3.1.8
exposes the proven DOM lyric source only while its Lyrics view is open. Cider may
be minimized, but closing the Lyrics view stops synchronized-line extraction.
See [runtime testing and compatibility](testing.md) for release-critical scenarios.
