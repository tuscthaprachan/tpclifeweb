import { nextLoadAction, type LoadOutcome } from "@/lib/canteen/data-load";
import type { CanteenData } from "@/lib/content/types";

export const CANTEEN_DATA_URL = "/api/canteen-data";

const RELOADED = "canteen-data-reload";

let loading: Promise<CanteenData> | undefined;

function reloadSpent(): boolean {
  try {
    return window.sessionStorage.getItem(RELOADED) !== null;
  } catch {
    return true;
  }
}

function setReloadSpent(spent: boolean): void {
  try {
    if (spent) window.sessionStorage.setItem(RELOADED, "1");
    else window.sessionStorage.removeItem(RELOADED);
  } catch {}
}

function settle(outcome: LoadOutcome, data?: CanteenData): Promise<CanteenData> {
  const action = nextLoadAction(reloadSpent(), outcome);
  if (action === "resolve" && data) {
    setReloadSpent(false);
    return Promise.resolve(data);
  }
  loading = undefined;
  if (action === "reload") {
    setReloadSpent(true);
    window.location.reload();
    return new Promise<never>(() => {});
  }
  return Promise.reject(new Error("The canteen data could not be loaded."));
}

/** The canteen dataset, fetched once per page session and shared by every /eat page. Never settles on the server; rejects after the one automatic reload has been spent. */
export function canteenData(): Promise<CanteenData> {
  if (typeof window === "undefined") return new Promise<never>(() => {});
  loading ??= fetch(CANTEEN_DATA_URL).then(
    (response) => (response.ok ? (response.json() as Promise<CanteenData>).then((data) => settle("ok", data), () => settle("failed")) : settle("failed")),
    () => settle("failed"),
  );
  return loading;
}
