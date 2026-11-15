"use client";

import { useCallback, useReducer } from "react";
import { initialUrlEcho, isEditing, reduceUrlEcho } from "./url-echo-machine";

export interface UrlEcho {
  /** The key the interface should reflect: the URL, except while an edit started here is on its way. */
  shown: string;
  /** True from `edit` until the URL reaches that key, changes some other way, or `cancel`. */
  editing: boolean;
  /** Counts changes that did not come from here, to remount uncontrolled fields. */
  generation: number;
  /** Starts a change to `key`. `show` also makes `shown` follow at once. A key equal to the current URL starts nothing. */
  edit: (key: string, show?: boolean) => void;
  /** Stops waiting for the URL. */
  cancel: () => void;
}

/** Tells a URL change this component made (an echo) from one it did not (external). `key` is the current URL, normalised the same way as the keys passed to `edit`. */
export function useUrlEcho(key: string): UrlEcho {
  const [state, dispatch] = useReducer(reduceUrlEcho, key, initialUrlEcho);
  if (key !== state.url) dispatch({ type: "url", key });
  const edit = useCallback((next: string, show?: boolean) => dispatch({ type: "edit", key: next, ...(show ? { show } : {}) }), []);
  const cancel = useCallback(() => dispatch({ type: "cancel" }), []);
  return { shown: state.shown, editing: isEditing(state), generation: state.generation, edit, cancel };
}
