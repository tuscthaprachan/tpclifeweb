/**
 * A logged, decrypted value on screen. It exists only in `shown`; hiding, an
 * auto-hide or a failure drops it, so showing it again runs the logged action
 * again, which is the audited behaviour.
 */
export type RevealState<T> = { status: "hidden" } | { status: "revealing" } | { status: "shown"; value: T } | { status: "error"; message: string };

export type RevealEvent<T> = { type: "request" } | { type: "resolved"; value: T } | { type: "failed"; message: string } | { type: "hide" };

/** What a finished action says: a value, a problem, or nothing usable. */
export type RevealOutcome<T> = { value: T } | { error: string } | null;

/** How long a revealed value stays on screen before it is hidden again. */
export const REVEAL_AUTO_HIDE_MS = 2 * 60 * 1000;

export function initialReveal<T>(): RevealState<T> {
  return { status: "hidden" };
}

/** An answer only lands while a request is in flight; a request while one is in flight or a value is shown changes nothing. */
export function revealReducer<T>(state: RevealState<T>, event: RevealEvent<T>): RevealState<T> {
  switch (event.type) {
    case "request":
      return state.status === "hidden" || state.status === "error" ? { status: "revealing" } : state;
    case "resolved":
      return state.status === "revealing" ? { status: "shown", value: event.value } : state;
    case "failed":
      return state.status === "revealing" ? { status: "error", message: event.message } : state;
    case "hide":
      return state.status === "hidden" ? state : { status: "hidden" };
  }
}

/** The event that finishes a request with this outcome; nothing usable hides again. */
export function outcomeEvent<T>(outcome: RevealOutcome<T>): RevealEvent<T> {
  if (!outcome) return { type: "hide" };
  return "error" in outcome ? { type: "failed", message: outcome.error } : { type: "resolved", value: outcome.value };
}
