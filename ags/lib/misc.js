import Gio from "gi://Gio";
import GLib from "gi://GLib";
import { debugMode } from "../config.user.js";
const { exec, execAsync } = Utils;

export const CACHE_DIR = `${GLib.get_user_cache_dir()}/wfinfo/ags`;
export const WM_OR_DE = exec("wmctrl -m").split("\n")[0].replace("Name: ", "");

export const debug = (...msg) => {
    if (debugMode) console.log("[DEBUG]", ...msg);
};

export const fileExists = filePath => Gio.File.new_for_path(filePath).query_exists(null);

export const createKeybind = (key, action) => {
    if (WM_OR_DE.startsWith("Hyprland"))
        // Unbind then rebind to avoid duplicate binds
        execAsync(`hyprctl keyword unbind '${key}'`)
            .then(() => execAsync(`hyprctl keyword bindn '${key},exec,${action}'`).catch(print))
            .catch(print);
    else {
        console.log(
            `[WARNING] Detected WM/DE as ${WM_OR_DE}. Unable to create keybind for ${action} automatically, please create it manually.`
        );
        return;
    }
    debug(`Created keybind ${key} for ${action}.`);
};
