import Gtk from "gi://Gtk";
import { setupCursorHover, setupCursorHoverMove } from "./cursor_hover.js";
const { Window, Box, Label, Button, Icon } = Widget;

export const setupDrag = (self, name, dimX, dimY, cap = null) => {
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
            window.attribute.update();
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
        children: [header ? Header(name, title, icon) : null, child],
    });

export default ({
    name,
    child,
    icon = "",
    header = true,
    title = name,
    className = "",
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    setup = () => {},
    ...rest
}) =>
    Window({
        ...rest,
        name,
        className: `overlay-window ${className}`,
        child: Content(name, title, icon, child, header),
        visible: false,
        layer: "overlay",
        exclusivity: "ignore",
        keymode: "on-demand",
        attribute: { x, y, width, height },
        setup: self => {
            let id = App.connect("window-toggled", (_, name, visible) => {
                if (!visible || name !== self.name) return;

                // Only run once
                App.disconnect(id);
                id = null;

                // Change anchor so margins work
                self.anchor = ["top", "right", "bottom", "left"];

                // Size of current monitor
                const { width, height } = self.window.get_display().get_monitor_at_window(self.window).get_geometry();

                const { x, y } = self.attribute;

                // Set if unset or invalid
                if (self.attribute.width < 1) self.attribute.width = self.get_preferred_width()[1];
                if (self.attribute.height < 1) self.attribute.height = self.get_preferred_height()[1];

                // Center or move to position if set and negative
                if (self.attribute.x === 0) self.attribute.x = (width - self.attribute.width) / 2;
                else if (self.attribute.x < 0) self.attribute.x += width - self.attribute.width;
                if (self.attribute.y === 0) self.attribute.y = (height - self.attribute.height) / 2;
                else if (self.attribute.y < 0) self.attribute.y += height - self.attribute.height;

                // Update
                self.attribute.update();

                // Idle so tries to do other on hooks first cause they may cause lag which screws up the timeout (e.g. relic view)
                Utils.idle(() =>
                    // Update again after a timeout to update to actually allocated size
                    Utils.timeout(500, () => {
                        if (x === 0) self.attribute.x = (width - self.attribute.width) / 2;
                        else if (x < 0) self.attribute.x = width - self.attribute.width + x;
                        if (y === 0) self.attribute.y = (height - self.attribute.height) / 2;
                        else if (y < 0) self.attribute.y = height - self.attribute.height + y;

                        self.attribute.update();
                    })
                );
            });

            self.on("size-allocate", () => {
                // Don't sync if first run has not executed yet cause it'll be 1,1 cause not visible
                if (id) return;

                // Sync attribute size with real size (cause min sizes and stuff)
                // Minus 1 cause for some reason it increases by 1
                self.attribute.width = self.get_allocated_width() - 1;
                self.attribute.height = self.get_allocated_height() - 1;
            });

            self.attribute.update = () => {
                if (id) return;

                const { width, height } = self.window.get_display().get_monitor_at_window(self.window).get_geometry();
                const { x, y, width: w, height: h } = self.attribute;

                // Top, right, bottom, left
                self.margins = [y, width - w - x, height - h - y, x];
            };

            // Extra setup
            setup(self);
        },
    });
