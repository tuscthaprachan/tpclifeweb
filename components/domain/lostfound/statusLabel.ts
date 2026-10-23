import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { LostFoundStatus } from "@/lib/content/types";

/** Localised label for the `LostFoundStatus` union. */
export function statusLabel(status: LostFoundStatus, locale: Locale): string {
  switch (status) {
    case "open":
      return UI.lostFoundStatusOpen[locale];
    case "matched":
      return UI.lostFoundStatusMatched[locale];
    case "returned":
      return UI.lostFoundStatusReturned[locale];
    case "unclaimed":
      return UI.lostFoundStatusUnclaimed[locale];
    case "withdrawn":
      return UI.lostFoundStatusWithdrawn[locale];
  }
}

/** Every `LostFoundStatus` value, in the order they should list in a filter. */
export const LOST_FOUND_STATUSES: readonly LostFoundStatus[] = [
  "open",
  "matched",
  "returned",
  "unclaimed",
  "withdrawn",
];
