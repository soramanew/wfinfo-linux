import Gdk from "gi://Gdk";

const display = Gdk.Display.get_default();
const defaultCursor = Gdk.Cursor.new_from_name(display, "default");

const setupCursor = (button, cursor) => {
    button.connect("enter-notify-event", () =>
        button.get_window().set_cursor(Gdk.Cursor.new_from_name(display, cursor))
    );

    button.connect("leave-notify-event", () => button.get_window().set_cursor(defaultCursor));
};

// Hand pointing cursor on hover
export const setupCursorHover = button => setupCursor(button, "pointer");

// Crosshair cursor on hover
export const setupCursorHoverAim = button => setupCursor(button, "crosshair");

// Hand ready to grab on hover
export const setupCursorHoverGrab = button => setupCursor(button, "grab");

// "?" mark cursor on hover
export const setupCursorHoverInfo = button => setupCursor(button, "help");
