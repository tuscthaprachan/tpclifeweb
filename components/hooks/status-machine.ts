/**
 * A short-lived status message for a live region. `show` bumps `nonce` even
 * when the value repeats, so a view that keys the text on it is announced
 * again. `expire` only clears the message it was scheduled for.
 */
export type StatusState<T> = { value: T | null; nonce: number };

export type StatusEvent<T> = { type: "show"; value: T } | { type: "expire"; nonce: number } | { type: "clear" };

export function initialStatus<T>(): StatusState<T> {
  return { value: null, nonce: 0 };
}

export function statusReducer<T>(state: StatusState<T>, event: StatusEvent<T>): StatusState<T> {
  switch (event.type) {
    case "show":
      return { value: event.value, nonce: state.nonce + 1 };
    case "expire":
      return event.nonce === state.nonce && state.value !== null ? { ...state, value: null } : state;
    case "clear":
      return state.value === null ? state : { ...state, value: null };
  }
}
