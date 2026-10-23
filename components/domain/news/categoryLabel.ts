import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { Category } from "@/lib/content/types";

/** Localised label for the shared `Category` union, which also drives the fill tone via `Tag`. */
export function categoryLabel(category: Category, locale: Locale): string {
  switch (category) {
    case "transport":
      return UI.categoryTransport[locale];
    case "welfare":
      return UI.categoryWelfare[locale];
    case "activity":
      return UI.categoryActivity[locale];
    case "governance":
      return UI.categoryGovernance[locale];
  }
}
