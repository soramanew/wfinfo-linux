export default ({ setup = () => {}, ...rest }) =>
    Widget.Window({
        ...rest,
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
