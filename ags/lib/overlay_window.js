export default ({ setup = () => {}, ...rest }) =>
    Widget.Window({
        ...rest,
        visible: false,
        layer: "overlay",
        exclusivity: "ignore",
        keymode: "on-demand",
        attribute: { x: 0, y: 0, width: 0, height: 0 },
        setup: self => {
            let first = true;
            App.connect("window-toggled", (_, name, visible) => {
                if (!visible || name !== self.name) return;

                // Set margins
                const { width, height } = self.window.get_display().get_monitor_at_window(self.window).get_geometry();
                let { x, y, width: w, height: h } = self.attribute;

                if (first) {
                    // Change anchor so margins work
                    self.anchor = ["top", "right", "bottom", "left"];

                    // Center
                    if (w <= 0) w = self.get_preferred_width()[1];
                    if (h <= 0) h = self.get_preferred_height()[1];
                    x = (width - w) / 2;
                    y = (height - h) / 2;
                    print(y);

                    // Set attribute props to retain dims
                    self.attribute.x = x;
                    self.attribute.y = y;
                    self.attribute.width = w;
                    self.attribute.height = h;

                    // Only on first open
                    first = false;
                }

                // Top, right, bottom, left
                self.margins = [y, width - w - x, height - h - y, x];
            });

            // Extra setup
            setup(self);
        },
    });
