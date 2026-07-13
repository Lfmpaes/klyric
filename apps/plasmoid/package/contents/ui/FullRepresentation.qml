import QtQuick
import QtQuick.Layouts
import org.kde.kirigami as Kirigami
import org.kde.plasma.components as PlasmaComponents

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
    property bool displayIsLyric: false
    property bool showActiveSource: false
    property bool showLastUpdateAge: false
    property bool tooltipDetailsEnabled: true

    readonly property int lyricLineCount: 1 + (showPreviousLine ? 1 : 0) + (showNextLine ? 1 : 0)
    readonly property int lyricLineHeight: Math.ceil(Kirigami.Theme.defaultFont.pixelSize * 1.5)

    implicitWidth: Kirigami.Units.gridUnit * 28
    implicitHeight: lyricLineCount * lyricLineHeight + Kirigami.Units.largeSpacing * 2
    Accessible.name: i18n("KLyric details")

    ColumnLayout {
        id: content
        anchors.fill: parent
        anchors.margins: Kirigami.Units.largeSpacing
        spacing: Kirigami.Units.smallSpacing

        PlasmaComponents.Label {
            Layout.fillWidth: true
            visible: popup.showPreviousLine && popup.lyricState && popup.lyricState.previousLine
            text: popup.lyricState && popup.lyricState.previousLine ? popup.lyricState.previousLine.text : ""
            opacity: 0.65
            elide: Text.ElideRight
            maximumLineCount: 1
            wrapMode: Text.NoWrap
        }

        PlasmaComponents.Label {
            Layout.fillWidth: true
            text: popup.displayText
            font.bold: popup.displayIsLyric
            font.italic: !popup.displayIsLyric
            elide: Text.ElideRight
            maximumLineCount: 1
            wrapMode: Text.NoWrap
            Accessible.name: i18n("Current lyric: %1", popup.displayText)
        }

        PlasmaComponents.Label {
            Layout.fillWidth: true
            visible: popup.showNextLine && popup.lyricState && popup.lyricState.nextLine
            text: popup.lyricState && popup.lyricState.nextLine ? popup.lyricState.nextLine.text : ""
            opacity: 0.65
            elide: Text.ElideRight
            maximumLineCount: 1
            wrapMode: Text.NoWrap
        }
    }
}
