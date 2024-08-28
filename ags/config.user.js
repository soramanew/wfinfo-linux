// Keybinds config (mod,key Hyprland style), set to empty or delete to disable auto creation
// For multiple modifiers, use + to separate them
export const keybinds = {
    fissure: ",F2", // Trigger manual fissure reward detection
    gui: {
        toggle: ",F3", // Toggle gui overlay
    },
};

// Path to Warframe's EE.log
export const logPath = `${Utils.HOME}/.local/share/Steam/steamapps/compatdata/230410/pfx/drive_c/users/steamuser/AppData/Local/Warframe/EE.log`;

// Whether to autodetect fissure reward screen
export const autodetect = false;

// Enable debug messages
export const debugMode = true;
