interface DevToolsTarget {
  title: string;
  type: string;
  url: string;
  webSocketDebuggerUrl: string;
}

interface ProtocolResponse {
  id?: number;
  result?: {
    result?: {
      value?: unknown;
      description?: string;
    };
    exceptionDetails?: unknown;
  };
}

const endpoint = process.env.CIDER_DEVTOOLS_URL ?? "http://127.0.0.1:9222/json";
const targets = (await fetch(endpoint).then((response) =>
  response.json(),
)) as DevToolsTarget[];
const target = targets.find(
  (candidate) => candidate.type === "page" && /cider/i.test(candidate.title),
);
if (target === undefined) throw new Error("No Cider renderer target found");
const researchAction = process.env.CIDER_RESEARCH_ACTION ?? "inspect";
const researchTrack =
  process.env.CIDER_RESEARCH_TRACK ?? "Bohemian Rhapsody Queen";

const expression = `(async () => {
  const plugin = await import('/plugins/dev.luizpaes.klyric/plugin.js?phase1-research=2');
  const report = plugin.runCapabilityInspection(globalThis, document);
  const safeKeys = (value) => value && (typeof value === 'object' || typeof value === 'function')
    ? Object.getOwnPropertyNames(value).filter((key) => /lyric|store|pinia|play|pause|seek|time|player|music|audio|queue/i.test(key)).sort()
    : [];
  const safeShape = (root, maxDepth = 3) => {
    const result = {};
    const seen = new WeakSet();
    const visit = (value, prefix, depth) => {
      if (!value || (typeof value !== 'object' && typeof value !== 'function') || seen.has(value) || depth > maxDepth) return;
      seen.add(value);
      for (const key of Object.getOwnPropertyNames(value).sort()) {
        if (/token|secret|cookie|authorization|account|user/i.test(key)) continue;
        let child;
        try { child = value[key]; } catch { result[prefix + key] = 'unreadable'; continue; }
        const type = Array.isArray(child) ? 'array' : typeof child;
        result[prefix + key] = type;
        if (Object.keys(result).length >= 300) return;
        if (depth < 1 || /lyric|ttml|timed|relationship|attribute|current|playback|line|content/i.test(key)) {
          visit(child, prefix + key + '.', depth + 1);
        }
      }
    };
    visit(root, '', 0);
    return result;
  };
  const pluginSystem = globalThis.__PLUGINSYS__;
  const stores = globalThis.$$stores;
  const storeNames = stores && typeof stores === 'object'
    ? Object.keys(stores).filter((key) => /lyric|music|player|playback|queue/i.test(key)).sort()
    : [];
  const redactedStoreRegistryKeys = stores && typeof stores === 'object'
    ? Object.getOwnPropertyNames(stores)
        .filter((key) => !/token|secret|cookie|authorization|account|user/i.test(key))
        .sort()
        .slice(0, 200)
    : [];
  const safeStoreShapes = Object.fromEntries(storeNames.map((name) => {
    const store = stores[name];
    const shape = store && typeof store === 'object'
      ? Object.keys(store)
          .filter((key) => !/token|secret|cookie|authorization|account|lyric|text/i.test(key))
          .sort()
          .slice(0, 200)
          .map((key) => [key, Array.isArray(store[key]) ? 'array' : typeof store[key]])
      : [];
    return [name, Object.fromEntries(shape)];
  }));
  const musicKit = globalThis.MusicKit;
  const ciderAudio = globalThis.CiderAudio;
  const audioPlayer = globalThis.audioPlayer;
  let music = null;
  try { music = musicKit?.getInstance?.() ?? null; } catch {}
  let actionResult = 'not-requested';
  if (${JSON.stringify(researchAction)} === 'play-test') {
    try {
      const search = await music?.api?.search?.(${JSON.stringify(researchTrack)}, {
        types: ['songs'], limit: 1
      });
      const item = search?.songs?.data?.[0];
      if (typeof item?.id === 'string') {
        await music.setQueue({ song: item.id });
        await music.play();
        await new Promise((resolve) => setTimeout(resolve, 3000));
        actionResult = 'started';
      } else {
        actionResult = 'no-catalog-result';
      }
    } catch {
      actionResult = 'failed';
    }
  }
  if (${JSON.stringify(researchAction)} === 'open-lyrics') {
    const control = document.querySelector(
      '[aria-label*="lyric" i], [title*="lyric" i], [data-testid*="lyric" i]'
    );
    if (control instanceof HTMLElement) {
      control.click();
      await new Promise((resolve) => setTimeout(resolve, 1500));
      actionResult = 'clicked';
    } else {
      actionResult = 'control-not-found';
    }
  }
  if (${JSON.stringify(researchAction)} === 'pause-resume') {
    const before = music?.currentPlaybackTime ?? null;
    await music?.pause?.();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const paused = music?.isPlaying === false;
    const during = music?.currentPlaybackTime ?? null;
    await music?.play?.();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    actionResult = { paused, resumed: music?.isPlaying === true, timeHeld: before !== null && during !== null && Math.abs(during - before) < 0.5 };
  }
  if (${JSON.stringify(researchAction)} === 'seek-test') {
    const before = music?.currentPlaybackTime ?? null;
    if (typeof before === 'number') await music?.seekToTime?.(before + 15);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const after = music?.currentPlaybackTime ?? null;
    actionResult = { seekedForward: typeof after === 'number' && after > before + 10 };
  }
  if (${JSON.stringify(researchAction)} === 'track-change') {
    const before = music?.nowPlayingItem;
    try {
      const search = await music?.api?.search?.('Believer Imagine Dragons', {
        types: ['songs'], limit: 1
      });
      const item = search?.songs?.data?.[0];
      if (typeof item?.id === 'string') {
        await music.setQueue({ song: item.id });
        await music.play();
        await new Promise((resolve) => setTimeout(resolve, 3000));
        actionResult = { changed: music?.nowPlayingItem !== before, playing: music?.isPlaying === true };
      } else {
        actionResult = 'no-catalog-result';
      }
    } catch {
      actionResult = 'failed';
    }
  }
  if (${JSON.stringify(researchAction)} === 'close-lyrics') {
    const control = document.querySelector('.lyrics-button.active, [title="Lyrics"]');
    if (control instanceof HTMLElement) {
      control.click();
      await new Promise((resolve) => setTimeout(resolve, 1000));
      actionResult = 'clicked';
    } else {
      actionResult = 'control-not-found';
    }
  }
  if (${JSON.stringify(researchAction)} === 'minimize-test') {
    const control = document.querySelector(
      '[aria-label*="minimize" i], [title*="minimize" i]'
    );
    if (control instanceof HTMLElement) {
      control.click();
      await new Promise((resolve) => setTimeout(resolve, 1500));
      actionResult = 'clicked';
    } else {
      actionResult = 'control-not-found';
    }
  }
  const containers = document.querySelectorAll(
    '[data-testid*="lyric" i], [aria-label*="lyric" i], [role="log"][aria-live]'
  );
  const activeLines = document.querySelectorAll(
    '[aria-current="true"], [aria-current="step"], [data-active="true"], [data-current="true"]'
  );
  const audio = document.querySelector('audio');
  const lyricControls = Array.from(document.querySelectorAll(
    '[aria-label*="lyric" i], [title*="lyric" i], [data-testid*="lyric" i]'
  )).slice(0, 20).map((element) => ({
    tag: element.tagName,
    classes: Array.from(element.classList),
    ariaLabel: element.getAttribute('aria-label'),
    ariaPressed: element.getAttribute('aria-pressed'),
    disabled: element.hasAttribute('disabled'),
    title: element.getAttribute('title'),
    testId: element.getAttribute('data-testid'),
  }));
  const lyricElements = Array.from(document.querySelectorAll('.lyric-line'));
  const activeLyric = document.querySelector('.lyric-line.active');
  const activeLyricIndex = activeLyric === null ? null : lyricElements.indexOf(activeLyric);
  const lyricDomMarkers = Array.from(new Set(Array.from(document.querySelectorAll(
    '[class*="lyric" i], [id*="lyric" i]'
  )).flatMap((element) => Array.from(element.classList).filter((name) => /lyric|active|current/i.test(name))))).sort();
  const customElementMarkers = Array.from(document.querySelectorAll('*'))
    .filter((element) => element.tagName.includes('-') || /lyric/i.test(element.tagName) || element.shadowRoot)
    .slice(0, 100)
    .map((element) => ({
      tag: element.tagName,
      hasShadowRoot: element.shadowRoot !== null,
      classes: Array.from(element.classList).filter((name) => /lyric|active|current/i.test(name)),
    }));
  return {
    ...report,
    renderer: {
      routeHasLyrics: /lyric/i.test(location.hash),
      documentVisibility: document.visibilityState,
      lyricContainerCount: containers.length,
      activeLineMarkerCount: activeLines.length,
      audioPresent: audio !== null,
      audioPaused: audio?.paused ?? null,
      musicKitPresent: musicKit !== undefined,
      musicInstancePresent: music !== null,
      musicAuthorized: typeof music?.isAuthorized === 'boolean' ? music.isAuthorized : null,
      musicPlaying: typeof music?.isPlaying === 'boolean' ? music.isPlaying : null,
      playbackStateType: typeof music?.playbackState,
      playbackTimeAvailable: typeof music?.currentPlaybackTime === 'number',
      queueItemCount: Array.isArray(music?.queue?.items) ? music.queue.items.length : null,
      researchAction: actionResult,
      lyricControls,
      lyricDomMarkers,
      lyricLineCount: lyricElements.length,
      activeLyricIndex,
      customElementMarkers,
    },
    safeShapeNames: {
      global: safeKeys(globalThis),
      musicKit: safeKeys(musicKit),
      musicInstance: safeKeys(music),
      musicInstancePrototype: safeKeys(Object.getPrototypeOf(music ?? {})),
      ciderAudio: safeKeys(ciderAudio),
      ciderAudioPrototype: safeKeys(Object.getPrototypeOf(ciderAudio ?? {})),
      ciderAudioStore: ciderAudio?.store && typeof ciderAudio.store === 'object'
        ? Object.getOwnPropertyNames(ciderAudio.store)
            .filter((key) => !/token|secret|cookie|authorization|account|user|lyric|text/i.test(key))
            .sort()
            .slice(0, 200)
        : [],
      audioPlayer: audioPlayer && (typeof audioPlayer === 'object' || typeof audioPlayer === 'function')
        ? Object.getOwnPropertyNames(audioPlayer)
            .filter((key) => !/token|secret|cookie|authorization|account|user|lyric|text/i.test(key))
            .sort()
            .slice(0, 200)
        : [],
      audioPlayerPrototype: safeKeys(Object.getPrototypeOf(audioPlayer ?? {})),
      nowPlayingShape: safeShape(music?.nowPlayingItem ?? audioPlayer?._nowPlayingItem),
      activeLyricComponentShape: safeShape(activeLyric?.__vueParentComponent, 2),
      activeLyricOwnKeys: activeLyric === null
        ? []
        : Object.getOwnPropertyNames(activeLyric).sort().slice(0, 100),
      activeLyricAttributes: activeLyric === null
        ? {}
        : Object.fromEntries(Array.from(activeLyric.attributes)
            .filter((attribute) => !/text|content/i.test(attribute.name))
            .map((attribute) => [attribute.name, attribute.value])),
      pluginSystem: safeKeys(pluginSystem),
      pluginSystemNested: pluginSystem && typeof pluginSystem === 'object'
        ? Object.fromEntries(safeKeys(pluginSystem).map((key) => [key, safeKeys(pluginSystem[key])]))
        : {},
      storeRegistryType: Object.prototype.toString.call(stores),
      redactedStoreRegistryKeys,
      storeRegistryPrototypeKeys: stores && typeof stores === 'object'
        ? Object.getOwnPropertyNames(Object.getPrototypeOf(stores) ?? {})
            .filter((key) => !/token|secret|cookie|authorization|account|user/i.test(key))
            .sort()
            .slice(0, 200)
        : [],
      matchingStoreNames: storeNames,
      matchingStoreShapes: safeStoreShapes,
    },
  };
})()`;

const result = await evaluate(target.webSocketDebuggerUrl, expression);
console.info(JSON.stringify(result, null, 2));

async function evaluate(
  webSocketUrl: string,
  source: string,
): Promise<unknown> {
  return await new Promise((resolve, reject) => {
    const socket = new WebSocket(webSocketUrl);
    const timer = setTimeout(() => {
      socket.close();
      reject(new Error("Cider inspection timed out"));
    }, 10_000);

    socket.addEventListener("open", () => {
      socket.send(
        JSON.stringify({
          id: 1,
          method: "Runtime.evaluate",
          params: {
            expression: source,
            awaitPromise: true,
            returnByValue: true,
          },
        }),
      );
    });
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data)) as ProtocolResponse;
      if (message.id !== 1) return;
      clearTimeout(timer);
      socket.close();
      if (message.result?.exceptionDetails !== undefined) {
        reject(
          new Error(
            message.result.result?.description ?? "Cider inspection failed",
          ),
        );
        return;
      }
      resolve(message.result?.result?.value);
    });
    socket.addEventListener("error", () => {
      clearTimeout(timer);
      reject(new Error("Unable to connect to Cider DevTools"));
    });
  });
}
