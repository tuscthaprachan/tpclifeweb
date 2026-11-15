/** How long to wait after the last keystroke in a text box before applying the filters. */
export const TYPING_DELAY_MS = 450;

/** How long to wait after a radio or select changed by keyboard, so arrowing through the options applies once (3.2.2 On Input). */
export const KEYBOARD_DELAY_MS = 600;

/** What changed in the filter form. `pointer` is true when the change came from a click or touch rather than the keyboard. */
export type FilterChange = { control: "text" } | { control: "radio" | "select"; pointer: boolean } | { control: "other" };

/** How long to wait before applying a change, or null to apply it at once. */
export function filterApplyDelay(change: FilterChange): number | null {
  if (change.control === "text") return TYPING_DELAY_MS;
  if (change.control === "other") return null;
  return change.pointer ? null : KEYBOARD_DELAY_MS;
}
