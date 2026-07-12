# Release readiness — v0.1.0

Audit completed 2026-07-12 for the `v0.1.0` release candidate.

## License and asset inventory

KLyric contains no bundled raster images, fonts, SVG artwork, or copied
third-party source. The Plasma metadata refers to KDE's `view-media-lyrics`
theme icon by name; it is not redistributed by KLyric. The Cider plugin,
Plasma package, Arch package, and combined release archive each carry or
reference the project MIT license. The only non-workspace JavaScript packages
are the development tools `@biomejs/biome`, `@types/bun`, and `typescript`;
the compiled bridge and Cider plugin add no third-party runtime dependency.

## Versions

The project, workspace packages, bridge and widget protocol strings, Cider
manifest, Plasma metadata, Arch package, installation guide, release archive,
and Git tag use `0.1.0`. The protocol remains at major version 1.

## Compatibility

- Cider 3.1.8-1 was installed from the local package database and passed the
  live Cider/Plasma scenario matrix during Phase 6. Cider currently exposes
  synchronized DOM lyrics only while its Lyrics view is open; KLyric supports
  that configuration and documents the limitation.
- Plasma Desktop and Plasma Workspace 6.7.2-1.1 are installed. `qmllint`,
  `kpackagetool6 --show`, and `plasmoidviewer` validate the package. Its JSON
  metadata uses `KPackageStructure: Plasma/Applet`, the Plasma 6 `ui/main.qml`
  entry point, and `X-Plasma-API-Minimum-Version: 6.0`, matching KDE's current
  Plasma 6 widget-porting guidance.
- Cider did not have a live DevTools endpoint during this audit, so no new
  host-internals claim is made beyond the recorded Phase 6 live verification.
  The compatibility assertion is explicitly limited to the installed Cider
  3.1.8-1 build.

## Production behavior and security review

- The Cider DevTools inspection utility and performance reporting switch are
  development-only source tooling and are absent from the packaged plugin.
  Routine capability reports are no longer emitted to Cider's console.
- The bridge rejects non-loopback binding, requires a 256-bit publisher token
  for state writes and clears, validates every protocol payload, applies rate
  and client limits, and keeps lyric state only in memory.
- Production bridge logs contain event names and bounded metadata only; tests
  prove a lyric sentinel and token do not reach logs or persisted files.
- The systemd user unit uses `NoNewPrivileges`, `PrivateTmp`,
  `ProtectSystem=strict`, `ProtectHome=read-only`, a narrow writable token
  directory, and restricted address families.
- `bun audit` reported no known dependency vulnerabilities for the locked
  dependency tree. The release archive contains a compiled bridge, so users
  need Bun only to run the local installer scripts.

## Artifact checks

The release archive is self-contained: it includes the installer and
uninstaller scripts, package manifest, bridge, Cider ZIP, Plasma package,
systemd unit, release notes, MIT license, and SHA-256 manifests. The automated
clean-target test extracts the tarball, runs its installer with disposable XDG
paths, and verifies the bridge and Cider plugin are installed.

## Release materials

- [Privacy-safe KLyric empty-state screenshot](klyric-empty-state.png)
- [Release notes](../RELEASE_NOTES.md)
- [Installation and troubleshooting](installation.md)
- [Integration matrix and limitations](integration-testing.md)
- [Bridge security and protocol behavior](bridge.md)
