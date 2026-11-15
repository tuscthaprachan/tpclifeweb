/** The one overlay the console shell shows at a time. */
export type ShellOverlay = "none" | "palette" | "help" | "drawer";

export type ShellOverlayEvent = { type: "open"; overlay: Exclude<ShellOverlay, "none"> } | { type: "close"; overlay: Exclude<ShellOverlay, "none"> } | { type: "closeAll" };

/**
 * Only one overlay is open. Opening the palette or the help dialog replaces the
 * drawer, the help dialog replaces the palette, and nothing opens behind the
 * modal help dialog. `close` is ignored unless that overlay is the open one, so
 * a late close from an overlay that was already replaced cannot shut the new one.
 */
export function shellOverlayReducer(state: ShellOverlay, event: ShellOverlayEvent): ShellOverlay {
  switch (event.type) {
    case "open":
      if (state === "help" && event.overlay !== "help") return state;
      return event.overlay;
    case "close":
      return state === event.overlay ? "none" : state;
    case "closeAll":
      return "none";
  }
}
