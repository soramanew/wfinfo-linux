import GLib from "gi://GLib";
import GLibUnix from "gi://GLibUnix";
import { keybinds } from "./config.user.js";
import { createKeybind, deleteKeybind } from "./lib/keybind.js";
import { CACHE_DIR } from "./lib/misc.js";
import FissureDisplay from "./modules/fissure_display.js";
import RelicView from "./modules/relic_view.js";
import Toolbar from "./modules/toolbar.js";
const { execAsync, ensureDirectory } = Utils;

ensureDirectory(CACHE_DIR);
globalThis.reloadCss = () =>
    execAsync(`sass ${App.configDir}/scss/main.scss ${CACHE_DIR}/style.css`)
        .then(() => {
            App.resetCss();
            App.applyCss(`${CACHE_DIR}/style.css`);
        })
        .catch(print);
reloadCss();

App.addIcons(`${App.configDir}/assets/icons`);
App.config({
    stackTraceOnError: true,
    windows: [FissureDisplay(), Toolbar(), RelicView()],
});

const binPath = `${App.configDir}/../wfinfo`;
createKeybind(keybinds.fissure, `${binPath} -t`);
createKeybind(keybinds.gui?.toggle, `${binPath} -g`);

const deleteKeybinds = () => {
    deleteKeybind(keybinds.fissure);
    deleteKeybind(keybinds.gui?.toggle);
};
// Handle SIGINT
GLibUnix.signal_add_full(GLib.PRIORITY_DEFAULT, 2, App.quit);
// Handle ags -q and App.quit()
App.connect("shutdown", deleteKeybinds);

const connectWindows = () => App.connect("window-toggled", (_, name, visible) => (windowsOpen[name] = visible));
let opened = false;
let id = connectWindows();
// Proxy to keep order of updating
const windowsOpen = new Proxy(
    {},
    (keys => ({
        set(_, prop) {
            keys.delete(prop);
            keys.add(prop);
            return Reflect.set(...arguments);
        },
        ownKeys() {
            return Array.from(keys);
        },
    }))(new Set())
);
windowsOpen["wfinfo-toolbar"] = true;

globalThis.toggleGui = () => {
    // Disconnect window watcher so it doesn't register open/close from toggle
    App.disconnect(id);
    // Windows are tracked in order of set so they are opened/closed in that order
    for (const window of Object.keys(windowsOpen))
        if (windowsOpen[window]) {
            if (opened) App.closeWindow(window);
            else App.openWindow(window);
        }
    // Reconnect to track manual open/close
    id = connectWindows();
    opened = !opened;
};
