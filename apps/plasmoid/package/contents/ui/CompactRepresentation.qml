import QtQuick
import QtQuick.Layouts
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
    property bool verticalPanel: false

    readonly property int iconOnlyWidth: Kirigami.Units.iconSizes.smallMedium + Kirigami.Units.smallSpacing * 2
    readonly property int effectiveMaximumWidth: Math.max(Kirigami.Units.gridUnit * 8, maximumWidth)
    readonly property int effectiveMinimumWidth: Math.min(effectiveMaximumWidth, Math.max(iconOnlyWidth, minimumWidth))
    readonly property int preferredPanelWidth: showText ? effectiveMaximumWidth : iconOnlyWidth
    readonly property int preferredPanelLength: showText ? effectiveMaximumWidth : iconOnlyWidth

    // Plasma panel containments size compact representations through Qt Quick
    // Layout hints. Relying only on implicitWidth allows the applet to collapse
    // to an icon-sized square before the lyric label receives usable width.
    implicitWidth: verticalPanel ? iconOnlyWidth : preferredPanelWidth
    implicitHeight: verticalPanel ? preferredPanelLength : Math.max(Kirigami.Units.iconSizes.smallMedium + Kirigami.Units.smallSpacing,
                                                                    lyricLabel.implicitHeight + Kirigami.Units.smallSpacing * 2)
    Layout.minimumWidth: verticalPanel ? iconOnlyWidth : (showText ? effectiveMinimumWidth : iconOnlyWidth)
    Layout.preferredWidth: verticalPanel ? iconOnlyWidth : preferredPanelWidth
    Layout.maximumWidth: verticalPanel ? iconOnlyWidth : (showText ? effectiveMaximumWidth : iconOnlyWidth)
    Layout.minimumHeight: verticalPanel ? (showText ? effectiveMinimumWidth : iconOnlyWidth) : implicitHeight
    Layout.preferredHeight: verticalPanel ? preferredPanelLength : implicitHeight
    Layout.maximumHeight: verticalPanel ? (showText ? effectiveMaximumWidth : iconOnlyWidth) : implicitHeight
    Layout.fillHeight: !verticalPanel
    clip: true

    Accessible.name: displayText
    Accessible.description: tooltipText

    onDisplayTextChanged: {
        if (animationsEnabled && visible)
            textTransition.restart()
    }

    SequentialAnimation {
        id: textTransition
        NumberAnimation {
            target: lyricLabel
            property: "opacity"
            to: 0.55
            duration: Kirigami.Units.shortDuration
        }
        NumberAnimation {
            target: lyricLabel
            property: "opacity"
            to: 1
            duration: Kirigami.Units.shortDuration
        }
    }

    RowLayout {
        id: row
        visible: !compact.verticalPanel
        anchors.fill: parent
        anchors.margins: Kirigami.Units.smallSpacing
        spacing: Kirigami.Units.smallSpacing
        layoutDirection: Qt.application.layoutDirection

        Kirigami.Icon {
            visible: compact.showMusicIcon || !compact.showText
            source: "view-media-lyrics"
            Layout.preferredWidth: Kirigami.Units.iconSizes.smallMedium
            Layout.preferredHeight: Kirigami.Units.iconSizes.smallMedium
            Layout.alignment: Qt.AlignVCenter
        }

        PlasmaComponents.Label {
            id: lyricLabel
            visible: compact.showText
            Layout.fillWidth: true
            Layout.minimumWidth: 0
            Layout.alignment: Qt.AlignVCenter
            text: compact.displayText
            textFormat: Text.PlainText
            elide: Text.ElideRight
            maximumLineCount: Math.max(1, Math.min(2, compact.visibleLines))
            wrapMode: maximumLineCount > 1 ? Text.Wrap : Text.NoWrap
            verticalAlignment: Text.AlignVCenter
            horizontalAlignment: compact.alignment === "center" ? Text.AlignHCenter : compact.alignment === "right" ? Text.AlignRight : Text.AlignLeft
            font.pixelSize: Math.max(1, Kirigami.Theme.defaultFont.pixelSize + compact.fontSizeAdjustment)
            fontSizeMode: Text.VerticalFit
            minimumPixelSize: 1
            font.weight: compact.fontWeight === "bold" ? Font.Bold : compact.fontWeight === "medium" ? Font.Medium : Font.Normal
            Accessible.name: compact.displayText
        }

        Rectangle {
            id: connectionBadge
            visible: compact.showConnectionBadge
            Layout.preferredWidth: Kirigami.Units.smallSpacing
            Layout.preferredHeight: Kirigami.Units.smallSpacing
            Layout.alignment: Qt.AlignVCenter
            radius: width / 2
            color: compact.connectionState === "connected" ? Kirigami.Theme.positiveTextColor : Kirigami.Theme.negativeTextColor
            Accessible.name: compact.connectionState === "connected" ? i18n("Bridge connected") : i18n("Bridge disconnected")
        }
    }

    Item {
        id: verticalContent
        visible: compact.verticalPanel
        anchors.fill: parent
        anchors.margins: Kirigami.Units.smallSpacing

        Kirigami.Icon {
            id: verticalIcon
            visible: compact.showMusicIcon || !compact.showText
            source: "view-media-lyrics"
            width: Kirigami.Units.iconSizes.smallMedium
            height: Kirigami.Units.iconSizes.smallMedium
            anchors.horizontalCenter: parent.horizontalCenter
            anchors.top: parent.top
        }

        Item {
            id: verticalTextViewport
            visible: compact.showText
            anchors.top: verticalIcon.visible ? verticalIcon.bottom : parent.top
            anchors.topMargin: verticalIcon.visible ? Kirigami.Units.smallSpacing : 0
            anchors.bottom: parent.bottom
            anchors.left: parent.left
            anchors.right: parent.right
            clip: true

            PlasmaComponents.Label {
                width: verticalTextViewport.height
                height: verticalTextViewport.width
                anchors.centerIn: parent
                rotation: -90
                text: compact.displayText
                textFormat: Text.PlainText
                elide: Text.ElideRight
                maximumLineCount: 1
                wrapMode: Text.NoWrap
                verticalAlignment: Text.AlignVCenter
                horizontalAlignment: compact.alignment === "center" ? Text.AlignHCenter : compact.alignment === "right" ? Text.AlignRight : Text.AlignLeft
                font.pixelSize: Math.max(1, Kirigami.Theme.defaultFont.pixelSize + compact.fontSizeAdjustment)
                fontSizeMode: Text.VerticalFit
                minimumPixelSize: 1
                font.weight: compact.fontWeight === "bold" ? Font.Bold : compact.fontWeight === "medium" ? Font.Medium : Font.Normal
                Accessible.name: compact.displayText
            }
        }
    }
}
