# WFInfo for Linux

This is a simple recreation of [wfinfo](https://wfinfo.warframestat.us) for Linux on Hyprland.

> [!IMPORTANT]
> This only works on Hyprland.

## Features

-   Relic reward price display

![Reward price display](/readme/reward_display.png)

## Requirements

-   python >= 3.12
-   tesseract - for OCR
-   [AGS](https://github.com/Aylur/ags) - for GUI
-   dart-sass - for compiling GUI styles
-   grimblast - for screenshots
-   fish - optional, for `.sh` scripts
-   wmctrl - optional, for auto keybind creation

## Installation

Clone this repo and install all dependencies.

On Arch Linux (using `yay` AUR helper):

```sh
yay -S --needed python tesseract-data-eng tesseract aylurs-gtk-shell-git dart-sass grimblast fish wmctrl
```

## Usage

> [!TIP]
> Scripts require the `fish` shell. If not using `fish`, just look into the files and translate them to your shell.

Start the program via the `run.sh` script in the base directory. The program will monitor the Warframe `EE.log` file
and trigger when it detects a reward screen. As Warframe stores its logs in a buffer and only outputs to the log file
when the buffer is full, the auto detection may be inconsistent.

The reward display can be manually triggered while running via the `trigger.sh` script in the base directory. The
program will automatically create a shortcut for the trigger script (`Ctrl+F2` by default) on start. This WILL remove
any prior binds for that key.

## Configuration

Configuration is in `ags/config.user.js`. Read the comments in the file for what each variable controls.
