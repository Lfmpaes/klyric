.pragma library

var PROTOCOL_VERSION = 1
var MAX_PAYLOAD_BYTES = 64 * 1024
var MAX_LYRIC_CODE_POINTS = 2000
var MAX_TRACK_CODE_POINTS = 500
var PLAYBACK_STATUSES = ["playing", "paused", "stopped", "loading", "unknown"]
var LYRICS_KINDS = ["word-synced", "line-synced", "unsynced", "instrumental", "unavailable"]
var SOURCE_KINDS = ["public-api", "internal-store", "dom", "timeline", "none"]
var CLEAR_REASONS = ["expired", "publisher-disconnected", "manual"]
var INVALID = {}

function has(values, value) {
    return values.indexOf(value) !== -1
}

function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value)
}

function isSafeNonNegativeInteger(value) {
    return typeof value === "number" && isFinite(value) && Math.floor(value) === value && value >= 0 && value <= 9007199254740991
}

function text(value, maximum, required) {
    if (typeof value !== "string")
        return INVALID
    var normalized = value.trim()
    if ((Array.from ? Array.from(normalized).length : normalized.length) > maximum)
        return null
    if (required && normalized.length === 0)
        return null
    return normalized.length === 0 ? null : normalized
}

function utf8ByteLength(value) {
    var length = 0
    for (var i = 0; i < value.length; i++) {
        var code = value.charCodeAt(i)
        if (code < 0x80)
            length += 1
        else if (code < 0x800)
            length += 2
        else if (code >= 0xd800 && code <= 0xdbff && i + 1 < value.length && value.charCodeAt(i + 1) >= 0xdc00 && value.charCodeAt(i + 1) <= 0xdfff) {
            length += 4
            i += 1
        } else
            length += 3
    }
    return length
}

function line(value) {
    if (value === null)
        return null
    if (!isObject(value))
        return undefined
    var valueText = text(value.text, MAX_LYRIC_CODE_POINTS, false)
    if (valueText === INVALID)
        return undefined
    if (valueText === null)
        return null
    if (valueText === undefined)
        return undefined
    var result = { text: valueText }
    var numericKeys = ["startTimeMs", "endTimeMs", "index"]
    for (var i = 0; i < numericKeys.length; i++) {
        var key = numericKeys[i]
        if (value[key] !== undefined) {
            if (!isSafeNonNegativeInteger(value[key]))
                return undefined
            result[key] = value[key]
        }
    }
    if (result.startTimeMs !== undefined && result.endTimeMs !== undefined && result.endTimeMs < result.startTimeMs)
        return undefined
    if (value.isInstrumental !== undefined) {
        if (typeof value.isInstrumental !== "boolean")
            return undefined
        result.isInstrumental = value.isInstrumental
    }
    return result
}

function track(value) {
    if (value === null)
        return null
    if (!isObject(value))
        return undefined
    var result = {}
    var textKeys = ["id", "title", "artist", "album"]
    for (var i = 0; i < textKeys.length; i++) {
        var key = textKeys[i]
        if (value[key] !== undefined) {
            var normalized = text(value[key], MAX_TRACK_CODE_POINTS, false)
            if (normalized === INVALID)
                return undefined
            if (normalized !== null)
                result[key] = normalized
        }
    }
    if (value.artworkUrl !== undefined) {
        var artworkUrl = text(value.artworkUrl, 2048, false)
        if (artworkUrl === INVALID)
            return undefined
        if (artworkUrl !== null)
            result.artworkUrl = artworkUrl
    }
    if (value.durationMs !== undefined) {
        if (!isSafeNonNegativeInteger(value.durationMs))
            return undefined
        result.durationMs = value.durationMs
    }
    return result
}

function state(value) {
    var sessionId = isObject(value) ? text(value.sessionId, 128, true) : INVALID
    if (!isObject(value) || value.protocolVersion !== PROTOCOL_VERSION || !isSafeNonNegativeInteger(value.sequence)
            || sessionId === INVALID || sessionId === null || !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(sessionId) || !has(PLAYBACK_STATUSES, value.playbackStatus)
            || !has(LYRICS_KINDS, value.lyricsKind) || !has(SOURCE_KINDS, value.sourceKind)
            || typeof value.hasLyrics !== "boolean" || typeof value.stale !== "boolean")
        return null
    var emittedAt = text(value.emittedAt, 128, true)
    if (emittedAt === INVALID || emittedAt === null || isNaN(Date.parse(emittedAt)))
        return null
    var parsedTrack = track(value.track)
    var currentLine = line(value.currentLine)
    var previousLine = line(value.previousLine)
    var nextLine = line(value.nextLine)
    if (parsedTrack === undefined || currentLine === undefined || previousLine === undefined || nextLine === undefined)
        return null
    if (value.lyricsKind === "unavailable" && (value.hasLyrics || currentLine || previousLine || nextLine))
        return null
    var result = {
        protocolVersion: PROTOCOL_VERSION, sequence: value.sequence, sessionId: sessionId,
        emittedAt: emittedAt, playbackStatus: value.playbackStatus, track: parsedTrack,
        lyricsKind: value.lyricsKind, sourceKind: value.sourceKind, currentLine: currentLine,
        previousLine: previousLine, nextLine: nextLine, hasLyrics: value.hasLyrics, stale: value.stale
    }
    if (value.positionMs !== undefined) {
        if (!isSafeNonNegativeInteger(value.positionMs))
            return null
        result.positionMs = value.positionMs
    }
    var optionalBooleans = ["trackHasLyrics", "lyricsPanelOpen"]
    for (var i = 0; i < optionalBooleans.length; i++) {
        var key = optionalBooleans[i]
        if (value[key] !== undefined) {
            if (typeof value[key] !== "boolean")
                return null
            result[key] = value[key]
        }
    }
    return result
}

function serverMessage(value) {
    if (!isObject(value) || typeof value.type !== "string")
        return null
    if (value.type === "hello") {
        var bridgeVersion = text(value.bridgeVersion, 128, true)
        if (value.protocolVersion !== PROTOCOL_VERSION && typeof value.protocolVersion === "number")
            return { type: "incompatible" }
        return value.protocolVersion === PROTOCOL_VERSION && bridgeVersion !== INVALID && bridgeVersion !== null
                ? { type: "hello", protocolVersion: PROTOCOL_VERSION, bridgeVersion: bridgeVersion } : null
    }
    if (value.type === "state") {
        var payload = state(value.payload)
        return payload === null ? null : { type: "state", payload: payload }
    }
    if (value.type === "state-cleared")
        return has(CLEAR_REASONS, value.reason) ? { type: "state-cleared", reason: value.reason } : null
    if (value.type === "ping")
        return isSafeNonNegativeInteger(value.timestamp) ? { type: "ping", timestamp: value.timestamp } : null
    if (value.type === "error") {
        var code = text(value.code, 64, true)
        var message = text(value.message, 500, true)
        return code !== INVALID && code !== null && message !== INVALID && message !== null ? { type: "error", code: code, message: message } : null
    }
    return { type: "unknown" }
}

function parseServerMessage(json) {
    if (typeof json !== "string" || utf8ByteLength(json) > MAX_PAYLOAD_BYTES)
        return null
    try {
        return serverMessage(JSON.parse(json))
    } catch (error) {
        return null
    }
}
