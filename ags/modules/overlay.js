const { Window, Box } = Widget;

export default () =>
    Window({
        name: "wfinfo-overlay",
        visible: false,
        layer: "overlay",
        exclusivity: "ignore",
        keymode: "none",
        anchor: ["left", "top", "right", "bottom"],
        child: Box({ className: "overlay" }),
    });
