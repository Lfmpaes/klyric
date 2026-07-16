# Architecture

KLyric has four isolated responsibilities:

1. `apps/cider-plugin` observes Cider through PluginKit and publishes normalized state.
2. `apps/bridge` accepts authenticated loopback writes and broadcasts cached memory-only state.
3. `apps/plasmoid` renders state received from the bridge.
4. `packages/protocol` owns versioned, runtime-validated messages.

No component persists lyric text. Undocumented Cider access remains restricted to
`apps/cider-plugin/src/cider/`, behind the project's lyric-source abstraction.
