import { setupCursorHover } from "../lib/cursor_hover.js";
import { CACHE_DIR } from "../lib/misc.js";
import OverlayWindow from "../lib/overlay_window.js";
const { Box, Label, Icon, Button, Revealer, Scrollable, Entry, ToggleButton, Menu, MenuItem } = Widget;
const { readFile, execAsync } = Utils;

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

const Drop = (drop, rarity) => {
    const wikiLink = `https://warframe.fandom.com/wiki/${drop
        .replace(" Blueprint", "")
        .replace(/(?<=Prime).*/, "")
        .replaceAll(" ", "_")}`;
    const marketLink = `https://warframe.market/items/${drop.replaceAll(" ", "_").toLowerCase()}`;

    const LinkItem = (label, link) =>
        MenuItem({
            child: Label({ xalign: 0, label, tooltipText: link }),
            onActivate: () => execAsync(["xdg-open", link]).catch(print),
        });
    const menu = Menu({
        children: [
            LinkItem("Open in wiki", wikiLink),
            drop.includes("Forma") ? null : LinkItem("Open in warframe.market", marketLink),
        ],
    });

    return Button({
        child: Box({
            className: `relic-drop relic-drop-${rarity}`,
            children: [Label({ hexpand: true, xalign: 0, label: drop }), DropWorth(items[drop].price)],
        }),
        onSecondaryClickRelease: (_, event) => menu.popup_at_pointer(event),
        setup: self => menu.attach_to_widget(self, null),
    });
};

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
    const wikiLink = `https://warframe.fandom.com/wiki/${relic.tier}_${relic.name}`;
    const menu = Menu({
        children: [
            MenuItem({
                child: Label({ xalign: 0, label: "Open in wiki", tooltipText: wikiLink }),
                onActivate: () => execAsync(["xdg-open", wikiLink]).catch(print),
            }),
        ],
    });
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
        onSecondaryClickRelease: (_, event) => menu.popup_at_pointer(event),
        setup: self => {
            setupCursorHover(self);
            menu.attach_to_widget(self, null);
        },
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

const SortChooser = (list, updateFilter) => {
    const sorts = ["Default", "Platinum", "Ducats", "Platinum increase"];
    const selected = Variable(sorts[0]);
    const descending = Variable(false);
    let childFocused = false;

    const sort = () => {
        // Ignore init call
        if (!list.children.length) return;

        let children = null;
        switch (selected.value) {
            case "Default":
                children = list.children.sort((a, b) => {
                    a = a.attribute.tier + a.attribute.name;
                    b = b.attribute.tier + b.attribute.name;
                    return a > b ? 1 : a < b ? -1 : 0;
                });
                break;
            case "Platinum":
                children = list.children.sort(
                    (a, b) => a.attribute.price.intact.platinum - b.attribute.price.intact.platinum
                );
                break;
            case "Ducats":
                children = list.children.sort(
                    (a, b) => a.attribute.price.intact.ducats - b.attribute.price.intact.ducats
                );
                break;
            case "Platinum increase":
                children = list.children.sort(
                    ({ attribute: { price: a } }, { attribute: { price: b } }) =>
                        a.radiant.platinum - a.intact.platinum - (b.radiant.platinum - b.intact.platinum)
                );
                break;
            default:
                console.log(`[WARNING] Invalid sort choice: ${selected.value}`);
                break;
        }

        if (children) {
            if (descending.value) children.reverse();
            list.children = children;

            // Update filter cause changing sort messes it up
            updateFilter();
        }
    };

    list.hook(selected, sort);
    list.hook(descending, sort);

    const closeOnFocusLost = () =>
        // Idle so child listeners can trigger first then this
        Utils.idle(() => {
            if (!childFocused) revealer.revealChild = false;
        });

    const childBtnSetup = self => {
        setupCursorHover(self);
        self.on("focus-in-event", () => (childFocused = true));
        self.on("focus-out-event", () => {
            childFocused = false;
            closeOnFocusLost();
        });
    };

    const SortButton = sort =>
        Button({
            className: "relic-view-sort-button",
            child: Label(sort),
            onClicked: () => {
                selected.value = sort;
                revealer.revealChild = false;
            },
            setup: childBtnSetup,
        });

    const revealer = Revealer({
        transition: "slide_right",
        transitionDuration: 150,
        revealChild: false,
        child: Box({ children: selected.bind().as(s => sorts.filter(so => so !== s).map(SortButton)) }),
    });

    return Box({
        className: "relic-view-sort-chooser",
        children: [
            Button({
                child: Label({
                    className: "icon-material",
                    label: descending.bind().as(d => `expand_${d ? "more" : "less"}`),
                }),
                onClicked: () => (descending.value = !descending.value),
                setup: childBtnSetup,
            }),
            Button({
                child: Label({ label: selected.bind().as(s => `Sort: ${s}`) }),
                onClicked: () => (revealer.revealChild = !revealer.revealChild),
                setup: self => {
                    setupCursorHover(self);
                    self.on("focus-out-event", closeOnFocusLost);
                },
            }),
            revealer,
        ],
    });
};

const EraFilter = selected => {
    const eras = ["All", "Lith", "Meso", "Neo", "Axi"];
    selected.value = eras[0];
    let childFocused = false;

    const closeOnFocusLost = () =>
        // Idle so child listeners can trigger first then this
        Utils.idle(() => {
            if (!childFocused) revealer.revealChild = false;
        });

    const childBtnSetup = self => {
        setupCursorHover(self);
        self.on("focus-in-event", () => (childFocused = true));
        self.on("focus-out-event", () => {
            childFocused = false;
            closeOnFocusLost();
        });
    };

    const EraButton = tier =>
        Button({
            className: "relic-view-era-button",
            child: Label(tier),
            onClicked: () => {
                selected.value = tier;
                revealer.revealChild = false;
            },
            setup: childBtnSetup,
        });

    const revealer = Revealer({
        transition: "slide_right",
        transitionDuration: 150,
        revealChild: false,
        child: Box({ children: selected.bind().as(s => eras.filter(e => e !== s).map(EraButton)) }),
    });

    return Box({
        className: "relic-view-era-filter",
        children: [
            Button({
                child: Label({ label: selected.bind().as(s => `Era: ${s}`) }),
                onClicked: () => (revealer.revealChild = !revealer.revealChild),
                setup: self => {
                    setupCursorHover(self);
                    self.on("focus-out-event", closeOnFocusLost);
                },
            }),
            revealer,
        ],
    });
};

export default () => {
    let relicWidgets;

    const vaulted = Variable(true);
    const era = Variable();
    const updateFilter = () => {
        if (!relicWidgets) return;

        const matcher = new RegExp(searchEntry.text, "i");

        for (const [i, relic] of Object.values(relics).flatMap(Object.values).entries()) {
            // Vaulted shows both vaulted and not, vaulted false only shows not
            const vaultMatch = vaulted.value || !relic.vaulted;
            const eraMatch = era.value === "All" || era.value === relic.tier;
            // Match vaulted status and relic name
            let vis = vaultMatch && eraMatch && matcher.test(`${relic.tier} ${relic.name}`);

            // Check drops if vaulted status matches and not already visible
            if (vaultMatch && eraMatch && !vis)
                vis = Object.values(relic.drops).some(rarity => rarity.some(drop => matcher.test(drop)));

            // Change relic widget visibility
            relicWidgets[i].visible = vis;
        }
    };

    vaulted.connect("changed", updateFilter);
    era.connect("changed", updateFilter);

    const list = Box({
        vertical: true,
        setup: self => {
            // Create children on first open
            const id = App.connect("window-toggled", (_, name, visible) => {
                if (visible && name === "wfinfo-relics") {
                    // Store in another array cause accessing children by index is extremely slow for some reason
                    relicWidgets = Object.values(relics).flatMap(r => Object.values(r).map(Relic));
                    self.children = relicWidgets;
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
        onToggled: ({ active }) => (vaulted.value = active),
    });

    const content = Box({
        vertical: true,
        children: [
            Box({
                className: "relic-view-header",
                children: [search, vaultedFilter, SortChooser(list, updateFilter), EraFilter(era)],
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
                self.set_default_size((height / 3) * 4, height);
            }),
    });
};
