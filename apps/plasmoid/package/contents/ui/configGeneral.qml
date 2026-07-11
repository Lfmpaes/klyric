import QtQuick
import QtQuick.Controls
import org.kde.kirigami as Kirigami

Kirigami.FormLayout {
    id: page

    property bool loopbackHost: plasmoid.configuration.bridgeHost === "127.0.0.1"
                              || plasmoid.configuration.bridgeHost === "::1"
                              || plasmoid.configuration.bridgeHost === "localhost"

    TextField {
        Kirigami.FormData.label: i18n("Bridge host:")
        text: plasmoid.configuration.bridgeHost
        placeholderText: "127.0.0.1"
        onTextChanged: plasmoid.configuration.bridgeHost = text.trim()
    }

    Label {
        Kirigami.FormData.label: ""
        visible: !page.loopbackHost
        text: i18n("KLyric only connects to a loopback bridge. Use 127.0.0.1, ::1, or localhost.")
        wrapMode: Text.Wrap
        color: Kirigami.Theme.negativeTextColor
    }

    SpinBox {
        Kirigami.FormData.label: i18n("Bridge port:")
        from: 1
        to: 65535
        value: plasmoid.configuration.bridgePort
        onValueModified: plasmoid.configuration.bridgePort = value
    }

    CheckBox {
        Kirigami.FormData.label: i18n("Connection")
        text: i18n("Reconnect automatically")
        checked: plasmoid.configuration.reconnectEnabled
        onToggled: plasmoid.configuration.reconnectEnabled = checked
    }

    CheckBox {
        text: i18n("Show connection status in the panel")
        checked: plasmoid.configuration.showConnectionStatus
        onToggled: plasmoid.configuration.showConnectionStatus = checked
    }

    SpinBox {
        Kirigami.FormData.label: i18n("Appearance")
        textFromValue: function(value) { return i18n("Font size adjustment: %1", value) }
        from: -6
        to: 12
        value: plasmoid.configuration.fontSizeAdjustment
        onValueModified: plasmoid.configuration.fontSizeAdjustment = value
    }

    ComboBox {
        Kirigami.FormData.label: i18n("Font weight:")
        model: [i18n("Normal"), i18n("Medium"), i18n("Bold")]
        currentIndex: plasmoid.configuration.fontWeight === "bold" ? 2 : plasmoid.configuration.fontWeight === "medium" ? 1 : 0
        onActivated: function(index) { plasmoid.configuration.fontWeight = ["normal", "medium", "bold"][index] }
    }

    SpinBox {
        Kirigami.FormData.label: i18n("Maximum width:")
        from: 80
        to: 1200
        value: plasmoid.configuration.maximumWidth
        onValueModified: plasmoid.configuration.maximumWidth = value
    }

    SpinBox {
        Kirigami.FormData.label: i18n("Minimum width:")
        from: 0
        to: 800
        value: plasmoid.configuration.minimumWidth
        onValueModified: plasmoid.configuration.minimumWidth = value
    }

    ComboBox {
        Kirigami.FormData.label: i18n("Visible lyric lines:")
        model: [i18n("One"), i18n("Two")]
        currentIndex: plasmoid.configuration.visibleLines === 2 ? 1 : 0
        onActivated: function(index) { plasmoid.configuration.visibleLines = index + 1 }
    }

    ComboBox {
        Kirigami.FormData.label: i18n("Alignment:")
        model: [i18n("Left"), i18n("Center"), i18n("Right")]
        currentIndex: plasmoid.configuration.alignment === "center" ? 1 : plasmoid.configuration.alignment === "right" ? 2 : 0
        onActivated: function(index) { plasmoid.configuration.alignment = ["left", "center", "right"][index] }
    }

    CheckBox {
        text: i18n("Show music icon")
        checked: plasmoid.configuration.showMusicIcon
        onToggled: plasmoid.configuration.showMusicIcon = checked
    }

    CheckBox {
        text: i18n("Show title and artist when lyrics are unavailable")
        checked: plasmoid.configuration.showTrackFallback
        onToggled: plasmoid.configuration.showTrackFallback = checked
    }

    CheckBox {
        text: i18n("Use text in vertical panels")
        checked: plasmoid.configuration.verticalTextEnabled
        onToggled: plasmoid.configuration.verticalTextEnabled = checked
    }

    CheckBox {
        text: i18n("Hide when playback is stopped")
        checked: plasmoid.configuration.hideWhenStopped
        onToggled: plasmoid.configuration.hideWhenStopped = checked
    }

    CheckBox {
        text: i18n("Hide when Cider is unavailable")
        checked: plasmoid.configuration.hideWhenUnavailable
        onToggled: plasmoid.configuration.hideWhenUnavailable = checked
    }

    CheckBox {
        text: i18n("Use subtle text transitions")
        checked: plasmoid.configuration.animationsEnabled
        onToggled: plasmoid.configuration.animationsEnabled = checked
    }

    CheckBox {
        text: i18n("Include details in tooltips")
        checked: plasmoid.configuration.tooltipDetailsEnabled
        onToggled: plasmoid.configuration.tooltipDetailsEnabled = checked
    }

    CheckBox {
        Kirigami.FormData.label: i18n("Popup content")
        text: i18n("Show previous lyric line")
        checked: plasmoid.configuration.showPreviousLine
        onToggled: plasmoid.configuration.showPreviousLine = checked
    }

    CheckBox {
        text: i18n("Show next lyric line")
        checked: plasmoid.configuration.showNextLine
        onToggled: plasmoid.configuration.showNextLine = checked
    }

    TextField {
        Kirigami.FormData.label: i18n("Instrumental text:")
        text: plasmoid.configuration.instrumentalText
        onTextChanged: plasmoid.configuration.instrumentalText = text
    }

    TextField {
        Kirigami.FormData.label: i18n("No-lyrics text:")
        text: plasmoid.configuration.noLyricsText
        onTextChanged: plasmoid.configuration.noLyricsText = text
    }

    ComboBox {
        Kirigami.FormData.label: i18n("When paused:")
        model: [i18n("Keep current line"), i18n("Show track fallback")]
        currentIndex: plasmoid.configuration.pausedBehavior === "track-fallback" ? 1 : 0
        onActivated: function(index) { plasmoid.configuration.pausedBehavior = index === 1 ? "track-fallback" : "keep-line" }
    }

    SpinBox {
        Kirigami.FormData.label: i18n("Clear delay after stop (ms):")
        from: 0
        to: 10000
        stepSize: 250
        value: plasmoid.configuration.clearDelayMs
        onValueModified: plasmoid.configuration.clearDelayMs = value
    }

    CheckBox {
        Kirigami.FormData.label: i18n("Diagnostics")
        text: i18n("Show connection badge")
        checked: plasmoid.configuration.showConnectionBadge
        onToggled: plasmoid.configuration.showConnectionBadge = checked
    }

    CheckBox {
        text: i18n("Show active lyric source in the popup")
        checked: plasmoid.configuration.showActiveSource
        onToggled: plasmoid.configuration.showActiveSource = checked
    }

    CheckBox {
        text: i18n("Show last update age in the popup")
        checked: plasmoid.configuration.showLastUpdateAge
        onToggled: plasmoid.configuration.showLastUpdateAge = checked
    }
}
