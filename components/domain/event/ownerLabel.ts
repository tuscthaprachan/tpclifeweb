import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { Owner } from "@/lib/content/types";

/** Localised label for a governance `Owner`. Every event must be attributed to one. */
export function ownerLabel(owner: Owner, locale: Locale): string {
  switch (owner) {
    case "tusu":
      return UI.ownerTusu[locale];
    case "tusc":
      return UI.ownerTusc[locale];
    case "university":
      return UI.ownerUniversity[locale];
    case "joint":
      return UI.ownerJoint[locale];
  }
}
