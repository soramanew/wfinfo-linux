import { debug, WM_OR_DE } from "./misc.js";
const { execAsync } = Utils;

export const createKeybind = (key, action, consuming = true) => {
    if (!key) return;

    if (WM_OR_DE.startsWith("Hyprland"))
        // Unbind then rebind to avoid duplicate binds
        execAsync(`hyprctl keyword unbind '${key}'`)
            .then(() => execAsync(`hyprctl keyword bind${consuming ? "" : "n"} '${key},exec,${action}'`).catch(print))
            .catch(print);
    else {
        console.log(
            `[WARNING] Detected WM/DE as ${WM_OR_DE}. Unable to create keybind for ${action} automatically, please create it manually.`
        );
        return;
    }

    debug(`Created keybind ${key} for ${action}.`);
};

export const deleteKeybind = key => {
    if (!key) return;

    if (WM_OR_DE.startsWith("Hyprland")) execAsync(`hyprctl keyword unbind '${key}'`).catch(print);
    else return;

    debug(`Deleted keybind ${key}.`);
};
