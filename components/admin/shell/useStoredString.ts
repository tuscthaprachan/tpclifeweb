"use client";

import { useCallback, useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
const memory = new Map<string, string>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key) ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
}

/**
 * A string kept in localStorage for per-viewer conveniences. The server and the
 * first client render both see `null`, so nothing mismatches; the stored value
 * arrives straight after hydration. If storage is blocked it lives in memory.
 */
export function useStoredString(key: string): [string | null, (value: string) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null,
  );
  const set = useCallback(
    (next: string) => {
      memory.set(key, next);
      try {
        window.localStorage.setItem(key, next);
      } catch {
        // Storage is blocked: the in-memory copy keeps the choice for this visit.
      }
      listeners.forEach((l) => l());
    },
    [key],
  );
  return [value, set];
}
