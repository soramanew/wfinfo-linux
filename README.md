# WFInfo for Linux

This is a limited remake of [wfinfo](https://wfinfo.warframestat.us) in Python and JS for Linux (Wayland).

## Features

-   Supports Wayland
-   Detect rewards screen (inconsistent)
-   Manual trigger detection
-   Global keybind (Hyprland only)
-   Display price and volume stats for items

![Reward price display](/readme/reward_display.png)

## Requirements

-   `python` >= 3.12
-   `tesseract` for OCR
-   [`AGS`](https://github.com/Aylur/ags) - for GUI
-   `dart-sass` - for compiling GUI styles
-   `grim` - for screenshots
-   `wlr-randr` - for getting active monitor for screenshots
-   `fish` - optional, for `.sh` scripts
-   `wmctrl` - optional, for auto keybind creation

## Installation

Clone this repo and install all dependencies.

On Arch Linux (using `yay` AUR helper):

```sh
yay -S --needed python tesseract-data-eng tesseract aylurs-gtk-shell-git dart-sass grim wlr-randr fish wmctrl
```

## Usage

> [!TIP]
> Scripts require the `fish` shell. If not using `fish`, just look into the files and translate them to your shell.

Start the program via the `run.sh` script in the base directory. The program will monitor Warframe's `EE.log` file
and trigger when it detects a reward screen. As Warframe stores its logs in a buffer and only outputs to the log file
when the buffer is full, the auto detection may be inconsistent.

The reward display can be manually triggered while running via the `trigger.sh` script in the base directory. If on
Hyprland, the program will automatically create a shortcut for the trigger script (`F2` by default) on start. This WILL
remove any prior binds for that key. Otherwise, just create a keybind manually depending on your DE.

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
