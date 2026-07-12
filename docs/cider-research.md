# Cider lyric extraction research

## Result

Phase 1 tested Cider 3.1.8 on Linux with an authenticated Apple Music session.
The only proven synchronized-line source is Cider's rendered lyric DOM. Cider
does not expose a documented PluginKit lyric API, a discoverable lyric Pinia
store, or a complete timed-line array in the inspected renderer state.

The selected adapter priority for this compatibility descriptor is:

1. documented public API placeholder, currently unavailable;
2. validated internal-store descriptor, none detected in Cider 3.1.8;
3. complete timed-line adapter, no timed array detected;
4. observed Cider 3.1.8 DOM adapter;
5. no source.

## Safe inspection method

`bun run --cwd apps/cider-plugin inspect:cider` connects to a Cider renderer
started with `--remote-debugging-port=9222`. It reports capability booleans,
allow-listed path names, property names and value types, DOM selector/class
names, counts, and active indices. It never returns lyric text, track metadata,
catalog IDs, authorization data, cookies, tokens, or complete host objects.

The plugin setup report uses the same read-only capability inspection and logs
only the redacted result. Research actions are explicit through
`CIDER_RESEARCH_ACTION`; they report only success booleans and structural
counts.

## Observed Cider 3.1.8 shape

- The idle renderer exposes `MusicKit`, an empty `$$stores` object, and no
  renderer audio element.
- Starting playback creates `window.audioPlayer` and a document `<audio>`
  element. `MusicKit.currentPlaybackTime`, playback events, `pause()`, `play()`,
  and `seekToTime()` provide stable playback observation.
- The now-playing item exposes `attributes.hasLyrics` and
  `attributes.hasTimeSyncedLyrics`, but no lyric relationship or timed line
  array was attached during the tests.
- Opening the Lyrics control creates `.lyric-view-content` containing ordered
  `.lyric-line` elements. Exactly one current line has the `active` class.
- `.lyric-text` contains the primary line and `.lyric-text-translated` is the
  optional translated child. The line elements expose no timestamp attributes.
- A single `MutationObserver` can observe line/class changes. The active index
  is the active element's position in the ordered line collection, which also
  disambiguates consecutive identical strings.
- Closing the Lyrics view removes the container and all line elements.

## Behavior evidence

All observations below were collected without persisting or printing lyric
content:

- synchronized playback advanced the observed active index;
- pausing held playback time, resuming restarted it, and the active line
  remained available;
- seeking forward 15 seconds succeeded and advanced the active index from 43
  to 63;
- replacing the playing track changed the now-playing object, rebuilt the DOM
  from 79 to 61 lines, and reset the active index to 0;
- while Cider was minimized, playback continued and an open lyric view still
  exposed 79 ordered lines and an active index;
- after the lyric view was closed, playback continued but line count became 0
  and no alternative lyric source appeared.

## Adapter behavior and limitations

`DomLyricsSource` uses the observed semantic class names, emits an initial
snapshot, watches class/text/child mutations, debounces mutation bursts, uses
index plus text for line identity, rediscovers a replaced container, and
disconnects cleanly. It works while Cider is minimized only if the lyric view
was left open. When active playback begins before Cider has rendered the
container, the plugin makes a short, bounded source rediscovery attempt; this
recovers delayed view rendering without polling, retaining lyric text, or
writing it to diagnostics.

The closed-view limitation is material: Cider 3.1.8 removes the only proven
lyric source when the view closes. KLyric must surface this compatibility state
in diagnostics and must not imply background extraction works with the view
closed. A future documented API, validated store descriptor, or timed-line
source should automatically outrank the DOM adapter.

The internal-store fixture is explicitly a synthetic candidate used to test
fail-closed normalization and cleanup; it is not claimed as an observed Cider
3.1.8 shape. The observed fixture contains only selectors, booleans, counts,
and mechanism names.

## Phase 6 compatibility revalidation

Live revalidation on 2026-07-11 used Cider 3.1.8-1. A synchronized catalog
track again exposed 79 ordered DOM lines, pause/resume held playback time, a
15-second seek succeeded, and track replacement rebuilt the lyric DOM with 61
lines at active index 0. Minimized operation continued with the Lyrics view
open. Closing Lyrics removed all 61 lines while playback continued, and a
post-close inspection again found no public API, compatible internal store, or
complete timeline.

Capability reports now include a validated, content-free descriptor ID. The
known values are `plugin-kit-public-api`, `candidate-internal-store`,
`plugin-kit-timeline`, `cider-3.1.8-dom`, and `unsupported`. Detection requires
the callable and collection shape used by the corresponding adapter; a merely
named host property is no longer sufficient.
