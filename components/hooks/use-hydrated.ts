"use client";

import { useSyncExternalStore } from "react";

const subscribeNever = () => () => {};

/** False on the server and the first client render, true once hydrated. */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribeNever, () => true, () => false);
}
