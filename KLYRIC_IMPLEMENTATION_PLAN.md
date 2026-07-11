# KLyric Implementation Plan

> End-to-end implementation plan for a coding agent.
>
> **Project:** KLyric  
> **Target:** Cider 2.5+ on Linux with KDE Plasma 6  
> **Primary platform:** Arch Linux–based distributions  
> **Package manager/runtime:** Bun  
> **Status:** Ready for implementation

---

## 1. Project summary

KLyric is a local integration that displays the currently active synchronized lyric line from Cider in a KDE Plasma panel widget.

The system consists of three components:

1. **Cider plugin** — detects the current track, playback state, synchronized lyrics, and active lyric line.
2. **Local bridge** — receives state from Cider and broadcasts it to local consumers.
3. **KDE Plasma widget** — connects to the bridge and renders the current lyric line in the panel.

```text
┌──────────────────────────┐
│ Cider                    │
│                          │
│ KLyric plugin            │
│ ├─ playback metadata     │
│ ├─ lyric extraction      │
│ ├─ current-line tracking │
│ └─ state publisher       │
└─────────────┬────────────┘
              │ HTTP on localhost
              ▼
┌──────────────────────────┐
│ klyric-bridge            │
│ ├─ authenticated writer  │
│ ├─ in-memory state       │
│ ├─ WebSocket broadcast   │
│ └─ health endpoint       │
└─────────────┬────────────┘
              │ WebSocket on localhost
              ▼
┌──────────────────────────┐
│ KDE Plasma 6             │
│                          │
│ KLyric plasmoid          │
│ ├─ reconnect logic       │
│ ├─ state validation      │
│ ├─ panel representation  │
│ └─ configuration UI      │
└──────────────────────────┘
```

The first implementation priority is proving that Cider’s active lyric line can be extracted reliably. Cider PluginKit is the supported plugin boundary, but it does not currently document a synchronized-lyrics API. Any access to internal stores or rendered lyric elements must therefore be isolated behind replaceable adapters.

---

## 2. Goals

### 2.1 Product goals

- Display the lyric line currently highlighted by Cider.
- Update the panel with imperceptible or minimal delay.
- Work when Cider is minimized or behind other windows.
- Recover automatically when Cider, Plasma, or the bridge restarts.
- Support tracks with:
  - line-synchronized lyrics;
  - word-synchronized lyrics;
  - unsynchronized lyrics;
  - no lyrics;
  - instrumental markers.
- Preserve user privacy by keeping all communication on the local machine.
- Provide a polished Plasma 6 panel experience.
- Be straightforward to install, uninstall, debug, and package.

### 2.2 Engineering goals

- Keep undocumented Cider integration confined to one package.
- Define a stable, versioned protocol between components.
- Use strict TypeScript and validated runtime payloads.
- Avoid polling when event-driven observation is available.
- Keep the bridge small, stateless, and memory-only.
- Make each component testable independently.
- Support future replacement of the extraction adapter if PluginKit gains a lyric API.

---

## 3. Non-goals

The initial release must not:

- Fetch lyrics from third-party providers.
- Circumvent Apple Music or Cider authentication.
- Store complete lyric catalogs on disk.
- Upload playback or lyric information anywhere.
- Control Cider playback from the widget.
- Support Plasma 5.
- Support non-KDE desktop environments.
- expose the bridge outside loopback.
- depend on the Cider lyrics page remaining visibly open, unless no better extraction method exists and this limitation is documented.
- perform lyric translation.
- implement karaoke-style per-word rendering in the panel.

These may be considered after the core integration is reliable.

---

## 4. Research-backed constraints

### 4.1 Cider plugin environment

The official Cider plugin template currently targets:

- Cider 2.5 or newer;
- Vue 3;
- TypeScript;
- Vite;
- PluginKit;
- development through Cider’s Vite integration;
- production output installed under Cider’s plugin directory.

Use the official template as the base for `apps/cider-plugin`, but standardize repository commands on Bun.

### 4.2 PluginKit boundary

PluginKit is the supported public bridge between plugins and Cider’s closed-source frontend. It exposes host-provided runtime objects, playback controls, plugin lifecycle utilities, Vue helpers, menus, dialogs, and related APIs.

Current known limitations:

- there is no documented API that directly returns the active synchronized lyric line;
- the documented PluginKit event list does not expose lyric-line changes;
- an open PluginKit request exists for lyric-provider, translation, and word-synchronized lyric support.

Therefore, KLyric must use a capability-discovery approach and isolate fallback access to internal Cider implementation details.

### 4.3 Plasma widget environment

The widget must target Plasma 6 and use:

- a `metadata.json` package descriptor;
- `X-Plasma-API-Minimum-Version: "6.0"`;
- `KPackageStructure: "Plasma/Applet"`;
- a QML entry point rooted in `PlasmoidItem`;
- KConfig-backed widget settings;
- Qt WebSockets for the bridge connection.

---

## 5. High-level architecture

## 5.1 Component responsibilities

| Component | Responsibilities | Must not do |
|---|---|---|
| Cider plugin | Extract current playback and lyric state; normalize state; publish changes | Render KDE UI; expose a server; persist lyrics |
| Bridge | Authenticate the writer; validate state; cache latest state in memory; broadcast updates | Fetch lyrics; inspect Cider; expose network access beyond loopback |
| Plasma widget | Subscribe to updates; render current state; expose user configuration | Access Cider internals; write playback state; store lyrics |
| Protocol package | Shared TypeScript schemas, types, constants, fixtures | Contain platform-specific logic |
| Installer | Install all components and service files | Modify unrelated user configuration |

## 5.2 Process model

- Cider loads the KLyric plugin with the application.
- `klyric-bridge` runs as a systemd user service.
- Plasma loads the plasmoid as part of the user session.
- The Cider plugin is the only state writer.
- Any number of local widgets may subscribe as read-only clients.
- State is retained only in bridge memory.
- Restarting the bridge clears cached lyric state and clients reconnect.

## 5.3 Communication choice

Use:

- **HTTP POST** from the Cider plugin to the bridge.
- **WebSocket** from the Plasma widget to the bridge.

Rationale:

- HTTP is simple for one-way state publication and easy to test.
- The publisher can authenticate with an HTTP bearer token.
- QML’s WebSocket client receives updates without polling.
- Read-only widget clients do not need a secret because the service is loopback-only and exposes non-sensitive playback display data.
- The bridge remains implementation-language agnostic.

---

## 6. Repository structure

Create a Bun workspace monorepo:

```text
klyric/
├── AGENTS.md
├── README.md
├── LICENSE
├── package.json
├── bun.lock
├── tsconfig.base.json
├── biome.json
├── .editorconfig
├── .gitignore
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── release.yml
├── apps/
│   ├── cider-plugin/
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── plugin.config.ts
│   │   │   ├── config.ts
│   │   │   ├── application/
│   │   │   │   ├── KLyricPlugin.ts
│   │   │   │   └── PluginStateMachine.ts
│   │   │   ├── cider/
│   │   │   │   ├── CiderCapabilities.ts
│   │   │   │   ├── PlaybackSource.ts
│   │   │   │   └── lyrics/
│   │   │   │       ├── LyricsSource.ts
│   │   │   │       ├── LyricsSourceFactory.ts
│   │   │   │       ├── PublicApiLyricsSource.ts
│   │   │   │       ├── InternalStoreLyricsSource.ts
│   │   │   │       ├── DomLyricsSource.ts
│   │   │   │       ├── TimelineLyricsSource.ts
│   │   │   │       └── selectors.ts
│   │   │   ├── publisher/
│   │   │   │   ├── BridgeClient.ts
│   │   │   │   ├── PublishQueue.ts
│   │   │   │   └── RetryPolicy.ts
│   │   │   ├── settings/
│   │   │   │   └── Settings.vue
│   │   │   └── diagnostics/
│   │   │       ├── Diagnostics.ts
│   │   │       └── RedactedSnapshot.ts
│   │   └── tests/
│   │       ├── unit/
│   │       └── fixtures/
│   ├── bridge/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── config.ts
│   │   │   ├── server.ts
│   │   │   ├── auth/
│   │   │   │   └── PublisherToken.ts
│   │   │   ├── http/
│   │   │   │   ├── routes.ts
│   │   │   │   └── responses.ts
│   │   │   ├── websocket/
│   │   │   │   ├── ClientRegistry.ts
│   │   │   │   └── EventBroadcaster.ts
│   │   │   ├── state/
│   │   │   │   ├── StateStore.ts
│   │   │   │   └── StateExpiry.ts
│   │   │   └── logging/
│   │   │       └── logger.ts
│   │   └── tests/
│   │       ├── integration/
│   │       └── unit/
│   └── plasmoid/
│       ├── package.json
│       ├── package/
│       │   ├── metadata.json
│       │   └── contents/
│       │       ├── config/
│       │       │   ├── config.qml
│       │       │   └── main.xml
│       │       ├── ui/
│       │       │   ├── main.qml
│       │       │   ├── CompactRepresentation.qml
│       │       │   ├── FullRepresentation.qml
│       │       │   ├── LyricLabel.qml
│       │       │   ├── ConnectionStatus.qml
│       │       │   ├── configGeneral.qml
│       │       │   └── js/
│       │       │       ├── Protocol.js
│       │       │       └── Formatting.js
│       │       └── icons/
│       │           └── klyric.svg
│       ├── scripts/
│       │   ├── install.sh
│       │   ├── uninstall.sh
│       │   └── test.sh
│       └── tests/
│           ├── qml/
│           └── fixtures/
├── packages/
│   ├── protocol/
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── constants.ts
│   │   │   ├── schemas.ts
│   │   │   ├── types.ts
│   │   │   └── fixtures.ts
│   │   └── tests/
│   └── test-utils/
│       ├── package.json
│       └── src/
├── packaging/
│   ├── systemd/
│   │   └── klyric-bridge.service
│   ├── arch/
│   │   └── PKGBUILD
│   ├── marketplace/
│   └── release/
├── scripts/
│   ├── bootstrap.ts
│   ├── build-all.ts
│   ├── install-local.ts
│   ├── uninstall-local.ts
│   ├── package-release.ts
│   └── verify-environment.ts
└── docs/
    ├── architecture.md
    ├── protocol.md
    ├── cider-research.md
    ├── troubleshooting.md
    └── release.md
```

---

## 7. Technology choices

| Area | Choice |
|---|---|
| Workspace/runtime | Bun |
| Cider plugin | TypeScript, Vue 3, Vite, Cider PluginKit |
| Bridge | Bun HTTP server and WebSocket support |
| Shared validation | Zod or an equally small runtime schema validator |
| Plasma UI | QML, Qt Quick, Kirigami, Plasma Components |
| Formatting/linting | Biome for TypeScript/JSON; `qmllint` for QML |
| Unit tests | Bun test |
| Integration tests | Bun test plus spawned bridge process |
| Service manager | systemd user unit |
| Packaging | Cider Marketplace ZIP, Plasma package archive, Arch `PKGBUILD`, release tarball |

Prefer platform APIs and existing workspace dependencies. Do not add a framework to the bridge.

---

## 8. Shared protocol

## 8.1 Protocol version

Start with:

```ts
export const PROTOCOL_VERSION = 1 as const;
```

Protocol changes must follow these rules:

- additive optional fields do not require a version increment;
- changing field meaning, removing fields, or changing required fields requires a new version;
- the bridge rejects unsupported major protocol versions;
- the widget shows an explicit incompatible-protocol state.

## 8.2 Core types

```ts
export type PlaybackStatus =
  | "playing"
  | "paused"
  | "stopped"
  | "loading"
  | "unknown";

export type LyricsKind =
  | "word-synced"
  | "line-synced"
  | "unsynced"
  | "instrumental"
  | "unavailable";

export type SourceKind =
  | "public-api"
  | "internal-store"
  | "dom"
  | "timeline"
  | "none";

export interface TrackIdentity {
  id?: string;
  title?: string;
  artist?: string;
  album?: string;
  durationMs?: number;
  artworkUrl?: string;
}

export interface LyricLine {
  text: string;
  startTimeMs?: number;
  endTimeMs?: number;
  index?: number;
  isInstrumental?: boolean;
}

export interface KLyricState {
  protocolVersion: 1;
  sequence: number;
  sessionId: string;
  emittedAt: string;
  playbackStatus: PlaybackStatus;
  track: TrackIdentity | null;
  lyricsKind: LyricsKind;
  sourceKind: SourceKind;
  currentLine: LyricLine | null;
  previousLine: LyricLine | null;
  nextLine: LyricLine | null;
  positionMs?: number;
  hasLyrics: boolean;
  stale: boolean;
}
```

## 8.3 Bridge WebSocket envelopes

```ts
export type ServerMessage =
  | {
      type: "hello";
      protocolVersion: 1;
      bridgeVersion: string;
    }
  | {
      type: "state";
      payload: KLyricState;
    }
  | {
      type: "state-cleared";
      reason: "expired" | "publisher-disconnected" | "manual";
    }
  | {
      type: "error";
      code: string;
      message: string;
    }
  | {
      type: "ping";
      timestamp: number;
    };
```

The widget may send:

```ts
export type ClientMessage =
  | {
      type: "hello";
      protocolVersion: 1;
      client: "plasmoid";
      clientVersion: string;
    }
  | {
      type: "pong";
      timestamp: number;
    };
```

## 8.4 Validation rules

- Trim lyric text.
- Preserve intentional internal whitespace.
- Convert empty lyric strings to `null`.
- Limit each lyric line to 2,000 Unicode code points.
- Limit title, artist, and album to 500 code points.
- Reject payloads larger than 64 KiB.
- Require monotonically increasing `sequence` within a plugin `sessionId`.
- Reject timestamps unreasonably far from the bridge clock.
- Never accept arbitrary nested data from Cider.

---

## 9. Bridge API

## 9.1 Default network configuration

```text
Host: 127.0.0.1
Port: 37654
HTTP base: http://127.0.0.1:37654
WebSocket: ws://127.0.0.1:37654/v1/events
```

The port must be configurable through:

1. environment variable;
2. bridge config file;
3. default value.

Do not bind to `0.0.0.0`, `::`, LAN interfaces, or Unix-exposed proxies.

## 9.2 Endpoints

### `POST /v1/state`

Purpose: receive state from the Cider plugin.

Required headers:

```text
Authorization: Bearer <publisher-token>
Content-Type: application/json
```

Responses:

- `202 Accepted` — valid new state accepted.
- `204 No Content` — valid duplicate state ignored.
- `400 Bad Request` — malformed JSON or schema mismatch.
- `401 Unauthorized` — missing or invalid token.
- `409 Conflict` — sequence regression or incompatible session transition.
- `413 Payload Too Large` — body limit exceeded.
- `426 Upgrade Required` — unsupported protocol version.
- `429 Too Many Requests` — publisher exceeds rate limit.
- `500 Internal Server Error` — unexpected bridge failure.

### `DELETE /v1/state`

Purpose: allow the authenticated publisher to clear state during shutdown or logout.

### `GET /v1/state`

Purpose: diagnostics and development.

Return the latest normalized state or `204 No Content`.

The endpoint is read-only and available only on loopback.

### `GET /v1/events`

Upgrade to WebSocket.

Behavior:

1. send server `hello`;
2. require client `hello` within five seconds;
3. reject incompatible versions;
4. immediately send latest state, if one exists;
5. broadcast subsequent state changes;
6. periodically send application-level ping messages;
7. close unresponsive clients;
8. enforce a maximum local-client count.

### `GET /health`

Return:

```json
{
  "status": "ok",
  "version": "0.1.0",
  "protocolVersion": 1,
  "publisherSeen": true,
  "stateAvailable": true,
  "clients": 1,
  "uptimeSeconds": 123
}
```

Do not include lyric text in health responses.

## 9.3 Publisher token

On first launch:

1. create `${XDG_CONFIG_HOME:-~/.config}/klyric/`;
2. generate at least 256 bits of cryptographically secure random data;
3. write it to `publisher-token`;
4. set file permissions to `0600`;
5. never print the token in normal logs.

The Cider plugin obtains the token through its settings. Initial installation may copy it automatically into plugin-scoped configuration if the platform allows safe access. Otherwise, provide a one-time setup command that prints the token only on explicit request.

Preferred UX:

```bash
klyric-bridge token show
```

The user pastes the token into Cider’s KLyric settings page.

## 9.4 State expiry

Recommended rules:

- `playing`: state becomes stale after 15 seconds without publication;
- `paused`: retain current line for up to 24 hours, but mark the publisher disconnected if appropriate;
- `stopped`: clear lyric lines immediately, retain track metadata briefly if the widget is configured to show it;
- bridge restart: no persisted lyric state;
- explicit plugin shutdown: clear state.

The plugin should publish a heartbeat every five seconds while playing, even if the lyric line has not changed.

## 9.5 Rate limiting

Allow:

- normal sustained publication: up to 10 requests per second;
- burst capacity: 20 requests;
- expected real traffic: less than two requests per second.

Ignore exact duplicate state instead of rebroadcasting it.

---

## 10. Cider plugin design

## 10.1 Plugin metadata

Use a stable reverse-domain identifier:

```ts
export default {
  ce_prefix: "klyric",
  identifier: "dev.luizpaes.klyric",
  name: "KLyric",
  description: "Publishes Cider's active synchronized lyric line to KDE Plasma.",
  version: "0.1.0",
  author: "Luiz Paes",
  pluginKitVersion: "4",
  entry: {
    "plugin.js": {
      type: "main",
    },
  },
};
```

Do not hardcode a repository URL until the repository exists.

## 10.2 Plugin lifecycle

On setup:

1. initialize structured diagnostics;
2. load and validate plugin settings;
3. wait for Cider readiness;
4. probe host capabilities;
5. initialize playback metadata observation;
6. choose the best lyric source;
7. start the plugin state machine;
8. create the bridge publisher;
9. send the initial state;
10. expose a settings and diagnostics view.

On teardown or hot reload:

1. unsubscribe all event listeners;
2. disconnect all observers;
3. cancel timers and animation frames;
4. flush or cancel pending publications;
5. request bridge state clearing;
6. remove plugin-created DOM elements;
7. ensure no duplicate observers survive reload.

Every subscription function must return or register a cleanup callback.

## 10.3 Capability discovery

Create a `CiderCapabilities` module that detects capabilities without mutating host state.

Probe in this order:

1. documented PluginKit lyric API, if introduced;
2. known lyric-related host stores;
3. known reactive store methods;
4. rendered synchronized lyric container;
5. audio timeline plus complete lyric line timestamps;
6. no supported lyric source.

Record only safe capability names in diagnostics. Do not serialize entire Cider stores.

Example result:

```ts
interface CiderCapabilities {
  publicLyricsApi: boolean;
  internalLyricsStore: boolean;
  storeSubscription: boolean;
  lyricDom: boolean;
  timedLyricsAvailable: boolean;
  playbackAudioElement: boolean;
}
```

## 10.4 Lyrics source abstraction

```ts
export interface LyricsSourceContext {
  signal: AbortSignal;
  onSnapshot(snapshot: RawLyricsSnapshot): void;
  onError(error: LyricsSourceError): void;
}

export interface LyricsSource {
  readonly kind: SourceKind;
  readonly confidence: number;

  canStart(): Promise<boolean>;
  start(context: LyricsSourceContext): Promise<void>;
  stop(): Promise<void>;
}
```

`LyricsSourceFactory` selects the highest-confidence supported source and can fall back when a source fails.

### Adapter priority

1. `PublicApiLyricsSource`
2. `InternalStoreLyricsSource`
3. `TimelineLyricsSource`
4. `DomLyricsSource`
5. no source

The preferred order between timeline and DOM may be changed after the extraction spike. Prefer the method that works while the lyric page is closed and does not depend on CSS selectors.

## 10.5 Public API adapter

Implement a placeholder adapter that:

- detects a future PluginKit lyric API;
- uses only documented methods;
- maps output into KLyric’s raw snapshot;
- contains no fallback code.

Keeping this adapter from the beginning makes migration explicit.

## 10.6 Internal store adapter

During the extraction spike, inspect:

- `window.__PLUGINSYS__`;
- exposed Pinia or Vue stores;
- lyric-related store names;
- active line/index fields;
- full line arrays and timestamps;
- track-change resets;
- whether state continues updating while the lyrics page is closed.

Possible observation mechanisms:

- Pinia `$subscribe`;
- Vue `watch`;
- host event listener;
- property descriptor interception only as a last resort.

Rules:

- never modify Cider store values;
- never monkey-patch global methods unless the spike proves no alternative exists;
- centralize all property names in one compatibility map;
- use optional chaining and runtime guards;
- fail closed when shape validation fails;
- identify Cider compatibility by detected shape, not assumed version alone.

Create compatibility descriptors:

```ts
interface InternalStoreDescriptor {
  id: string;
  detect(root: unknown): boolean;
  subscribe(root: unknown, callback: () => void): () => void;
  read(root: unknown): RawLyricsSnapshot | null;
}
```

Each supported Cider shape gets its own descriptor and fixture.

## 10.7 Timeline adapter

Use when Cider exposes the full synchronized lyric timeline but not a reliable active index.

Inputs:

- complete timed lines;
- playback position;
- playback rate;
- track identity;
- seek events or detected position jumps.

Algorithm:

1. normalize line timestamps to milliseconds;
2. sort stable lines by start time;
3. use binary search to select the latest line whose start time is less than or equal to playback position;
4. derive end time from the next line when absent;
5. reset on track change;
6. recompute immediately after seek;
7. while playing, schedule the next boundary instead of polling continuously;
8. use a low-frequency guard poll to correct drift;
9. pause timers when playback pauses.

Do not depend on `requestAnimationFrame` for background operation because Electron may throttle background rendering.

## 10.8 DOM adapter

Use only when no reliable state/timeline source is available.

Discovery:

- find the synchronized lyrics container semantically;
- detect the currently highlighted line through stable attributes, accessibility state, or class patterns;
- avoid selectors tied to generated class hashes;
- detect container replacement after navigation;
- observe only the smallest relevant subtree.

Implementation:

- use one `MutationObserver`;
- debounce bursts into a single read;
- compare normalized line identity before emitting;
- handle duplicate consecutive lyric strings by including index or timestamp where possible;
- reattach after Cider rerenders the lyric view;
- disconnect cleanly.

Document whether this adapter requires the lyrics view to remain open. The widget must surface this limitation in diagnostics rather than silently appearing broken.

## 10.9 Playback source

Use documented PluginKit Apple Music access for playback controls and now-playing metadata where possible.

Normalize:

- track ID;
- title;
- artist;
- album;
- duration;
- playback state;
- current position;
- track transitions;
- seek events.

Undocumented access to Cider’s audio element must remain inside `PlaybackSource` and be guarded like lyric internals.

## 10.10 State machine

States:

```text
initializing
connecting
idle
loading-track
playing-with-lyrics
playing-without-lyrics
paused
stopped
source-error
bridge-error
disabled
```

Important transitions:

- application ready → `connecting`;
- bridge available + no track → `idle`;
- new track → `loading-track`;
- lyric source emits valid current line → `playing-with-lyrics`;
- lyric lookup completes without lyrics → `playing-without-lyrics`;
- playback paused → `paused`;
- playback stopped → `stopped`;
- extraction adapter fails → try fallback before `source-error`;
- bridge publication fails → retain local state and enter `bridge-error`;
- configuration disabled → `disabled`.

Track transitions must invalidate old lyric state before accepting a new line.

## 10.11 Publication queue

The publisher must:

- publish immediately on track change;
- publish immediately on active line change;
- publish immediately on pause, resume, seek, or stop;
- send heartbeat updates while playing;
- deduplicate semantically identical states;
- serialize requests to preserve sequence ordering;
- retain only the newest pending state during a burst;
- retry transient bridge failures with exponential backoff and jitter;
- stop retrying authentication failures until settings change;
- not block Cider’s UI thread.

Suggested retry sequence:

```text
250 ms, 500 ms, 1 s, 2 s, 5 s, 10 s, then 30 s maximum
```

## 10.12 Plugin settings

Provide:

- enable/disable integration;
- bridge host, locked to loopback addresses by default;
- bridge port;
- publisher token;
- preferred lyric source: automatic or a diagnostic override;
- heartbeat interval;
- enable diagnostic logging;
- test connection button;
- copy redacted diagnostic report button;
- current source and connection status.

Never display the full publisher token after it is saved.

## 10.13 Plugin diagnostics

Diagnostics should include:

- plugin version;
- detected Cider compatibility descriptor;
- active source kind;
- playback source status;
- bridge connection status;
- most recent publication timestamp;
- most recent non-sensitive error;
- current protocol version.

Diagnostics must not include:

- authentication tokens;
- complete lyrics;
- account identifiers;
- Apple Music authorization data;
- cookies;
- entire Cider store dumps.

---

## 11. Bridge implementation

## 11.1 Startup sequence

1. parse CLI arguments;
2. load environment variables;
3. load configuration;
4. ensure config directory exists;
5. ensure publisher token exists and permissions are correct;
6. create the in-memory state store;
7. start the loopback HTTP/WebSocket server;
8. register signal handlers;
9. mark systemd readiness if notification support is implemented;
10. log a concise startup message.

## 11.2 Configuration precedence

Highest to lowest:

1. CLI argument;
2. environment variable;
3. config file;
4. default.

Supported environment variables:

```text
KLYRIC_HOST
KLYRIC_PORT
KLYRIC_LOG_LEVEL
KLYRIC_STATE_TIMEOUT_MS
KLYRIC_MAX_CLIENTS
KLYRIC_CONFIG_DIR
```

Reject a non-loopback host unless the binary is started with an explicit unsafe-development flag. Do not expose this flag in normal documentation.

## 11.3 State store

The store holds:

```ts
interface StoredState {
  value: KLyricState;
  receivedAt: number;
  contentHash: string;
}
```

Responsibilities:

- validate sequence transitions;
- identify duplicates;
- expose latest state;
- clear state;
- mark or expire stale state;
- notify the broadcaster.

Do not write state to disk.

## 11.4 WebSocket client registry

Track:

- client ID;
- connection time;
- protocol version;
- last pong;
- remote address;
- client version.

Rules:

- accept only loopback connections;
- cap clients, for example at 16;
- require a valid hello message;
- drop malformed or abusive clients;
- send the newest state on successful handshake;
- remove clients deterministically on close or error.

## 11.5 Logging

Use structured logs with:

- timestamp;
- level;
- component;
- event;
- safe context.

Default level: `info`.

Examples:

```json
{"level":"info","component":"server","event":"started","host":"127.0.0.1","port":37654}
{"level":"info","component":"publisher","event":"state_accepted","sequence":42,"sourceKind":"internal-store"}
{"level":"warn","component":"websocket","event":"client_timeout","clientId":"..."}
```

Never log lyric text at `info`. A development-only trace mode may log redacted lengths and indexes, not content.

## 11.6 CLI

Implement:

```text
klyric-bridge run
klyric-bridge health
klyric-bridge token show
klyric-bridge token rotate
klyric-bridge config path
klyric-bridge version
```

`token rotate` must invalidate the old token immediately and explain that the Cider plugin setting must be updated.

## 11.7 Graceful shutdown

On `SIGTERM` or `SIGINT`:

1. stop accepting new connections;
2. broadcast `state-cleared` with reason `manual`;
3. close WebSocket clients;
4. close the HTTP server;
5. cancel expiry timers;
6. exit cleanly within the systemd timeout.

---

## 12. Plasma widget design

## 12.1 Package metadata

Use:

```json
{
  "KPlugin": {
    "Authors": [
      {
        "Name": "Luiz Paes"
      }
    ],
    "Category": "Multimedia",
    "Description": "Displays the current synchronized lyric line from Cider.",
    "Icon": "view-media-lyrics",
    "Id": "dev.luizpaes.klyric",
    "Name": "KLyric",
    "Version": "0.1.0"
  },
  "X-Plasma-API-Minimum-Version": "6.0",
  "KPackageStructure": "Plasma/Applet"
}
```

Verify the final icon name exists on common Plasma installations. Bundle `klyric.svg` and use it if a suitable theme icon is unavailable.

## 12.2 QML root

`main.qml` must:

- use `PlasmoidItem`;
- define `compactRepresentation`;
- define `fullRepresentation`;
- expose connection and lyric state properties;
- own the WebSocket and reconnect timer;
- parse messages through a small JavaScript helper;
- avoid blocking operations.

## 12.3 WebSocket connection

Use `QtWebSockets.WebSocket`.

Required behavior:

- URL derived from widget settings.
- Connect automatically at component completion.
- Send client hello after open.
- Validate server hello before applying state.
- Parse JSON inside `try/catch`.
- Ignore unknown additive message types.
- reject incompatible protocol versions.
- reconnect after closure or error.
- use exponential backoff with jitter.
- reset backoff after a stable connection.
- respond to application-level ping messages.
- expose connection status to the UI.

Suggested reconnect sequence:

```text
500 ms, 1 s, 2 s, 5 s, 10 s, then 30 s maximum
```

## 12.4 Compact representation

Primary panel behavior:

- show current lyric line directly in the panel;
- use the panel’s text color;
- vertically center the label;
- use elision when constrained;
- avoid forcing excessive panel width;
- show a subtle placeholder only when configured;
- expose full text through tooltip;
- support horizontal and vertical panels.

Horizontal panel:

```text
♪ We were golden in the quiet
```

Vertical panel options:

- show only an icon and use tooltip;
- rotate or stack text only if explicitly enabled;
- default to icon mode to avoid poor readability.

## 12.5 Full representation

On click, display:

- track title;
- artist;
- previous lyric line;
- highlighted current line;
- next lyric line;
- connection status if disconnected;
- active extraction source in diagnostic mode.

Do not attempt to display the complete song lyrics in the initial release.

## 12.6 Display rules

Priority:

1. current lyric line;
2. instrumental indicator;
3. unsynchronized-lyrics indicator;
4. configured track metadata fallback;
5. configured disconnected placeholder;
6. hidden/empty state.

Suggested fallback strings:

- `Instrumental`
- `Lyrics unavailable`
- `Waiting for Cider`
- `KLyric bridge unavailable`

All strings must use `i18n()`.

## 12.7 Widget configuration

Create KConfig entries for:

### Connection

- bridge host;
- bridge port;
- reconnect enabled;
- connection status display.

Host input should default to `127.0.0.1` and warn when a non-loopback address is entered.

### Appearance

- font size adjustment;
- normal, medium, or bold weight;
- maximum width;
- minimum width;
- one or two visible lines;
- alignment;
- show music icon;
- show title/artist fallback;
- hide when stopped;
- hide when Cider is unavailable;
- animation enabled;
- tooltip details enabled.

### Content

- show previous line in popup;
- show next line in popup;
- instrumental text;
- no-lyrics fallback;
- paused behavior;
- clear-delay after stop.

### Diagnostics

- show connection badge;
- show active source;
- show last update age.

Use normal Qt Quick Controls in the configuration window and Kirigami form layout.

## 12.8 Animations

Keep animations subtle:

- fade between lines;
- optional short vertical transition;
- duration approximately 120–200 ms;
- disable when reduced-motion behavior is requested or animations are turned off;
- never continuously animate while text is unchanged.

## 12.9 Accessibility

- Expose accessible name and description.
- Ensure full text is available via tooltip.
- Do not encode state through color alone.
- Respect Plasma theme colors.
- Support high-DPI scaling.
- Avoid fixed pixel sizes where units are appropriate.
- Handle right-to-left text.
- Preserve Unicode combining characters and emoji.
- Ensure keyboard focus behaves correctly in the popup.

## 12.10 Widget state handling

Maintain:

```qml
property string connectionState: "disconnected"
property var lyricState: null
property string displayText: ""
property bool protocolCompatible: true
property int reconnectAttempt: 0
property double lastMessageAt: 0
```

Do not bind visible text directly to unvalidated JSON fields.

---

## 13. Installation and packaging

## 13.1 Local paths

Expected user-local destinations:

```text
Cider plugin:
~/.config/sh.cider.electron/plugins/dev.luizpaes.klyric/

Plasma widget:
~/.local/share/plasma/plasmoids/dev.luizpaes.klyric/

Bridge binary:
~/.local/bin/klyric-bridge

Bridge configuration:
~/.config/klyric/

systemd user unit:
~/.config/systemd/user/klyric-bridge.service
```

Respect `XDG_CONFIG_HOME`, `XDG_DATA_HOME`, and `XDG_BIN_HOME`-style overrides where practical.

## 13.2 systemd user service

Create:

```ini
[Unit]
Description=KLyric local lyric bridge
After=graphical-session.target
PartOf=graphical-session.target

[Service]
Type=simple
ExecStart=%h/.local/bin/klyric-bridge run
Restart=on-failure
RestartSec=2
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=%h/.config/klyric
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
LockPersonality=yes

[Install]
WantedBy=default.target
```

Validate hardening directives on target distributions. Adjust `ProtectHome` or writable paths only as required.

## 13.3 Install script

The installer must:

1. verify Linux and Plasma 6;
2. verify required commands;
3. build or locate release artifacts;
4. back up an existing KLyric installation;
5. install the bridge;
6. install the systemd user unit;
7. reload the user daemon;
8. enable and start the service;
9. install the Cider plugin;
10. install the Plasma widget;
11. generate or confirm the publisher token;
12. print concise Cider configuration steps;
13. verify bridge health;
14. avoid modifying the Plasma panel automatically.

Support:

```bash
bun run install:local
bun run uninstall:local
```

The uninstall command must preserve user settings unless `--purge` is supplied.

## 13.4 Cider package

Use the official template’s marketplace packaging process and ensure output includes:

- compiled plugin JavaScript;
- plugin metadata;
- settings custom element;
- required static assets;
- license and minimal readme where expected.

## 13.5 Plasma package

Package the contents of `apps/plasmoid/package` so `metadata.json` is at the archive root.

Support installation through:

```bash
kpackagetool6 --type Plasma/Applet --install <package>
```

and upgrades through:

```bash
kpackagetool6 --type Plasma/Applet --upgrade <package>
```

## 13.6 Arch package

After the manual release process works, add a `PKGBUILD` that:

- installs the bridge binary;
- installs the systemd user unit;
- installs the Plasma widget system-wide or documents user-local behavior;
- avoids installing the Cider plugin into a specific user’s home;
- provides an optional post-install message for the Cider plugin.

Consider separate packages later:

- `klyric-bridge`
- `plasma6-applets-klyric`
- `cider-plugin-klyric`
- `klyric-git`

---

## 14. Development workflow

## 14.1 Root commands

Define:

```json
{
  "scripts": {
    "dev": "bun run --filter '*' dev",
    "dev:plugin": "bun run --cwd apps/cider-plugin dev",
    "dev:bridge": "bun run --cwd apps/bridge dev",
    "dev:plasmoid": "bun run --cwd apps/plasmoid dev",
    "build": "bun scripts/build-all.ts",
    "test": "bun test",
    "typecheck": "bun run --filter '*' typecheck",
    "lint": "biome check . && bun run lint:qml",
    "lint:qml": "qmllint apps/plasmoid/package/contents/ui/**/*.qml",
    "format": "biome format --write .",
    "package": "bun scripts/package-release.ts",
    "install:local": "bun scripts/install-local.ts",
    "uninstall:local": "bun scripts/uninstall-local.ts"
  }
}
```

Adjust workspace syntax to the Bun version used by the project.

## 14.2 Development loop

Run bridge:

```bash
bun run dev:bridge
```

Run Cider plugin Vite development server:

```bash
bun run dev:plugin
```

Enable Cider’s Vite plugin loading.

Run plasmoid in horizontal-panel mode:

```bash
plasmoidviewer -a apps/plasmoid/package -l topedge -f horizontal
```

Use a development publisher fixture before Cider extraction is complete:

```bash
bun run mock:publisher
```

The mock publisher should cycle through:

- playing line changes;
- pause;
- seek;
- track change;
- no lyrics;
- instrumental;
- disconnected state;
- malformed payload attempts.

---

## 15. Testing strategy

## 15.1 Protocol unit tests

Test:

- valid state parsing;
- all enum values;
- missing required fields;
- unsupported protocol versions;
- line length limits;
- Unicode content;
- duplicate consecutive text with distinct indexes;
- sequence monotonicity;
- session changes;
- payload size limits.

## 15.2 Bridge unit tests

Test:

- token generation;
- token file permissions;
- authentication success and failure;
- loopback binding validation;
- state deduplication;
- state expiry;
- client registration;
- ping timeout;
- graceful shutdown;
- rate limiting;
- safe logging.

## 15.3 Bridge integration tests

Spawn the bridge on a random loopback port and test:

1. health endpoint;
2. unauthorized publication;
3. valid publication;
4. WebSocket subscription;
5. immediate delivery of cached state;
6. subsequent broadcast;
7. duplicate suppression;
8. clear-state behavior;
9. incompatible widget handshake;
10. restart recovery.

## 15.4 Plugin unit tests

Use fixtures representing Cider store/DOM shapes.

Test:

- capability detection;
- descriptor selection;
- internal store reads;
- store shape mismatch;
- DOM active-line extraction;
- container replacement;
- duplicate strings;
- line normalization;
- timeline binary search;
- seek handling;
- track reset;
- publication deduplication;
- retry behavior;
- cleanup after teardown.

Do not snapshot entire host objects.

## 15.5 Plasma tests

At minimum:

- run `qmllint`;
- load QML with representative fixtures;
- validate JSON parsing helpers;
- test display formatting functions;
- test fallback priority;
- test width and elision manually;
- test horizontal and vertical form factors;
- test light and dark Plasma themes;
- test 100%, 150%, and 200% scaling;
- test right-to-left lyric content;
- test bridge unavailable and incompatible protocol states.

## 15.6 Manual Cider compatibility matrix

Record results for each tested Cider release:

| Cider version | Public API | Store adapter | Timeline adapter | DOM adapter | Works with lyrics view closed | Notes |
|---|---:|---:|---:|---:|---:|---|
| Current stable | TBD | TBD | TBD | TBD | TBD | Extraction spike |
| Current preview | TBD | TBD | TBD | TBD | TBD | Optional |

## 15.7 End-to-end scenarios

1. Start Plasma and bridge before Cider.
2. Start Cider before bridge.
3. Restart bridge during playback.
4. Restart Plasma during playback.
5. Reload plugin during playback.
6. Play a synchronized song.
7. Play an unsynchronized song.
8. Play an instrumental track.
9. Play a song with no lyrics.
10. Pause for several minutes.
11. Seek forward and backward repeatedly.
12. Skip tracks rapidly.
13. Replay the same track.
14. Play consecutive repeated lyric lines.
15. Close the Cider lyric view.
16. Minimize Cider.
17. Suspend and resume the system.
18. Rotate the publisher token.
19. Change bridge port.
20. Upgrade the widget over an existing installation.

---

## 16. Performance requirements

Targets:

- active-line update visible in the widget within 250 ms under normal local conditions;
- bridge processing below 10 ms for normal payloads;
- bridge idle memory below 30 MiB;
- bridge idle CPU effectively zero;
- plugin must not continuously poll faster than 4 Hz;
- no unbounded arrays, queues, logs, or timers;
- no complete lyric history retained by the bridge;
- widget must remain responsive during rapid lyric updates.

Measure latency using timestamps from:

1. extraction event;
2. plugin publication;
3. bridge receipt;
4. widget receipt;
5. widget display update.

Keep instrumentation disabled by default.

---

## 17. Security and privacy requirements

- Bind only to loopback.
- Authenticate all write operations.
- Store the publisher token with `0600` permissions.
- Do not include secrets in URLs.
- Do not log lyric content by default.
- Do not persist lyric state.
- Reject oversized payloads.
- Validate all cross-process data.
- Avoid `eval`, dynamic code execution, and shell interpolation.
- Do not expose Cider authentication information.
- Do not request Apple developer credentials.
- Do not send telemetry.
- Do not fetch remote artwork in the initial widget unless Cider already provides a safe URL and the user enables it.
- Treat all Cider internal object values as untrusted input.

---

## 18. Error handling and user-visible states

| Condition | Plugin behavior | Widget behavior |
|---|---|---|
| Bridge not running | Retry with backoff | Show bridge unavailable or hide |
| Invalid token | Stop retry loop; show settings error | Preserve last known state until expiry |
| Unsupported protocol | Log explicit incompatibility | Show upgrade-required state |
| No track | Publish stopped/empty state | Hide or show waiting state |
| No lyrics | Publish metadata with unavailable kind | Show configured fallback |
| Instrumental section | Publish instrumental line/state | Show instrumental text |
| Source adapter fails | Attempt next adapter | Continue showing last valid state briefly |
| Cider update breaks all adapters | Emit source error diagnostics | Show lyrics unavailable |
| Malformed bridge message | Ignore and log locally | Keep prior valid state |
| System resume | Re-probe bridge and current track | Reconnect immediately |

Errors must be actionable. Avoid generic “Something went wrong” messages where a precise state is known.

---

## 19. Implementation phases

## 19.1 Phase execution protocol

Codex must implement this plan **one phase at a time**. Each phase is a separate task and a hard stopping boundary.

### Rules for every phase

1. Read `AGENTS.md`, this plan, and `docs/phase-status.md`.
2. Select the first phase not marked `complete`.
3. Confirm that only this phase is in scope.
4. State the recommended model and reasoning level for the phase.
5. Mark the phase `in_progress` in `docs/phase-status.md`.
6. Implement every task required by the phase.
7. Run all checks required by the phase and `AGENTS.md`.
8. Fix failures caused by the phase before reporting completion.
9. Update tests, fixtures, and documentation affected by implementation discoveries.
10. Mark the phase `complete` only when all exit criteria pass. Use `blocked` when an external blocker remains.
11. Produce the required completion report.
12. **Stop. Do not begin, scaffold, or partially implement the next phase.**

### Required completion report

End every phase with this exact structure:

```text
PHASE <number> — <name>: COMPLETE | BLOCKED

Implemented:
- ...

Validation:
- <command>: PASS | FAIL | NOT RUN
- ...

Documentation updated:
- ...

Known limitations:
- ...

Next phase:
- Phase <number> — <name>
- Recommended model: GPT-5.6 <model>
- Reasoning: <level>
- Action: Change to this model before asking Codex to continue.
```

When the next phase uses the same configuration, use:

```text
Action: Keep the current model and reasoning level, then ask Codex to continue.
```

For Phase 8, replace the next-phase section with:

```text
Next phase:
- None. The implementation plan is complete.
```

### Continuation prompt

After reviewing the report and changing models when instructed, send:

```text
Continue the KLyric implementation. Read AGENTS.md, the implementation plan,
and docs/phase-status.md. Implement only the next incomplete phase, validate it,
update the status file, report completion, and stop before the following phase.
```

### Phase status file

Create `docs/phase-status.md` during Phase 0:

```markdown
# KLyric phase status

| Phase | Status | Recommended model | Reasoning | Completed |
|---|---|---|---|---|
| 0 — Repository bootstrap | pending | GPT-5.6 Terra | Medium | — |
| 1 — Lyric extraction spike | pending | GPT-5.6 Sol | High | — |
| 2 — Protocol package | pending | GPT-5.6 Terra | High | — |
| 3 — Bridge MVP | pending | GPT-5.6 Terra | High | — |
| 4 — Cider plugin MVP | pending | GPT-5.6 Terra | High | — |
| 5 — Plasma widget MVP | pending | GPT-5.6 Terra | High | — |
| 6 — Integration hardening | pending | GPT-5.6 Sol | High | — |
| 7 — Packaging and installation | pending | GPT-5.6 Terra | Medium | — |
| 8 — Release readiness | pending | GPT-5.6 Sol | High | — |
```

Allowed statuses: `pending`, `in_progress`, `blocked`, and `complete`.

## 19.2 Model schedule

| Phase | Recommended model | Reasoning | Rationale |
|---|---|---|---|
| 0 — Repository bootstrap | GPT-5.6 Terra | Medium | Deterministic setup and configuration |
| 1 — Lyric extraction spike | GPT-5.6 Sol | High | Undocumented Cider internals and uncertain runtime investigation |
| 2 — Protocol package | GPT-5.6 Terra | High | Precise schema and validation work |
| 3 — Bridge MVP | GPT-5.6 Terra | High | Substantial but well-specified backend implementation |
| 4 — Cider plugin MVP | GPT-5.6 Terra | High | Complex integration guided by the completed extraction spike |
| 5 — Plasma widget MVP | GPT-5.6 Terra | High | QML implementation with explicit requirements |
| 6 — Integration hardening | GPT-5.6 Sol | High | Cross-component debugging and compatibility analysis |
| 7 — Packaging and installation | GPT-5.6 Terra | Medium | Mostly deterministic packaging and automation |
| 8 — Release readiness | GPT-5.6 Sol | High | Final security, compatibility, architecture, and release review |

Do not use Max or Ultra by default. Escalate only when the recommended configuration repeatedly fails on a specific blocker, and document why.

Changing models is unnecessary between consecutive phases that use the same configuration. Codex must still stop after every phase.

---

## Phase 0 — Repository bootstrap

**Recommended model:** GPT-5.6 Terra  
**Reasoning:** Medium  
**Scope boundary:** Repository and development foundations only. Do not investigate Cider internals or implement product functionality.

### Tasks

- Create Bun workspace.
- Add root configuration.
- Import official Cider plugin template into `apps/cider-plugin`.
- Replace template names and identifiers.
- Create bridge, protocol, and plasmoid packages.
- Add formatting, linting, typechecking, and CI skeleton.
- Add `AGENTS.md`.
- Add a basic README with architecture and prerequisites.

### Exit criteria

- `bun install` succeeds.
- `bun run typecheck` succeeds.
- `bun run lint` succeeds.
- empty bridge starts.
- empty plasmoid loads.
- Cider loads the renamed plugin.

### Phase completion action

- Set Phase 0 to `complete` in `docs/phase-status.md`.
- Report Phase 1 as next.
- Tell the user to change to **GPT-5.6 Sol with High reasoning**.
- Stop before lyric extraction.

---

## Phase 1 — Lyric extraction spike

**Recommended model:** GPT-5.6 Sol  
**Reasoning:** High  
**Model action:** Change from Terra Medium to Sol High.  
**Scope boundary:** Prove and document lyric extraction only. Do not implement the production bridge, protocol, or Plasma UI.


This phase is a hard gate. Do not build polished UI before completing it.

### Tasks

1. Add redacted capability inspection tools.
2. Inspect Cider while:
   - a synchronized track plays;
   - lyrics view opens and closes;
   - a line changes;
   - playback pauses;
   - the user seeks;
   - the track changes.
3. Identify:
   - complete lyric data location;
   - active line or index;
   - timestamp representation;
   - playback position source;
   - stable subscription mechanism.
4. Implement minimal internal-store adapter.
5. Implement minimal timeline adapter if timestamps are available.
6. Implement DOM fallback.
7. Compare reliability and background behavior.
8. Record findings in `docs/cider-research.md`.
9. Add fixtures for every observed shape.
10. Select initial adapter priority.

### Exit criteria

- Current lyric line is detected on the current stable Cider build.
- Detection works through pause, resume, seek, and track changes.
- Behavior with the lyrics view closed is known and documented.
- At least one automated fixture test exists for the selected adapter.
- All Cider-specific internal names exist only under `src/cider/`.

### Stop condition

If no reliable method can obtain the active line:

- document the observed limitations;
- produce a minimal proof of concept using the least fragile fallback;
- do not claim background or closed-view support;
- open or contribute to the relevant PluginKit API request;
- keep the rest of the implementation behind mock data until access improves.

### Phase completion action

- Set Phase 1 to `complete` only when the extraction gate is satisfied, or `blocked` when the stop condition applies.
- Report Phase 2 as next.
- Tell the user to change to **GPT-5.6 Terra with High reasoning**.
- Stop before implementing the protocol package.

---

## Phase 2 — Protocol package

**Recommended model:** GPT-5.6 Terra  
**Reasoning:** High  
**Model action:** Change from Sol High to Terra High.  
**Scope boundary:** Shared protocol, schemas, fixtures, validation, and protocol documentation only.


### Tasks

- Implement types and schemas.
- Add protocol constants.
- Add fixtures.
- Add validation and normalization.
- Add protocol documentation.
- Export browser-safe and Bun-safe modules.

### Exit criteria

- all protocol unit tests pass;
- malformed and oversized data is rejected;
- fixtures can drive both bridge and widget development.

### Phase completion action

- Set Phase 2 to `complete`.
- Report Phase 3 as next.
- Tell the user to **keep GPT-5.6 Terra with High reasoning**.
- Stop before implementing the bridge.

---

## Phase 3 — Bridge MVP

**Recommended model:** GPT-5.6 Terra  
**Reasoning:** High  
**Model action:** Keep Terra High.  
**Scope boundary:** Bridge implementation and bridge tests only. Use protocol fixtures; do not implement the production Cider publisher or Plasma UI.


### Tasks

- Implement configuration.
- Implement token generation.
- Implement HTTP state endpoint.
- Implement in-memory store.
- Implement WebSocket endpoint.
- Implement health endpoint.
- Implement state expiry.
- Implement logging.
- Implement graceful shutdown.
- Add bridge CLI.
- Add unit and integration tests.

### Exit criteria

- a mock publisher can update a mock WebSocket client;
- reconnecting clients receive latest state;
- unauthorized writes fail;
- state is never persisted;
- integration tests pass.

### Phase completion action

- Set Phase 3 to `complete`.
- Report Phase 4 as next.
- Tell the user to **keep GPT-5.6 Terra with High reasoning**.
- Stop before implementing the production Cider plugin.

---

## Phase 4 — Cider plugin MVP

**Recommended model:** GPT-5.6 Terra  
**Reasoning:** High  
**Model action:** Keep Terra High.  
**Scope boundary:** Production Cider plugin and bridge publication only. Do not implement or restyle the Plasma widget.


### Tasks

- Implement plugin lifecycle.
- Integrate playback source.
- Integrate selected lyric source.
- Implement state machine.
- Implement publication queue.
- Add bridge settings.
- Add connection test.
- Add diagnostics.
- Add cleanup and hot-reload handling.
- Add unit tests from extraction fixtures.

### Exit criteria

- plugin publishes correct state to the bridge;
- no duplicate observers after reload;
- seek and track changes invalidate stale lines;
- plugin handles bridge downtime without affecting Cider;
- token errors are visible and actionable.

### Phase completion action

- Set Phase 4 to `complete`.
- Report Phase 5 as next.
- Tell the user to **keep GPT-5.6 Terra with High reasoning**.
- Stop before implementing the Plasma widget.

---

## Phase 5 — Plasma widget MVP

**Recommended model:** GPT-5.6 Terra  
**Reasoning:** High  
**Model action:** Keep Terra High.  
**Scope boundary:** Plasma 6 widget and widget-specific tests only. Do not begin packaging or broad integration hardening.


### Tasks

- Create Plasma 6 metadata.
- Implement WebSocket client.
- Implement protocol handshake.
- Implement compact panel view.
- Implement popup view.
- Implement reconnect behavior.
- Implement basic appearance settings.
- Add fallback states.
- Add translations scaffolding.
- Run `qmllint`.

### Exit criteria

- widget displays mock and real Cider state;
- horizontal panel mode is usable;
- vertical panel mode degrades cleanly;
- bridge restarts recover automatically;
- invalid messages do not break QML state.

### Phase completion action

- Set Phase 5 to `complete`.
- Report Phase 6 as next.
- Tell the user to change to **GPT-5.6 Sol with High reasoning**.
- Stop before integration hardening.

---

## Phase 6 — Integration hardening

**Recommended model:** GPT-5.6 Sol  
**Reasoning:** High  
**Model action:** Change from Terra High to Sol High.  
**Scope boundary:** End-to-end reliability, compatibility, performance, security verification, and bug fixing. Do not prepare release artifacts yet.


### Tasks

- Run full end-to-end scenario matrix.
- Measure latency.
- harden adapter fallback.
- test Cider minimized and lyrics view closed.
- test suspend/resume.
- test multiple widget instances.
- test systemd restart behavior.
- test Plasma theme and scaling combinations.
- review privacy and logging.
- fix memory leaks and stale timers.

### Exit criteria

- normal update latency is below target;
- all components recover from independent restarts;
- no stale lyric survives a track change;
- no secrets or lyric text appear in normal logs;
- manual test matrix is documented.

### Phase completion action

- Set Phase 6 to `complete`.
- Report Phase 7 as next.
- Tell the user to change to **GPT-5.6 Terra with Medium reasoning**.
- Stop before packaging.

---

## Phase 7 — Packaging and installation

**Recommended model:** GPT-5.6 Terra  
**Reasoning:** Medium  
**Model action:** Change from Sol High to Terra Medium.  
**Scope boundary:** Packaging, installers, service files, release automation, and installation documentation only.


### Tasks

- finalize systemd unit;
- implement local installer and uninstaller;
- package Cider Marketplace ZIP;
- package Plasma widget;
- package bridge release binary;
- add checksums;
- write troubleshooting guide;
- add release workflow;
- optionally create Arch `PKGBUILD`.

### Exit criteria

- clean-machine installation succeeds from release artifacts;
- upgrade preserves settings;
- uninstall removes binaries and packages;
- `--purge` removes KLyric settings;
- service starts automatically after login.

### Phase completion action

- Set Phase 7 to `complete`.
- Report Phase 8 as next.
- Tell the user to change to **GPT-5.6 Sol with High reasoning**.
- Stop before final release review.

---

## Phase 8 — Release readiness

**Recommended model:** GPT-5.6 Sol  
**Reasoning:** High  
**Model action:** Change from Terra Medium to Sol High.  
**Scope boundary:** Final review, compatibility verification, release validation, and `v0.1.0` preparation only.


### Tasks

- confirm licenses for all bundled assets;
- finalize versioning;
- create screenshots;
- write release notes;
- verify Cider stable compatibility;
- verify latest Plasma 6 compatibility;
- verify no development endpoints or debug logs remain enabled;
- tag `v0.1.0`.

### Exit criteria

- CI passes from a clean checkout;
- release artifacts install correctly;
- acceptance criteria pass;
- known limitations are clearly documented.

### Phase completion action

- Set Phase 8 to `complete`.
- Report that no implementation phase remains.
- Do not begin future-work items.

---

## 20. Suggested commit sequence

Use small conventional commits:

1. `chore: bootstrap Bun workspace`
2. `feat(protocol): define KLyric state schema`
3. `feat(bridge): add authenticated state endpoint`
4. `feat(bridge): broadcast state over WebSocket`
5. `test(bridge): add publication integration tests`
6. `research(cider): document lyric state discovery`
7. `feat(plugin): add internal lyric store adapter`
8. `feat(plugin): add timeline lyric adapter`
9. `feat(plugin): add DOM lyric fallback`
10. `feat(plugin): publish normalized state`
11. `feat(plasmoid): add bridge WebSocket client`
12. `feat(plasmoid): render current lyric in panel`
13. `feat(plasmoid): add settings and popup`
14. `fix: handle seeks and repeated lyric lines`
15. `feat(packaging): add systemd user service`
16. `feat(packaging): add local installer`
17. `ci: build and test release artifacts`
18. `docs: add installation and troubleshooting`
19. `release: prepare v0.1.0`

Do not combine the extraction spike with unrelated UI work.

---

## 21. Risk register

| Risk | Probability | Impact | Mitigation |
|---|---:|---:|---|
| Cider exposes no stable lyric state | High | Critical | Adapter architecture; extraction spike; DOM/timeline fallback; document limitations |
| Cider update changes internal store | High | High | Compatibility descriptors; runtime detection; fixtures; graceful fallback |
| Lyrics update only while view is open | Medium | High | Prefer store/timeline source; surface limitation; avoid false promises |
| Electron blocks localhost requests | Medium | High | Test HTTP and WebSocket early; configure CORS; consider plugin-side WebSocket publisher fallback |
| QML WebSocket module unavailable | Low | High | Verify dependency during environment check; document package requirement |
| Background timers are throttled | Medium | Medium | Subscribe to state; schedule boundaries; heartbeat at conservative interval |
| Duplicate lyric text selects wrong occurrence | Medium | Medium | Include index/timestamp; do not identify lines by text alone |
| Token setup is confusing | Medium | Medium | Installer assistance; connection test; explicit diagnostics |
| Plasma panel width becomes excessive | Medium | Medium | configurable max width; elision; tooltip; compact vertical mode |
| Bridge exposed beyond local machine | Low | Critical | hard reject non-loopback bind by default |
| Full lyric text appears in logs | Low | High | structured redaction and tests |
| Cider Marketplace packaging changes | Medium | Medium | keep template scripts close to upstream; isolate packaging logic |

---

## 22. Acceptance criteria

### Functional

- [ ] Playing a synchronized song displays the current line.
- [ ] The panel updates when Cider highlights the next line.
- [ ] Pausing preserves or clears text according to settings.
- [ ] Resuming restores synchronization.
- [ ] Seeking selects the correct line promptly.
- [ ] Track changes clear the prior track’s lyrics before showing new lyrics.
- [ ] Consecutive identical lyric strings are handled correctly.
- [ ] Songs without lyrics use the configured fallback.
- [ ] Instrumental segments display correctly.
- [ ] Cider minimization does not stop updates, when supported by the selected adapter.
- [ ] Bridge restart reconnects without user intervention.
- [ ] Plasma restart reconnects without user intervention.
- [ ] Plugin reload does not create duplicate updates.

### Non-functional

- [ ] Normal visible update latency is at most 250 ms.
- [ ] Bridge binds only to loopback.
- [ ] State writes require authentication.
- [ ] Lyrics are not persisted to disk.
- [ ] Normal logs contain no lyric text or secrets.
- [ ] TypeScript runs in strict mode.
- [ ] Protocol inputs are runtime-validated.
- [ ] QML passes `qmllint`.
- [ ] Install and uninstall paths are documented.
- [ ] All known Cider internals are isolated behind adapters.
- [ ] CI builds all release artifacts.

---

## 23. Definition of done

KLyric `v0.1.0` is done when:

1. a clean installation on a supported Plasma 6 Linux system succeeds;
2. Cider’s current synchronized lyric line appears in a panel widget;
3. the system handles playback, pause, seek, track change, and no-lyrics states;
4. independent component restarts recover automatically;
5. the active Cider integration method and limitations are documented;
6. all automated checks pass;
7. privacy and loopback-only requirements are verified;
8. release artifacts and checksums are published;
9. installation, upgrade, uninstall, diagnostics, and troubleshooting instructions are complete.

---

## 24. Future work

After the MVP is stable:

- use a documented PluginKit lyric API when available;
- add playback controls to the popup;
- add MPRIS fallback metadata;
- add optional per-word progress animation;
- add multiple display styles;
- add desktop-widget layout;
- publish to KDE’s widget store;
- publish to Cider Marketplace;
- support translation fields if Cider exposes them;
- expose a DBus interface as an alternative local transport;
- add Nix and Flatpak-aware packaging;
- support other local clients through the protocol.

---

## 25. Implementation instruction for the coding agent

Implement the project in phase order, with exactly one phase in scope per user request.

### Mandatory behavior

1. Read `AGENTS.md`, this plan, and `docs/phase-status.md` before changing code.
2. Select the first phase not marked `complete`.
3. Announce that phase’s recommended model and reasoning level.
4. Work only on that phase.
5. Treat Phase 1 as a hard technical gate.
6. Keep Cider internal property names confined to the Cider adapter package.
7. Keep each component independently runnable with fixtures.
8. Commit only complete, tested increments.
9. Do not weaken loopback, authentication, validation, or privacy requirements.
10. Document observed Cider behavior and choose the least fragile implementation.
11. Update the plan and `docs/cider-research.md` when discoveries invalidate assumptions.
12. Update `docs/phase-status.md` at phase end.
13. Produce the completion report from Section 19.1.
14. Remind the user which model and reasoning level to use next.
15. Stop before doing any work belonging to the next phase.

### Prohibited behavior

- Do not implement multiple phases in one request.
- Do not continue automatically after reporting completion.
- Do not preemptively scaffold a later phase unless the active phase explicitly requires a shared placeholder.
- Do not mark a phase complete while checks or exit criteria remain unresolved.
- Do not use future-work items to expand the current phase.
- Do not change the model recommendation without documenting a concrete blocker.

### Initial instruction

From a fresh repository, implement **Phase 0 only** using **GPT-5.6 Terra with Medium reasoning**. At completion, instruct the user to switch to **GPT-5.6 Sol with High reasoning** for Phase 1 and stop.
