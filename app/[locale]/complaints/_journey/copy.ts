import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";

/** The question a page asks, which is also its heading and its title. */
export function stepTitle(step: string, locale: Locale): string {
  switch (step) {
    case "identity":
      return UI.cpQIdentity[locale];
    case "category":
      return UI.cpQCategory[locale];
    case "describe":
      return UI.cpQDescribe[locale];
    case "when":
      return UI.cpQWhen[locale];
    case "remedy":
      return UI.cpQRemedy[locale];
    case "evidence":
      return UI.cpQEvidence[locale];
    case "contact":
      return UI.cpQContact[locale];
    case "check":
      return UI.cpCheckTitle[locale];
    default:
      return UI.cpDoneTitle[locale];
  }
}

/** The element a field error links to. */
export function errorAnchor(field: string): string {
  switch (field) {
    case "identity":
    case "category":
    case "preferred":
    case "consent":
      return `#${field}-0`;
    default:
      return `#${field}`;
  }
}
