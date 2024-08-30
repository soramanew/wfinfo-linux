import Cairo from "cairo";
import { autodetect, logPath as defaultLogPath } from "../config.user.js";
import { CACHE_DIR, debug, fileExists, info } from "../lib/misc.js";
const { Window, Box, Label, Icon } = Widget;
const { exec, execAsync, HOME, readFile, writeFile, subprocess } = Utils;

const SCREENSHOT_PATH = `${CACHE_DIR}/../screenshot.png`;

const findEELog = () =>
    exec(
        `bash -c "find ${HOME} -type f -name 'EE.log' -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -1 | cut -d ' ' -f 2"`
    );
const execPython = (script, args = "", async = true) =>
    (async ? execAsync : exec)(`${App.configDir}/../.venv/bin/python ${App.configDir}/../src/${script}.py ${args}`);

const getDimensions = () => {
    // For multi-monitor, get monitor window is on
    const window = App.getWindow("wfinfo-fissure").window;
    const { width, height } = window.get_display().get_monitor_at_window(window).get_geometry();
    const scale = width / height > 16 / 9 ? height / 1080 : width / 1920;
    const rewardWidth = 235 * scale; // Per reward no spacing
    const rewardSpacing = 7 * scale; // Spacing between rewards
    const rewardBottom = 80 * scale; // center - bottom = real bottom
    return {
        screenWidth: width,
        screenHeight: height,
        width: rewardWidth,
        spacing: rewardSpacing,
        bottom: rewardBottom,
    };
};

const hookWindowOpen = (self, fn) =>
    self.hook(
        App,
        (_, name, visible) => {
            if (visible && name === "wfinfo-fissure") fn(self);
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
            info(`Found EE.log as ${foundLogPath}`);
            logPath = foundLogPath;
        }
    }

    if (logPath) writeFile(logPath, cachePath);
    return logPath;
};

const VaultedIndicator = vaulted =>
    Label({ className: "subtext", label: `Vaulted${vaulted === "partial" ? " (P)" : ""}` });

const OtherIndicators = ({ vaulted }) =>
    vaulted
        ? Box({
              setup: self => {
                  if (vaulted) self.pack_end(VaultedIndicator(vaulted), false, false, 0);
              },
          })
        : Label(" "); // To take up the same space as if it were there

const RewardName = ({ name }) => Label({ className: "reward-name", label: name, wrap: true, justification: "center" });

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

const DisplayBase = (i, child) => {
    const { width, spacing } = getDimensions();
    return Box({
        css: `min-width: ${width}px;` + (i > 0 ? `margin-left: ${spacing}px;` : ""),
        child: Box({ className: "reward-display", child }),
    });
};

const RewardDisplay = (reward, i) =>
    DisplayBase(
        i,
        Box({
            vertical: true,
            setup: self => {
                self.pack_start(OtherIndicators(reward), false, false, 0);
                self.pack_start(RewardName(reward), true, true, 0);
                self.pack_end(SoldDisplay(reward.sold), false, false, 0);
                self.pack_end(PriceDisplay(reward.price), false, false, 0);
            },
        })
    );

const LoadingDisplay = i => DisplayBase(i, Label({ hexpand: true, className: "reward-name", label: "Loading..." }));

// Position gui so top = screen center
const Spacer = () => hookWindowOpen(Box(), self => (self.css = `min-height: ${getDimensions().screenHeight / 2}px;`));

globalThis.trigger = async () => {
    debug("Triggered!");

    // Screenshot
    const monitors = JSON.parse(await execAsync("wlr-randr --json"));
    const window = App.getWindow("wfinfo-fissure").window;
    const monitor = window.get_display().get_monitor_at_window(window);
    const { name: output } = monitors.find(
        m => m.make === monitor.get_manufacturer() && m.model === monitor.get_model()
    );
    await execAsync(`grim -l 0 -o '${output}' ${SCREENSHOT_PATH}`);

    // Get number of rewards and open loading
    const numRewards = await execPython("num_rewards", SCREENSHOT_PATH);
    rewards.value = parseInt(numRewards, 10);
    App.openWindow("wfinfo-fissure");

    // Update databases async
    execPython("database")
        .then(out => {
            if (!out.includes("Ignoring.")) info(out.replace(/.*\u001b\\/, ""));
        })
        .catch(print);

    // Parse image
    const pyOut = await execPython("parser", `${SCREENSHOT_PATH} ${numRewards}`);

    // Set value or warn if unable to parse
    try {
        rewards.value = JSON.parse(pyOut);
    } catch {
        console.warn(`Unable to parse script output as JSON: ${pyOut}`);
        App.closeWindow("wfinfo-fissure");
    }
};

const rewards = Variable();

if (autodetect) {
    const logPath = getLogPath();
    if (fileExists(logPath)) {
        info(`Monitoring Warframe log at ${logPath}`);
        subprocess(["tail", "-f", logPath], out => {
            if (
                out.includes("Pause countdown done") ||
                out.includes("Got rewards") ||
                out.includes("Created /Lotus/Interface/ProjectionRewardChoice.swf")
            )
                trigger().catch(print);
        });
    } else console.log("[WARNING] Unable to find Warframe's EE.log. Auto rewards detection will not be available.");
}

const RewardsDisplay = () =>
    Box().hook(rewards, self => {
        if (Array.isArray(rewards.value)) self.children = rewards.value.map(RewardDisplay);
        else if (Number.isInteger(rewards.value))
            self.children = Array.from({ length: rewards.value }, (_, i) => i).map(LoadingDisplay);
    });

export default () =>
    Window({
        name: "wfinfo-fissure",
        visible: false,
        layer: "overlay",
        anchor: ["top", "bottom"],
        exclusivity: "ignore",
        keymode: "none",
        child: Box({ vertical: true, children: [Spacer(), RewardsDisplay()] }),
        setup: self => {
            // Allow click through
            const dummyRegion = new Cairo.Region();
            Utils.timeout(1, () =>
                self.on("size-allocate", () => self.window.input_shape_combine_region(dummyRegion, 0, 0))
            );

            let timeout;
            self.hook(rewards, () => {
                if (Array.isArray(rewards.value) && rewards.value.length) {
                    debug("Got rewards:", rewards.value);

                    // Idk whether this helps but sometimes the window doesn't show up even though it says it's visible
                    self.show_all();

                    // Try close when reward choosing over or in 15 seconds
                    timeout?.destroy();
                    execPython("time_left", SCREENSHOT_PATH).then(out => {
                        const timeLeft = Math.max(3, Math.min(15, out)) || 15;

                        debug(
                            (timeLeft == out
                                ? `Detected time remaining as ${timeLeft} seconds.`
                                : `Invalid time: ${out}.`) + ` Closing GUI in ${timeLeft} seconds...`
                        );

                        const now = Date.now();
                        timeout = setTimeout(() => {
                            App.closeWindow(self.name);
                            debug(`Closed GUI after ${(Date.now() - now) / 1000} seconds.`);
                        }, timeLeft * 1000);
                    });
                }
            });
        },
    });
