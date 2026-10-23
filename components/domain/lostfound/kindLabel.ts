import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { LostFoundKind } from "@/lib/content/types";

/** Localised single word for the `LostFoundKind` union ("Lost" / "Found"), used on badges and filters. */
export function kindLabel(kind: LostFoundKind, locale: Locale): string {
  return kind === "lost" ? UI.itemLost[locale] : UI.itemFound[locale];
}
