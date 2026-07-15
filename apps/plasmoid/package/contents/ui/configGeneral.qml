import QtQuick
import QtQuick.Controls
import org.kde.kirigami as Kirigami
import org.kde.kcmutils as KCM

KCM.SimpleKCM {
    id: page

    property alias cfg_bridgeHost: bridgeHost.text
    property string cfg_bridgeHostDefault
    property alias cfg_bridgePort: bridgePort.value
    property int cfg_bridgePortDefault
    property alias cfg_reconnectEnabled: reconnectEnabled.checked
    property bool cfg_reconnectEnabledDefault
    property alias cfg_showConnectionStatus: showConnectionStatus.checked
    property bool cfg_showConnectionStatusDefault
    property alias cfg_fontSizeAdjustment: fontSizeAdjustment.value
    property int cfg_fontSizeAdjustmentDefault
    property string cfg_fontWeight
    property string cfg_fontWeightDefault
    property alias cfg_maximumWidth: maximumWidth.value
    property int cfg_maximumWidthDefault
    property alias cfg_minimumWidth: minimumWidth.value
    property int cfg_minimumWidthDefault
    property int cfg_visibleLines
    property int cfg_visibleLinesDefault
    property string cfg_alignment
    property string cfg_alignmentDefault
    property alias cfg_showTrackFallback: showTrackFallback.checked
    property bool cfg_showTrackFallbackDefault
    property alias cfg_verticalTextEnabled: verticalTextEnabled.checked
    property bool cfg_verticalTextEnabledDefault
    property alias cfg_hideWhenStopped: hideWhenStopped.checked
    property bool cfg_hideWhenStoppedDefault
    property alias cfg_hideWhenUnavailable: hideWhenUnavailable.checked
    property bool cfg_hideWhenUnavailableDefault
    property alias cfg_animationsEnabled: animationsEnabled.checked
    property bool cfg_animationsEnabledDefault
    property alias cfg_showPreviousLine: showPreviousLine.checked
    property bool cfg_showPreviousLineDefault
    property alias cfg_showNextLine: showNextLine.checked
    property bool cfg_showNextLineDefault
    property alias cfg_instrumentalText: instrumentalText.text
    property string cfg_instrumentalTextDefault
    property alias cfg_noLyricsText: noLyricsText.text
    property string cfg_noLyricsTextDefault
    property string cfg_pausedBehavior
    property string cfg_pausedBehaviorDefault
    property alias cfg_clearDelayMs: clearDelayMs.value
    property int cfg_clearDelayMsDefault
    property alias cfg_showConnectionBadge: showConnectionBadge.checked
    property bool cfg_showConnectionBadgeDefault

    // Keep the configuration dialog compatible with persisted settings from
    // earlier KLyric packages while deliberately ignoring retired controls.
    property bool cfg_expanding
    property bool cfg_expandingDefault
    property int cfg_length
    property int cfg_lengthDefault
    property bool cfg_showActiveSource
    property bool cfg_showActiveSourceDefault
    property bool cfg_showLastUpdateAge
    property bool cfg_showLastUpdateAgeDefault
    property bool cfg_showMusicIcon
    property bool cfg_showMusicIconDefault
    property bool cfg_tooltipDetailsEnabled
    property bool cfg_tooltipDetailsEnabledDefault

    property bool loopbackHost: cfg_bridgeHost === "127.0.0.1"
                              || cfg_bridgeHost === "::1"
                              || cfg_bridgeHost === "localhost"

    Flickable {
        id: flickable
        contentWidth: width
        contentHeight: form.implicitHeight
        clip: true
        flickableDirection: Flickable.VerticalFlick

        Kirigami.FormLayout {
            id: form
            width: parent.width

    TextField {
        id: bridgeHost
        Kirigami.FormData.label: i18n("Bridge host:")
        placeholderText: "127.0.0.1"
    }

    Label {
        Kirigami.FormData.label: ""
        visible: !page.loopbackHost
        text: i18n("KLyric only connects to a loopback bridge. Use 127.0.0.1, ::1, or localhost.")
        wrapMode: Text.Wrap
        color: Kirigami.Theme.negativeTextColor
    }

    SpinBox {
        id: bridgePort
        Kirigami.FormData.label: i18n("Bridge port:")
        from: 1
        to: 65535
    }

    CheckBox {
        id: reconnectEnabled
        Kirigami.FormData.label: i18n("Connection")
        text: i18n("Reconnect automatically")
    }

    CheckBox {
        id: showConnectionStatus
        text: i18n("Show connection status in the panel")
    }

    SpinBox {
        id: fontSizeAdjustment
        Kirigami.FormData.label: i18n("Appearance")
        textFromValue: function(value) { return i18n("Font size adjustment: %1", value) }
        from: -6
        to: 12
    }

    ComboBox {
        Kirigami.FormData.label: i18n("Font weight:")
        model: [i18n("Normal"), i18n("Medium"), i18n("Bold")]
        currentIndex: page.cfg_fontWeight === "bold" ? 2 : page.cfg_fontWeight === "medium" ? 1 : 0
        onActivated: function(index) { page.cfg_fontWeight = ["normal", "medium", "bold"][index] }
    }

    SpinBox {
        id: maximumWidth
        Kirigami.FormData.label: i18n("Maximum width:")
        from: 80
        to: 1200
    }

    SpinBox {
        id: minimumWidth
        Kirigami.FormData.label: i18n("Minimum width:")
        from: 0
        to: 800
    }

    ComboBox {
        Kirigami.FormData.label: i18n("Visible lyric lines:")
        model: [i18n("One"), i18n("Two")]
        currentIndex: page.cfg_visibleLines === 2 ? 1 : 0
        onActivated: function(index) { page.cfg_visibleLines = index + 1 }
    }

    ComboBox {
        Kirigami.FormData.label: i18n("Alignment:")
        model: [i18n("Left"), i18n("Center"), i18n("Right")]
        currentIndex: page.cfg_alignment === "center" ? 1 : page.cfg_alignment === "right" ? 2 : 0
        onActivated: function(index) { page.cfg_alignment = ["left", "center", "right"][index] }
    }

    CheckBox {
        id: showTrackFallback
        text: i18n("Show title and artist when lyrics are unavailable")
    }

    CheckBox {
        id: verticalTextEnabled
        text: i18n("Use text in vertical panels")
    }

    CheckBox {
        id: hideWhenStopped
        text: i18n("Hide when playback is stopped")
    }

    CheckBox {
        id: hideWhenUnavailable
        text: i18n("Hide when Cider is unavailable")
    }

    CheckBox {
        id: animationsEnabled
        text: i18n("Use subtle text transitions")
    }

    CheckBox {
        id: showPreviousLine
        Kirigami.FormData.label: i18n("Popup content")
        text: i18n("Show previous lyric line")
    }

    CheckBox {
        id: showNextLine
        text: i18n("Show next lyric line")
    }

    TextField {
        id: instrumentalText
        Kirigami.FormData.label: i18n("Instrumental text:")
    }

    TextField {
        id: noLyricsText
        Kirigami.FormData.label: i18n("No-lyrics text:")
    }

    ComboBox {
        Kirigami.FormData.label: i18n("When paused:")
        model: [i18n("Keep current line"), i18n("Show track fallback")]
        currentIndex: page.cfg_pausedBehavior === "track-fallback" ? 1 : 0
        onActivated: function(index) { page.cfg_pausedBehavior = index === 1 ? "track-fallback" : "keep-line" }
    }

    SpinBox {
        id: clearDelayMs
        Kirigami.FormData.label: i18n("Clear delay after stop (ms):")
        from: 0
        to: 10000
        stepSize: 250
    }

    CheckBox {
        id: showConnectionBadge
        Kirigami.FormData.label: i18n("Diagnostics")
        text: i18n("Show connection badge")
    }
    }
    }
}
