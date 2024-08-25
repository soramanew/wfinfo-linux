# WFInfo for Linux

This is a recreation of [wfinfo](https://wfinfo.warframestat.us) for linux as it is not available on linux.

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

1. Clone this repo. That's it.

## Usage

> [!INFO]
> Scripts require the `fish` shell.

Start the program via the `run.sh` script in the base directory. The program will monitor the Warframe `EE.log` file
and trigger when it detects a reward screen. As Warframe stores its logs in a buffer and only outputs to the log file
when the buffer is full, the auto detection may be inconsistent.

The reward display can be manually triggered while running via the `trigger.sh` script in the base directory. If on
Hyprland, the program will automatically create a shortcut for the trigger script (`F2`) on start. This WILL remove
any prior binds for `F2`. Otherwise, you can create a keybind manually depending on your DE.

## Configuration

Configuration is in `ags/config.user.js`. Read the comments in the file for what each variable controls.
