import { setupCursorHover } from "../lib/cursor_hover.js";
import { CACHE_DIR } from "../lib/misc.js";
import OverlayWindow from "../lib/overlay_window.js";
const { Box, Label, Icon, Button, Revealer, Scrollable, Entry, ToggleButton } = Widget;
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
                Label(`${relic.tier} ${relic.name}`),
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
        vertical: true,
        className: "relic",
        children: [RelicTitle(relic, revealer), revealer],
    });
};

const FilterButton = ({ label, toggled = false, onToggled = () => {}, ...rest }) =>
    ToggleButton({
        ...rest,
        active: toggled,
        className: `relic-view-filter-button ${toggled ? "checked" : ""}`,
        child: Box({ children: [Label(label), Label(toggled ? "check" : "close")] }),
        onToggled: self => {
            self.toggleClassName("checked", self.active);
            self.child.children[1].label = self.active ? "check" : "close";
            onToggled(self);
        },
        setup: setupCursorHover,
    });

export default () => {
    let relicWidgets;

    let vaulted = true;
    const updateFilter = () => {
        const matcher = new RegExp(searchEntry.text, "i");

        for (const [i, relic] of Object.values(relics).flatMap(Object.values).entries()) {
            // Vaulted shows both vaulted and not, vaulted false only shows not
            const vaultMatch = vaulted || !relic.vaulted;
            // Match vaulted status and relic name
            let vis = vaultMatch && matcher.test(`${relic.tier} ${relic.name}`);

            // Check drops if vaulted status matches and not already visible
            if (vaultMatch && !vis)
                vis = Object.values(relic.drops).some(rarity => rarity.some(drop => matcher.test(drop)));

            // Change relic widget visibility
            relicWidgets[i].visible = vis;
        }
    };

    const list = Box({
        vertical: true,
        setup: self => {
            // Create children on first open
            const id = App.connect("window-toggled", (_, name, visible) => {
                if (visible && name === "wfinfo-relics") {
                    // Idle so sizing works
                    Utils.idle(() => {
                        // Store in another array cause accessing children by index is extremely slow for some reason
                        relicWidgets = Object.values(relics).flatMap(r => Object.values(r).map(Relic));
                        self.children = relicWidgets;
                    });
                    App.disconnect(id);
                }
            });
        },
    });

    const searchEntry = Entry({
        hexpand: true,
        placeholderText: "Filter by name/drops",
        onChange: updateFilter,
    });

    const search = Box({
        className: "relic-view-search",
        children: [Label({ className: "icon-material", label: "search" }), searchEntry],
    });

    const vaultedFilter = FilterButton({
        label: "Vaulted",
        toggled: true,
        onToggled: ({ active }) => {
            vaulted = active;
            updateFilter();
        },
    });

    const content = Box({
        vertical: true,
        children: [
            Box({
                className: "relic-view-header",
                children: [search, vaultedFilter],
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
