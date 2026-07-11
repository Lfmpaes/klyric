export const observedCider318 = {
  version: "3.1.8",
  idle: {
    publicLyricsApi: false,
    internalLyricsStore: false,
    lyricDom: false,
    playbackAudioElement: false,
  },
  playingWithLyricsOpen: {
    containerSelector: ".lyric-view-content",
    lineSelector: ".lyric-line",
    activeLineSelector: ".lyric-line.active",
    textSelector: ".lyric-text",
    translatedTextSelector: ".lyric-text-translated",
    hasLineTimestamps: false,
    playbackPositionSource: "MusicKit.currentPlaybackTime",
    subscriptionMechanism: "MutationObserver",
  },
  playingWithLyricsClosed: {
    lyricDom: false,
    lineCount: 0,
    playbackContinues: true,
  },
  minimizedWithLyricsOpen: {
    lyricDom: true,
    playbackContinues: true,
  },
} as const;
