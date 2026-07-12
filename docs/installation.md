# Installation and troubleshooting

KLyric installs only into the current user account. It does not add a widget to
any panel automatically.

## Install a release

Download and verify the release archive, then extract it:

```bash
sha256sum --check SHA256SUMS
tar -xzf klyric-0.1.0.tar.gz
cd klyric-0.1.0
bun run install:local --source .
```

The installer puts the bridge in `~/.local/bin`, installs the user unit in
`~/.config/systemd/user`, installs the Cider plugin, and upgrades the Plasma
package. It retains timestamped backups under `~/.local/share/klyric/backups`.
It honors `XDG_BIN_HOME`, `XDG_CONFIG_HOME`, `XDG_DATA_HOME`, and
`KLYRIC_CIDER_PLUGIN_HOME` when those are set.

After installation, enable KLyric in Cider’s Extensions settings and configure
the plugin with the local bridge token. Retrieve it only in a private terminal:

```bash
~/.local/bin/klyric-bridge token show
```

Do not paste that token into bug reports. Add the KLyric widget through Plasma’s
panel edit mode.

## Upgrade and removal

Run the same install command with a newer extracted release. The installer
backs up replaced files and preserves `~/.config/klyric`, including the
publisher token.

```bash
bun run uninstall:local
bun run uninstall:local --purge
```

The first command removes installed components but preserves settings. The
`--purge` form also removes `~/.config/klyric` and therefore invalidates the
previous publisher token.

## Troubleshooting

Check the expected desktop tools before installing:

```bash
bun run verify
systemctl --user status klyric-bridge.service
curl --fail http://127.0.0.1:37654/health
```

If the bridge is not running, reload and restart its user unit:

```bash
systemctl --user daemon-reload
systemctl --user restart klyric-bridge.service
```

The bridge is intentionally loopback-only. Cider 3.1.8 currently needs its
Lyrics view open for live DOM lyric extraction; this is a compatibility
limitation rather than an installation failure.
