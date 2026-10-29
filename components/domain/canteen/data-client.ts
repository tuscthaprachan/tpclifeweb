import type { CanteenData } from "@/lib/content/types";

export const CANTEEN_DATA_URL = "/api/canteen-data";

const RELOADED = "canteen-data-reload";

let loading: Promise<CanteenData> | undefined;

function giveUp(): Promise<never> {
  loading = undefined;
  try {
    if (window.sessionStorage.getItem(RELOADED) === null) {
      window.sessionStorage.setItem(RELOADED, "1");
      window.location.reload();
    }
  } catch {}
  return new Promise<never>(() => {});
}

/** The canteen dataset, fetched once per page session and shared by every /eat page. Never settles on the server. */
export function canteenData(): Promise<CanteenData> {
  if (typeof window === "undefined") return new Promise<never>(() => {});
  loading ??= fetch(CANTEEN_DATA_URL).then(
    (response) => (response.ok ? (response.json() as Promise<CanteenData>) : giveUp()),
    giveUp,
  );
  return loading;
}
