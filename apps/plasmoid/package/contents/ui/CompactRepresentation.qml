import QtQuick
import org.kde.kirigami as Kirigami
import org.kde.plasma.components as PlasmaComponents

Item {
    id: compact

    property string displayText: ""
    property string tooltipText: ""
    property string connectionState: "disconnected"
    property bool showText: true
    property bool showMusicIcon: true
    property bool showConnectionBadge: false
    property int maximumWidth: 360
    property int minimumWidth: 100
    property int visibleLines: 1
    property string alignment: "left"
    property int fontSizeAdjustment: 0
    property string fontWeight: "normal"
    property bool animationsEnabled: true

    readonly property int effectiveMaximumWidth: Math.max(Kirigami.Units.gridUnit * 8, maximumWidth)
    readonly property int effectiveMinimumWidth: Math.min(effectiveMaximumWidth, Math.max(0, minimumWidth))
    implicitWidth: showText ? Math.max(effectiveMinimumWidth, Math.min(effectiveMaximumWidth, row.implicitWidth + Kirigami.Units.smallSpacing * 2))
                            : Kirigami.Units.iconSizes.smallMedium + Kirigami.Units.smallSpacing * 2
    implicitHeight: Math.max(Kirigami.Units.iconSizes.smallMedium + Kirigami.Units.smallSpacing,
                             lyricLabel.implicitHeight + Kirigami.Units.smallSpacing * 2)
    Accessible.name: displayText
    Accessible.description: tooltipText

    Row {
        id: row
        anchors.fill: parent
        anchors.margins: Kirigami.Units.smallSpacing
        spacing: Kirigami.Units.smallSpacing
        layoutDirection: Qt.application.layoutDirection

        Kirigami.Icon {
            visible: compact.showMusicIcon || !compact.showText
            source: "view-media-lyrics"
            width: Kirigami.Units.iconSizes.smallMedium
            height: width
            anchors.verticalCenter: parent.verticalCenter
        }

        PlasmaComponents.Label {
            id: lyricLabel
            visible: compact.showText
            width: Math.max(0, parent.width - x - (connectionBadge.visible ? connectionBadge.width + parent.spacing : 0))
            anchors.verticalCenter: parent.verticalCenter
            text: compact.displayText
            elide: Text.ElideRight
            maximumLineCount: Math.max(1, Math.min(2, compact.visibleLines))
            wrapMode: maximumLineCount > 1 ? Text.Wrap : Text.NoWrap
            horizontalAlignment: compact.alignment === "center" ? Text.AlignHCenter : compact.alignment === "right" ? Text.AlignRight : Text.AlignLeft
            font.pixelSize: Math.max(1, Kirigami.Theme.defaultFont.pixelSize + compact.fontSizeAdjustment)
            font.weight: compact.fontWeight === "bold" ? Font.Bold : compact.fontWeight === "medium" ? Font.Medium : Font.Normal
            Accessible.name: compact.displayText

            Behavior on opacity {
                enabled: compact.animationsEnabled && !Kirigami.Settings.isMobile
                NumberAnimation { duration: Kirigami.Units.shortDuration }
            }
        }

        Rectangle {
            id: connectionBadge
            visible: compact.showConnectionBadge
            width: Kirigami.Units.smallSpacing
            height: width
            radius: width / 2
            anchors.verticalCenter: parent.verticalCenter
            color: compact.connectionState === "connected" ? Kirigami.Theme.positiveTextColor : Kirigami.Theme.negativeTextColor
            Accessible.name: compact.connectionState === "connected" ? i18n("Bridge connected") : i18n("Bridge disconnected")
        }
    }
}
