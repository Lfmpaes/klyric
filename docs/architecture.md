# Architecture

KLyric has four isolated responsibilities:

1. `apps/cider-plugin` observes Cider through PluginKit and eventually publishes state.
2. `apps/bridge` accepts authenticated loopback writes and broadcasts cached memory-only state.
3. `apps/plasmoid` renders state received from the bridge.
4. `packages/protocol` owns versioned, runtime-validated messages.

No component persists lyric text. Unsupported Cider access is restricted to the
plugin's `src/cider/` area when Phase 1 begins.
