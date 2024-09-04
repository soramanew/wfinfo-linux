# WFInfo for Linux

This is a limited remake of [wfinfo](https://wfinfo.warframestat.us) in Python and JS for Linux (Wayland).

## Features

-   Supports Wayland
-   Detect rewards screen (inconsistent)
-   Manual trigger detection
-   Global keybind (Hyprland only)
-   Display price and volume stats for items
-   Overlay (like steam overlay)
-   Relic view with price data

### Fissure reward display:

![Reward price display](/readme/reward_display.png)

### Relic view in overlay:

![Relic view](/readme/relic_view.png)

## Requirements

-   `python` >= 3.12
-   `tesseract` for OCR
-   [`AGS`](https://github.com/Aylur/ags) - for GUI
-   `dart-sass` - for compiling GUI styles
-   `grim` - for screenshots
-   `wlr-randr` - for getting active monitor for screenshots
-   `wmctrl` - for WM/DE detection
-   `fish` - for `wfinfo` script

> [!TIP]
> If you _really_ don't want to use `fish`, you can just translate it to your preferred shell.

## Installation

Clone this repo and run the install script. If not on an Arch-based distro or not using the `yay` AUR helper, you must
install all dependencies manually. The script will attempt to add the script to your path if `~/.local/bin` is in your
path, otherwise optionally add it to your path by symlinking the `wfinfo` script to your path directory.

> [!WARNING]
> Do not copy the script, only symlink it. The script depends on its real location to resolve paths.

## Usage

Start the program via the `wfinfo` script in the base directory. The program will monitor Warframe's `EE.log` file
and trigger when it detects a reward screen. As Warframe stores its logs in a buffer and only outputs to the log file
when the buffer is full, the auto detection may be inconsistent.

The reward display can be manually triggered while running via `wfinfo -t`. If on Hyprland, the program will
automatically create a shortcut for the trigger script (`F2` by default) on start. This WILL remove any prior binds
for that key. Otherwise, just create a keybind manually depending on your DE.

The overlay can be toggled with `F3` (if on Hyprland, otherwise set the shortcut manually). All keybinds can be changed
in `ags/config.user.js`.

## Configuration

Configuration is in `ags/config.user.js`. Read the comments in the file for how to configure.

## FAQ

**Q: What if my `EE.log` file is in a different location?**

**A:** The default location is set in `ags/config.user.js`, but you can change it to whatever value you like in that
file. If the file is not in the default location, the program will try to search for it in your home directory.

**Q: How can I change the keybind for manually triggering the detection?**

**A:** Look in `ags/config.user.js`.

**Q: Does this work with a multi-monitor setup?**

**A:** It should, however I do not own one myself and therefore cannot test it.

**Q: The font size is too large! How can I change it?**

**A:** The font size is dependent on your GTK font size. If you _really_ want to change it, go into `ags/scss/lib/_font.scss`
to change it.

**Q: What are these `Gio.UnixInputStream has been moved ... Please update your code...` warnings I am seeing?**

**A:** Ignore them, they do not affect the functionality of the program. They are from `AGS` and I am unable to get rid
of them.
