import Gio from "gi://Gio";
import GLib from "gi://GLib";
import { debugMode } from "../config.user.js";
const { exec } = Utils;

export const CACHE_DIR = `${GLib.get_user_cache_dir()}/wfinfo/ags`;
export const BIN_PATH = `${App.configDir}/../wfinfo`;
export const WM_OR_DE = exec("wmctrl -m").split("\n")[0].replace("Name: ", "");

export const debug = (...msg) => {
    if (debugMode) console.log("[DEBUG]", ...msg);
};

export const fileExists = filePath => Gio.File.new_for_path(filePath).query_exists(null);
