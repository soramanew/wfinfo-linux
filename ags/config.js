import { keybinds } from "./config.user.js";
import { CACHE_DIR, createKeybind } from "./lib/misc.js";
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
if (keybinds.fissure) createKeybind(keybinds.fissure, `${binPath} -t`);
if (keybinds.gui?.toggle) createKeybind(keybinds.gui.toggle, `${binPath} -g`);

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
