import { setupCursorHover } from "../lib/cursor_hover.js";
import OverlayWindow, { setupDrag } from "../lib/overlay_window.js";
const { Box, Icon, Button, Label } = Widget;

const DragArea = () =>
    Button({
        className: "toolbar-drag-area",
        child: Label({ className: "icon-material", label: "drag_indicator" }),
        setup: self => setupDrag(self, "wfinfo-toolbar", "x", "y"),
    });

const OverlayButton = () =>
    Button({
        className: "toolbar-button toolbar-button-active",
        tooltipText: "Overlay",
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
        className: "toolbar",
        children: [
            DragArea(),
            Box({
                homogeneous: true,
                children: [OverlayButton(), WindowButton("wfinfo-relics", "relic", "Relic View")],
            }),
        ],
    });

export default () =>
    OverlayWindow({
        name: "wfinfo-toolbar",
        className: "toolbar-window",
        header: false,
        y: -20,
        child: Toolbar(),
    });
