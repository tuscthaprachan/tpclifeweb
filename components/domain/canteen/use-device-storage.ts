"use client";

import { device } from "@/lib/canteen";
import { useHydrated } from "@/components/hooks/use-hydrated";

let probe: boolean | undefined;

/** `isStorageAvailable` writes to storage, so ask once and keep the answer. */
function storageReady(): boolean {
  if (probe === undefined) probe = device.isStorageAvailable();
  return probe;
}

/**
 * Whether this device can keep canteen data: null before hydration (and on the
 * server), then false or true. Render nothing that needs storage unless it is true.
 */
export function useDeviceStorage(): boolean | null {
  const hydrated = useHydrated();
  return hydrated ? storageReady() : null;
}
