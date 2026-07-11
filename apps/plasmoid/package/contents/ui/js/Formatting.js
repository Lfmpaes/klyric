function fallbackText(state, configuration, connectionState) {
    if (state && state.playbackStatus === "paused" && configuration.pausedBehavior === "track-fallback")
        return trackText(state, configuration) || i18n("Waiting for Cider")
    if (state && state.currentLine && state.currentLine.text)
        return state.currentLine.text
    if (state && state.lyricsKind === "instrumental")
        return configuration.instrumentalText || i18n("Instrumental")
    if (state && state.lyricsKind === "unsynced")
        return configuration.noLyricsText || i18n("Lyrics unavailable")
    var track = trackText(state, configuration)
    if (track)
        return track
    return connectionState === "connected" ? i18n("Waiting for Cider") : i18n("KLyric bridge unavailable")
}

function trackText(state, configuration) {
    if (!state || !configuration.showTrackFallback || !state.track)
        return ""
    if (state.track.title && state.track.artist)
        return state.track.title + " — " + state.track.artist
    return state.track.title || state.track.artist || ""
}

function connectionText(state) {
    if (state === "connected")
        return i18n("Connected")
    if (state === "connecting")
        return i18n("Connecting")
    if (state === "incompatible")
        return i18n("Protocol incompatible")
    return i18n("Disconnected")
}

function ageText(lastMessageAt) {
    if (!lastMessageAt)
        return i18n("No updates received")
    var seconds = Math.max(0, Math.floor((Date.now() - lastMessageAt) / 1000))
    return i18np("%1 second ago", "%1 seconds ago", seconds)
}
