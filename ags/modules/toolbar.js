import { setupCursorHover } from "../lib/cursor_hover.js";
const { Window, Box, Icon, Button, Label } = Widget;

const OverlayButton = () =>
    Button({
        className: "toolbar-button toolbar-button-active",
        tooltipText: "Close overlay",
        child: Label({ className: "icon-material", label: "overview_key" }),
        onClicked: () => toggleGui(),
        setup: setupCursorHover,
    });

const WindowButton = (window, icon, tooltip) =>
    Button({
        className: "toolbar-button",
        tooltipText: tooltip,
        child: Icon(`${icon}-symbolic`),
        onClicked: self => {
            App.toggleWindow(window);
            self.toggleClassName("toolbar-button-active", App.getWindow(window).visible);
        },
        setup: setupCursorHover,
    });

const Toolbar = () =>
    Box({
        hpack: "center",
        vpack: "end",
        className: "toolbar",
        children: [OverlayButton(), WindowButton("wfinfo-relics", "relic", "Relic View")],
    });

export default () =>
    Window({
        name: "wfinfo-toolbar",
        visible: false,
        layer: "overlay",
        exclusivity: "ignore",
        keymode: "on-demand",
        anchor: ["left", "top", "right", "bottom"],
        child: Toolbar(),
    });
