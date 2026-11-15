/**
 * The pure state behind `useUrlEcho`: a component that changes the address bar
 * itself must tell "the URL caught up with what I did" (an echo, leave the UI
 * alone) from "the URL changed some other way" (Back, a chip's link, so show it).
 *
 * `pending === null` is synced, a string is editing (waiting for the URL to
 * reach that key), and a URL that arrives while not matching it is external.
 */

export interface UrlEchoState {
  /** The last URL key observed. */
  url: string;
  /** The key the interface currently reflects. */
  shown: string;
  /** The key a change started here is expected to reach, or null. */
  pending: string | null;
  /** Counts external changes, so a form can remount its uncontrolled fields. */
  generation: number;
}

export type UrlEchoEvent =
  /** This component is changing the URL to `key`. `show` also makes the interface reflect it at once. */
  | { type: "edit"; key: string; show?: boolean }
  /** The URL is now `key`. */
  | { type: "url"; key: string }
  /** Stop waiting for the URL, for example after a timeout. */
  | { type: "cancel" };

export function initialUrlEcho(url: string): UrlEchoState {
  return { url, shown: url, pending: null, generation: 0 };
}

/** Whether `state` is waiting for the URL to reach a key it set. */
export function isEditing(state: UrlEchoState): boolean {
  return state.pending !== null;
}

export function reduceUrlEcho(state: UrlEchoState, event: UrlEchoEvent): UrlEchoState {
  switch (event.type) {
    case "edit": {
      const shown = event.show ? event.key : state.shown;
      if (event.key === state.url) return shown === state.shown && state.pending === null ? state : { ...state, shown, pending: null };
      return shown === state.shown && state.pending === event.key ? state : { ...state, shown, pending: event.key };
    }
    case "url":
      if (event.key === state.url) return state;
      if (state.pending === event.key) return { ...state, url: event.key, pending: null };
      return { url: event.key, shown: event.key, pending: null, generation: state.generation + 1 };
    case "cancel":
      return state.pending === null ? state : { ...state, pending: null };
  }
}
