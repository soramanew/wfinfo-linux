import { setupCursorHover } from "../lib/cursor_hover.js";
const { Window, Box, Label, Icon, Button, Overlay } = Widget;

const WindowButton = (window, icon, tooltip) =>
    Button({
        className: "toolbar-button",
        tooltipText: tooltip,
        child: Icon(icon),
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
        children: [WindowButton("wfinfo-relics", "relic", "Relic View")],
    });

const Background = () => Box({ expand: true, className: "overlay" });

export default () =>
    Window({
        name: "wfinfo-toolbar",
        visible: false,
        layer: "overlay",
        exclusivity: "ignore",
        keymode: "exclusive",
        anchor: ["left", "top", "right", "bottom"],
        child: Overlay({
            child: Background(),
            overlays: [Toolbar()],
        }),
    });
