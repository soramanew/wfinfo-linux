import Cairo from "cairo";
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import { logPath as defaultLogPath, keybind } from "./config.user.js";
const { Window, Box, Label, Icon } = Widget;
const { exec, execAsync, ensureDirectory, HOME, readFile, writeFile, subprocess } = Utils;

const CACHE_DIR = `${GLib.get_user_cache_dir()}/wfinfo/ags`;
const SCREENSHOT_PATH = `${CACHE_DIR}/../screenshot.png`;

const fileExists = filePath => Gio.File.new_for_path(filePath).query_exists(null);
const findEELog = () =>
    exec(
        `bash -c "find ${HOME} -type f -name 'EE.log' -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -1 | cut -d ' ' -f 2"`
    );
const execPython = (script, args = "", async = false) =>
    (async ? execAsync : exec)(`${App.configDir}/../.venv/bin/python ${App.configDir}/../src/${script}.py ${args}`);

const getDimensions = () => {
    // For multi-monitor, get monitor window is on
    const window = App.getWindow("wfinfo").window;
    const { width, height } = window.get_display().get_monitor_at_window(window).get_geometry();
    const scale = width / height > 16 / 9 ? height / 1080 : width / 1920;
    const rewardWidth = 235 * scale; // Per reward no spacing
    const rewardSpacing = 7 * scale; // Spacing between rewards
    const rewardBottom = 80 * scale; // center - bottom = real bottom
    return { width: rewardWidth, spacing: rewardSpacing, bottom: rewardBottom };
};

const hookWindowOpen = (self, fn) =>
    self.hook(
        App,
        (_, name, visible) => {
            if (visible && name === "wfinfo") fn(self);
        },
        "window-toggled"
    );

const getLogPath = () => {
    const cachePath = `${CACHE_DIR}/ee_log_path.txt`;
    const cachedLogPath = readFile(cachePath);

    // Use cached first, then try default and finally search
    let logPath = "";
    if (fileExists(cachedLogPath)) logPath = cachedLogPath;
    else if (fileExists(defaultLogPath)) logPath = defaultLogPath;
    else {
        const foundLogPath = findEELog();
        if (fileExists(foundLogPath)) {
            console.log(`[INFO] Found EE.log as ${foundLogPath}`);
            logPath = foundLogPath;
        }
    }

    writeFile(logPath, cachePath);
    return logPath;
};

const logPath = getLogPath();

const PriceDisplay = ({ platinum, ducats }) =>
    Box({
        hexpand: true,
        hpack: "center",
        className: "reward-price",
        children: [
            Box({ children: [Label(String(platinum)), Icon("platinum")] }),
            Box({ children: [Label(String(ducats)), Icon("ducat")] }),
        ],
    });

const SoldDisplay = ({ today, yesterday }) =>
    Box({
        vertical: true,
        className: "reward-sold",
        children: [Label(`${today} sold last 24h`), Label(`${today + yesterday} sold last 48h`)],
    });

const RewardDisplay = (reward, i) =>
    Box({
        css: `min-width: ${getDimensions().width}px;` + (i > 0 ? `margin-left: ${getDimensions().spacing}px;` : ""),
        className: "reward-display",
        child: Box({
            vertical: true,
            vpack: "center",
            children: [
                Label({ className: "reward-name", label: reward.name, wrap: true, justification: "center" }),
                PriceDisplay(reward.price),
                SoldDisplay(reward.sold),
            ],
        }),
    });

// Reward bottom is up but we want offset so move down (total 2 * rewardBottom offset)
const Spacer = () => hookWindowOpen(Box(), self => (self.css = `min-height: ${getDimensions().bottom * 1.5}px;`));

if (fileExists(logPath)) {
    console.log(`[INFO] Warframe EE.log path: ${logPath}`);

    try {
        if (keybind && exec("wmctrl -m").split("\n")[0].includes("Hyprland")) {
            console.log("[INFO] Detected window manager as Hyprland. Registering keybind...");
            // Unbind then rebind to avoid duplicate binds
            execAsync(`hyprctl keyword unbind '${keybind}'`)
                .then(() =>
                    execAsync(`hyprctl keyword bind '${keybind},exec,${App.configDir}/../trigger.sh'`).catch(print)
                )
                .catch(print);
        }
    } catch (e) {
        // Ignore spawn error cause no wmctrl
        if (!(e instanceof GLib.SpawnError)) throw e;
    }

    globalThis.trigger = () => {
        exec(`grimblast save active ${SCREENSHOT_PATH}`);
        const pyOut = execPython("parser", SCREENSHOT_PATH);
        // Update databases async
        execPython("database", "", true).catch(print);
        try {
            rewards.setValue(JSON.parse(pyOut));
        } catch {
            console.warn(`Unable to parse script output as JSON: ${pyOut}`);
        }
    };

    const rewards = Variable();
    subprocess(["tail", "-f", logPath], out => {
        if (
            out.includes("Pause countdown done") ||
            out.includes("Got rewards") ||
            out.includes("Created /Lotus/Interface/ProjectionRewardChoice.swf")
        )
            trigger();
    });

    const RewardsDisplay = () =>
        Box().hook(rewards, self => {
            if (rewards.value) self.children = rewards.value.map(RewardDisplay);
        });

    const MainWindow = () =>
        Window({
            name: "wfinfo",
            visible: false,
            layer: "overlay",
            exclusivity: "ignore",
            keymode: "none",
            child: Box({ vertical: true, children: [Spacer(), RewardsDisplay()] }),
            setup: self => {
                // Allow click through
                const dummyRegion = new Cairo.Region();
                const setRegion = () => self.window.input_shape_combine_region(dummyRegion, 0, 0);
                hookWindowOpen(self, setRegion);
                Utils.timeout(1, setRegion);

                let timeout;
                self.hook(rewards, () => {
                    if (rewards.value && rewards.value.length) {
                        console.log("Got rewards:", rewards.value);
                        App.openWindow(self.name);

                        // Try close when reward choosing over or in 15 seconds
                        timeout?.destroy();
                        const timeLeft = Math.min(15, execPython("time_left", SCREENSHOT_PATH)) || 15;
                        timeout = setTimeout(() => App.closeWindow(self.name), timeLeft * 1000);
                    }
                });
            },
        });

    ensureDirectory(CACHE_DIR);
    globalThis.reloadCss = () => {
        exec(`sass ${App.configDir}/scss/main.scss ${CACHE_DIR}/style.css`);
        App.resetCss();
        App.applyCss(`${CACHE_DIR}/style.css`);
    };
    reloadCss();

    App.addIcons(`${App.configDir}/assets/icons`);
    App.config({
        css: `${CACHE_DIR}/style.css`,
        stackTraceOnError: true,
        windows: [MainWindow()],
    });
} else {
    console.error("Unable to find Warframe EE.log, exiting.");
    App.quit();
}
