import Gtk from "gi://Gtk";
import { setupCursorHover, setupCursorHoverMove } from "./cursor_hover.js";
const { Window, Box, Label, Button, Icon } = Widget;

const setupDrag = (self, name, dimX, dimY, cap = null) => {
    setupCursorHoverMove(self);

    const gesture = Gtk.GestureDrag.new(self);
    self.hook(
        gesture,
        () => {
            const [, xOff, yOff] = gesture.get_offset();
            const window = App.getWindow(name);
            window.attribute[dimX] += xOff;
            window.attribute[dimY] += yOff;
            if (cap !== null) {
                if (window.attribute[dimX] < cap) window.attribute[dimX] = cap;
                if (window.attribute[dimY] < cap) window.attribute[dimY] = cap;
            }
            window.attribute.update(window);
        },
        "drag-end"
    );
};

const HeaderButton = ({ name, icon, ...rest }) =>
    Button({
        ...rest,
        hpack: "center",
        vpack: "center",
        className: "overlay-window-button",
        child: Label(icon),
    });

const Header = (name, title, icon) =>
    Box({
        className: "overlay-window-header",
        children: [
            Button({
                hexpand: true,
                child: Box({ children: [icon ? Icon(`${icon}-symbolic`) : null, Label({ xalign: 0, label: title })] }),
                setup: self => setupDrag(self, name, "x", "y"),
            }),
            HeaderButton({ icon: "open_in_full", setup: self => setupDrag(self, name, "width", "height", 1) }),
            HeaderButton({
                icon: "close",
                onClicked: () => App.closeWindow(name),
                setup: setupCursorHover,
            }),
        ],
    });

const Content = (name, title, icon, child, header) =>
    Box({
        vertical: true,
        className: "overlay-window",
        children: [header ? Header(name, title, icon) : null, child],
    });

export default ({ name, child, icon = "", header = true, title = name, setup = () => {}, ...rest }) =>
    Window({
        ...rest,
        name,
        child: Content(name, title, icon, child, header),
        visible: false,
        layer: "overlay",
        exclusivity: "ignore",
        keymode: "on-demand",
        attribute: {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            update: self => {
                const { width, height } = self.window.get_display().get_monitor_at_window(self.window).get_geometry();
                const { x, y, width: w, height: h } = self.attribute;
                // Top, right, bottom, left
                self.margins = [y, width - w - x, height - h - y, x];
            },
        },
        setup: self => {
            let first = true;
            App.connect("window-toggled", (_, name, visible) => {
                if (!visible || name !== self.name) return;

                if (first) {
                    // Change anchor so margins work
                    self.anchor = ["top", "right", "bottom", "left"];

                    // Size of current monitor
                    const { width, height } = self.window
                        .get_display()
                        .get_monitor_at_window(self.window)
                        .get_geometry();

                    // Set if unset or invalid
                    if (self.attribute.width <= 0) self.attribute.width = self.get_preferred_width()[1];
                    if (self.attribute.height <= 0) self.attribute.height = self.get_preferred_height()[1];

                    // Center
                    self.attribute.x = (width - self.attribute.width) / 2;
                    self.attribute.y = (height - self.attribute.height) / 2;

                    // Only on first open
                    first = false;
                }

                // Update
                self.attribute.update(self);
            });

            // Extra setup
            setup(self);
        },
    });
