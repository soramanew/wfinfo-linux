import { setupCursorHover } from "../lib/cursor_hover.js";
import { CACHE_DIR } from "../lib/misc.js";
import OverlayWindow from "../lib/overlay_window.js";
const { Box, Label, Icon, Button, Revealer, Scrollable, Entry } = Widget;
const { readFile } = Utils;

const resourceDir = `${CACHE_DIR}/../resources`;
const items = JSON.parse(readFile(`${resourceDir}/prices.json`));
const relics = JSON.parse(readFile(`${resourceDir}/relics.json`));

const ExpandIndicator = () =>
    Object.assign(
        Label({
            className: "icon-material",
            label: "expand_more",
        }),
        {
            toggled: false,
            toggle(toggled = null) {
                if (toggled === null) this.toggled = !this.toggled;
                else this.toggled = toggled;
                this.label = this.toggled ? "expand_less" : "expand_more";
            },
        }
    );

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
        attribute: items[drop],
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

const RelicTitle = (relic, dropsRevealer) => {
    const indicator = ExpandIndicator();
    return Button({
        child: Box({
            className: "relic-title",
            children: [
                indicator,
                Label(relic.name),
                Label({ hexpand: true, xalign: 0, className: "subtext", label: relic.vaulted ? "Vaulted" : "" }),
                RelicWorth(relic.price),
            ],
        }),
        onClicked: () => {
            if (!dropsRevealer.child.children.length)
                dropsRevealer.child.children = Object.entries(relic.drops).flatMap(([rarity, drops]) =>
                    drops.map(d => Drop(d, rarity))
                );
            dropsRevealer.revealChild = !dropsRevealer.revealChild;
            indicator.toggle(dropsRevealer.revealChild);
        },
        setup: setupCursorHover,
    });
};

const Relic = relic => {
    const revealer = Revealer({
        transition: "slide_down",
        transitionDuration: 150,
        revealChild: false,
        child: Box({ vertical: true }),
    });
    return Box({
        attribute: relic,
        vertical: true,
        className: "relic",
        children: [RelicTitle(relic, revealer), revealer],
    });
};

export default () => {
    const updateFilter = (tier, matcher = new RegExp(searchEntry.text, "gi")) => {
        let visible = false;

        for (const [i, relic] of Object.values(tier.attribute).entries()) {
            let vis = relic.name.match(matcher) !== null;

            if (!vis)
                for (const rarity of Object.values(relic.drops))
                    for (const drop of rarity) if (drop.match(matcher) !== null) vis = true;

            if (vis) visible = true;

            const relicWidget = tier.children[1].child.children[i];
            if (relicWidget && relicWidget.visible !== vis) relicWidget.visible = vis;
        }

        if (tier.visible !== visible) tier.visible = visible;
    };

    const Tier = ([tier, relics]) => {
        const revealer = Revealer({
            transition: "slide_down",
            transitionDuration: 300,
            revealChild: false,
            child: Box({ vertical: true }),
        });
        const indicator = ExpandIndicator();
        const self = Box({
            attribute: relics,
            vertical: true,
            className: "relic-tier",
            children: [
                Button({
                    child: Box({ children: [indicator, Label({ hexpand: true, xalign: 0, label: tier })] }),
                    onClicked: () => {
                        if (!revealer.child.children.length) {
                            revealer.child.children = Object.values(relics).map(Relic);
                            updateFilter(self);
                        }
                        revealer.revealChild = !revealer.revealChild;
                        indicator.toggle(revealer.revealChild);
                    },
                    setup: setupCursorHover,
                }),
                revealer,
            ],
        });
        return self;
    };

    const list = Box({ vertical: true, children: Object.entries(relics).map(Tier) });

    const searchEntry = Entry({
        hexpand: true,
        placeholderText: "Filter by name/drops",
        onChange: ({ text }) => {
            const matcher = new RegExp(text, "gi");
            for (const tier of list.children) updateFilter(tier, matcher);
        },
    });

    const content = Box({
        vertical: true,
        children: [
            Box({
                className: "relic-view-header",
                children: [
                    Box({
                        className: "relic-view-search",
                        children: [Label({ className: "icon-material", label: "search" }), searchEntry],
                    }),
                ],
            }),
            Scrollable({
                vexpand: true,
                hscroll: "never",
                vscroll: "automatic",
                child: list,
            }),
        ],
    });

    return OverlayWindow({
        name: "wfinfo-relics",
        title: "Relic View",
        icon: "relic",
        child: content,
        setup: self =>
            Utils.timeout(1, () => {
                const height = self.window.get_display().get_monitor_at_window(self.window).get_geometry().height * 0.7;
                self.attribute.width = (height / 3) * 4;
                self.attribute.height = height;
            }),
    });
};
