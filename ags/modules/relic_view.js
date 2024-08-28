import { CACHE_DIR, setupCursorHover } from "../lib.js";
const { Window, Box, Label, Icon, Button, Revealer, Scrollable } = Widget;
const { readFile } = Utils;

const resourceDir = `${CACHE_DIR}/../resources`;
const items = JSON.parse(readFile(`${resourceDir}/prices.json`));
const relics = JSON.parse(readFile(`${resourceDir}/relics.json`));

const DropWorth = ({ platinum, ducats }) =>
    Box({
        className: "relic-drop-price",
        children: [
            Box({ children: [Label(String(platinum)), Icon("platinum")] }),
            Box({ children: [Label(String(ducats)), Icon("ducat")] }),
        ],
    });

const Drop = (drop, rarity) =>
    Box({
        className: `relic-drop relic-drop-${rarity}`,
        children: [Label({ hexpand: true, xalign: 0, label: drop }), DropWorth(items[drop].price)],
    });

const RelicWorth = ({ intact, radiant }) => {
    // Ugh why is it so annoying to round
    const diff = +(radiant.platinum - intact.platinum).toFixed(2);
    return Box({
        children: [
            Box({ children: [Label(`Intact: ${intact.platinum}`), Icon("platinum")] }),
            Box({
                children: [Label(`Radiant: ${radiant.platinum} (${diff >= 0 ? "+" : ""}${diff})`), Icon("platinum")],
            }),
        ],
    });
};

const RelicTitle = (relic, dropsRevealer) =>
    Button({
        child: Box({
            className: "relic-title",
            children: [
                Label(relic.name),
                Label({ hexpand: true, xalign: 0, label: relic.vaulted ? "Vaulted" : "" }),
                RelicWorth(relic.price),
            ],
        }),
        onClicked: () => {
            if (!dropsRevealer.child.children.length)
                dropsRevealer.child.children = Object.entries(relic.drops).flatMap(([rarity, drops]) =>
                    drops.map(d => Drop(d, rarity))
                );
            dropsRevealer.revealChild = !dropsRevealer.revealChild;
        },
        setup: setupCursorHover,
    });

const Relic = relic => {
    const revealer = Revealer({
        transition: "slide_down",
        transitionDuration: 150,
        revealChild: false,
        child: Box({ vertical: true }),
    });
    return Box({
        vertical: true,
        className: "relic",
        children: [RelicTitle(relic, revealer), revealer],
    });
};

const Tier = ([tier, relics]) => {
    const revealer = Revealer({
        transition: "slide_down",
        transitionDuration: 300,
        revealChild: false,
        child: Box({ vertical: true }),
    });
    return Box({
        vertical: true,
        className: "relic-tier",
        children: [
            Button({
                child: Label(tier),
                onClicked: () => {
                    if (!revealer.child.children.length) revealer.child.children = Object.values(relics).map(Relic);
                    revealer.revealChild = !revealer.revealChild;
                },
                setup: setupCursorHover,
            }),
            revealer,
        ],
    });
};

export default () =>
    Window({
        name: "wfinfo-relics",
        visible: true, //false,
        layer: "overlay",
        exclusivity: "ignore",
        keymode: "on-demand",
        anchor: ["right"],
        child: Box({
            className: "relic-view",
            child: Scrollable({
                hscroll: "never",
                vscroll: "automatic",
                child: Box({
                    vertical: true,
                    children: Object.entries(relics).map(Tier),
                }),
                setup: self =>
                    Utils.timeout(1, () => {
                        const height =
                            self.window.get_display().get_monitor_at_window(self.window).get_geometry().height * 0.7;
                        self.set_size_request((height / 3) * 4, height);
                    }),
            }),
        }),
    });
