import { CACHE_DIR } from "../lib.js";
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
            Box({ children: [Label(String(intact.platinum)), Icon("platinum")] }),
            Box({
                children: [Label(`${radiant.platinum} (${diff >= 0 ? "+" : ""}${diff})`), Icon("platinum")],
            }),
        ],
    });
};

const RelicTitle = (relic, dropsRevealer) =>
    Button({
        className: "relic-title",
        child: Box({
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
        transitionDuration: 200,
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
        child: Box({
            css: "min-width: 1000px; min-height: 800px;",
            child: Scrollable({
                hscroll: "never",
                child: Box({
                    vertical: true,
                    children: Object.entries(relics).map(Tier),
                }),
            }),
        }),
    });
