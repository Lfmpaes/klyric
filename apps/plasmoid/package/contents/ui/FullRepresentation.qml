import QtQuick
import QtQuick.Layouts
import org.kde.kirigami as Kirigami
import org.kde.plasma.components as PlasmaComponents
import "js/Formatting.js" as Formatting

Item {
    id: popup

    property var lyricState: null
    property string displayText: ""
    property string connectionState: "disconnected"
    property string bridgeError: ""
    property string bridgeVersion: ""
    property double lastMessageAt: 0
    property bool showPreviousLine: true
    property bool showNextLine: true
    property bool showActiveSource: false
    property bool showLastUpdateAge: false
    property bool tooltipDetailsEnabled: true

    implicitWidth: Kirigami.Units.gridUnit * 28
    implicitHeight: content.implicitHeight + Kirigami.Units.largeSpacing * 2
    Accessible.name: i18n("KLyric details")

    ColumnLayout {
        id: content
        anchors.fill: parent
        anchors.margins: Kirigami.Units.largeSpacing
        spacing: Kirigami.Units.smallSpacing

        PlasmaComponents.Label {
            Layout.fillWidth: true
            visible: popup.lyricState && popup.lyricState.track && (popup.lyricState.track.title || popup.lyricState.track.artist)
            text: {
                if (!popup.lyricState || !popup.lyricState.track)
                    return ""
                var track = popup.lyricState.track
                return track.title && track.artist ? track.title + " — " + track.artist : (track.title || track.artist || "")
            }
            font: Kirigami.Theme.headingFont
            elide: Text.ElideRight
            wrapMode: Text.Wrap
        }

        PlasmaComponents.Label {
            Layout.fillWidth: true
            visible: popup.showPreviousLine && popup.lyricState && popup.lyricState.previousLine
            text: popup.lyricState && popup.lyricState.previousLine ? popup.lyricState.previousLine.text : ""
            opacity: 0.65
            wrapMode: Text.Wrap
        }

        PlasmaComponents.Label {
            Layout.fillWidth: true
            text: popup.displayText
            font: Kirigami.Theme.headingFont
            wrapMode: Text.Wrap
            Accessible.name: i18n("Current lyric: %1", popup.displayText)
        }

        PlasmaComponents.Label {
            Layout.fillWidth: true
            visible: popup.showNextLine && popup.lyricState && popup.lyricState.nextLine
            text: popup.lyricState && popup.lyricState.nextLine ? popup.lyricState.nextLine.text : ""
            opacity: 0.65
            wrapMode: Text.Wrap
        }

        PlasmaComponents.Label {
            Layout.fillWidth: true
            text: popup.bridgeError.length > 0 ? popup.bridgeError : Formatting.connectionText(popup.connectionState)
            color: popup.connectionState === "connected" ? Kirigami.Theme.disabledTextColor : Kirigami.Theme.negativeTextColor
            wrapMode: Text.Wrap
        }

        PlasmaComponents.Label {
            Layout.fillWidth: true
            visible: popup.showActiveSource && popup.lyricState
            text: i18n("Source: %1", popup.lyricState ? popup.lyricState.sourceKind : "")
            opacity: 0.7
        }

        PlasmaComponents.Label {
            Layout.fillWidth: true
            visible: popup.showLastUpdateAge
            text: Formatting.ageText(popup.lastMessageAt)
            opacity: 0.7
        }
    }
}
