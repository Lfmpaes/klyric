import QtQuick
import QtWebSockets
import org.kde.plasma.core as PlasmaCore
import org.kde.plasma.plasmoid
import "js/Formatting.js" as Formatting
import "js/Protocol.js" as Protocol

PlasmoidItem {
    id: root

    property string connectionState: "disconnected"
    property var lyricState: null
    property string displayText: ""
    property bool protocolCompatible: true
    property int reconnectAttempt: 0
    property double lastMessageAt: 0
    property double connectedAt: 0
    property string bridgeVersion: ""
    property string bridgeError: ""
    property bool helloReceived: false
    property var pendingStoppedState: null

    // Plasma 6 exposes applet settings through the Plasmoid singleton. The
    // unqualified `configuration` object used by older examples is not
    // injected into this root context in a real panel containment.
    readonly property var configuration: Plasmoid.configuration

    readonly property string bridgeUrl: "ws://" + configuration.bridgeHost + ":" + configuration.bridgePort + "/v1/events"
    readonly property bool verticalPanel: Plasmoid.formFactor === PlasmaCore.Types.Vertical
    readonly property bool shouldHide: (configuration.hideWhenStopped && lyricState && lyricState.playbackStatus === "stopped")
                              || (configuration.hideWhenUnavailable && connectionState !== "connected")
    readonly property bool showTextInCompact: !verticalPanel || configuration.verticalTextEnabled

    function updateDisplayText() {
        displayText = Formatting.fallbackText(lyricState, configuration, connectionState)
    }

    function isLoopbackHost(host) {
        return host === "127.0.0.1" || host === "::1" || host === "localhost"
    }

    function sendHello() {
        socket.sendTextMessage(JSON.stringify({
            type: "hello",
            protocolVersion: Protocol.PROTOCOL_VERSION,
            client: "plasmoid",
            clientVersion: "0.1.1"
        }))
    }

    function connectToBridge() {
        reconnectTimer.stop()
        if (!isLoopbackHost(configuration.bridgeHost)) {
            connectionState = "disconnected"
            bridgeError = i18n("The bridge host must be a loopback address.")
            updateDisplayText()
            return
        }
        protocolCompatible = true
        helloReceived = false
        bridgeError = ""
        connectionState = "connecting"
        socket.active = true
        updateDisplayText()
    }

    function scheduleReconnect() {
        if (!configuration.reconnectEnabled || !protocolCompatible || reconnectTimer.running)
            return
        var intervals = [500, 1000, 2000, 5000, 10000, 30000]
        var base = intervals[Math.min(reconnectAttempt, intervals.length - 1)]
        reconnectAttempt += 1
        reconnectTimer.interval = Math.round(base * (0.85 + Math.random() * 0.3))
        reconnectTimer.start()
    }

    function receiveMessage(rawMessage) {
        var message = Protocol.parseServerMessage(rawMessage)
        if (message === null) {
            bridgeError = i18n("The bridge sent an invalid message.")
            return
        }
        if (message.type === "unknown")
            return
        if (message.type === "incompatible") {
            protocolCompatible = false
            connectionState = "incompatible"
            bridgeError = i18n("The bridge uses an incompatible protocol version.")
            socket.active = false
            updateDisplayText()
            return
        }
        lastMessageAt = Date.now()
        if (message.type === "hello") {
            helloReceived = true
            bridgeVersion = message.bridgeVersion
            protocolCompatible = true
            return
        }
        if (!helloReceived) {
            bridgeError = i18n("The bridge did not complete its handshake.")
            socket.active = false
            return
        }
        if (message.type === "state") {
            if (message.payload.playbackStatus === "stopped" && configuration.clearDelayMs > 0
                    && lyricState !== null && lyricState.playbackStatus !== "stopped") {
                pendingStoppedState = message.payload
                stopClearTimer.interval = configuration.clearDelayMs
                stopClearTimer.restart()
                return
            }
            stopClearTimer.stop()
            pendingStoppedState = null
            lyricState = message.payload
            updateDisplayText()
            return
        }
        if (message.type === "state-cleared") {
            stopClearTimer.stop()
            pendingStoppedState = null
            lyricState = null
            updateDisplayText()
            return
        }
        if (message.type === "ping") {
            socket.sendTextMessage(JSON.stringify({ type: "pong", timestamp: message.timestamp }))
            return
        }
        if (message.type === "error") {
            bridgeError = message.message
            return
        }
    }

    compactRepresentation: CompactRepresentation {
        visible: !root.shouldHide
        displayText: root.displayText
        connectionState: root.connectionState
        showText: root.showTextInCompact
        showMusicIcon: root.configuration.showMusicIcon
        showConnectionBadge: root.configuration.showConnectionStatus || root.configuration.showConnectionBadge
        maximumWidth: root.configuration.maximumWidth
        minimumWidth: root.configuration.minimumWidth
        visibleLines: root.configuration.visibleLines
        alignment: root.configuration.alignment
        fontSizeAdjustment: root.configuration.fontSizeAdjustment
        fontWeight: root.configuration.fontWeight
        animationsEnabled: root.configuration.animationsEnabled
        tooltipText: root.tooltipText
        verticalPanel: root.verticalPanel
    }

    fullRepresentation: FullRepresentation {
        lyricState: root.lyricState
        displayText: root.displayText
        connectionState: root.connectionState
        bridgeError: root.bridgeError
        bridgeVersion: root.bridgeVersion
        lastMessageAt: root.lastMessageAt
        showPreviousLine: root.configuration.showPreviousLine
        showNextLine: root.configuration.showNextLine
        showActiveSource: root.configuration.showActiveSource
        showLastUpdateAge: root.configuration.showLastUpdateAge
        tooltipDetailsEnabled: root.configuration.tooltipDetailsEnabled
    }

    readonly property string tooltipText: {
        if (!configuration.tooltipDetailsEnabled)
            return displayText
        var detail = displayText
        if (lyricState && lyricState.track && lyricState.track.title) {
            detail += "\n" + lyricState.track.title
            if (lyricState.track.artist)
                detail += " — " + lyricState.track.artist
        }
        return detail + "\n" + Formatting.connectionText(connectionState)
    }

    toolTipMainText: displayText
    toolTipSubText: configuration.tooltipDetailsEnabled ? Formatting.connectionText(connectionState) : ""

    Timer {
        id: reconnectTimer
        repeat: false
        onTriggered: root.connectToBridge()
    }

    Timer {
        id: stableConnectionTimer
        interval: 10000
        repeat: false
        onTriggered: root.reconnectAttempt = 0
    }

    Timer {
        id: stopClearTimer
        repeat: false
        onTriggered: {
            root.lyricState = root.pendingStoppedState
            root.pendingStoppedState = null
            root.updateDisplayText()
        }
    }

    WebSocket {
        id: socket
        url: root.bridgeUrl
        active: false
        onStatusChanged: function(status) {
            if (status === WebSocket.Open) {
                root.connectionState = "connected"
                root.connectedAt = Date.now()
                root.sendHello()
                stableConnectionTimer.restart()
            } else if (status === WebSocket.Closed) {
                stableConnectionTimer.stop()
                // QtWebSockets keeps `active` true after a failed connection.
                // Clear it before the retry timer fires so assigning true in
                // connectToBridge() starts a fresh socket instead of becoming
                // a no-op.
                socket.active = false
                if (root.connectionState !== "incompatible")
                    root.connectionState = "disconnected"
                root.updateDisplayText()
                root.scheduleReconnect()
            }
        }
        onErrorStringChanged: function(errorString) {
            if (errorString.length > 0)
                root.bridgeError = errorString
        }
        onTextMessageReceived: function(message) {
            root.receiveMessage(message)
        }
    }

    Connections {
        target: configuration
        function onBridgeHostChanged() { root.connectToBridge() }
        function onBridgePortChanged() { root.connectToBridge() }
        function onReconnectEnabledChanged() {
            if (root.connectionState === "disconnected" && configuration.reconnectEnabled)
                root.scheduleReconnect()
        }
    }

    Connections {
        target: Qt.application
        function onStateChanged() {
            if (Qt.application.state === Qt.ApplicationActive)
                root.connectToBridge()
        }
    }

    Component.onCompleted: {
        updateDisplayText()
        connectToBridge()
    }

    Component.onDestruction: {
        reconnectTimer.stop()
        stableConnectionTimer.stop()
        stopClearTimer.stop()
        socket.active = false
    }
}
