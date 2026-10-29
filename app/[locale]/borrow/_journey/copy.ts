import { dayStart } from "@/lib/borrowing/time";
import { pick, type Locale, type LocaleString } from "@/lib/i18n/config";
import { formatDate } from "@/lib/i18n/format";
import { UI } from "@/lib/i18n/strings";
import type { FieldError } from "@/lib/borrowing/public/validate";

/** The question a page asks, which is also its heading and its title. */
export function stepTitle(step: string, locale: Locale): string {
  switch (step) {
    case "dates":
      return UI.brQDates[locale];
    case "items":
      return UI.brQItems[locale];
    case "quantities":
      return UI.brQQuantities[locale];
    case "event":
      return UI.brQEvent[locale];
    case "group":
      return UI.brQGroup[locale];
    case "student":
      return UI.brQStudent[locale];
    case "details":
      return UI.brQDetails[locale];
    case "contact":
      return UI.brQContact[locale];
    case "terms":
      return UI.brQTerms[locale];
    case "check":
      return UI.brCheckTitle[locale];
    default:
      return UI.brDoneTitle[locale];
  }
}

/** The element a field error links to. */
export function errorAnchor(field: string): string {
  switch (field) {
    case "collect":
    case "return":
      return `#${field}-day`;
    case "borrower":
    case "student":
    case "terms":
      return `#${field}-0`;
    default:
      return `#${field}`;
  }
}

/** An error as a sentence: the shared string with its values filled in. A `date` value is a day key and is written as a date. */
export function errorMessage(error: FieldError, locale: Locale): string {
  let text: string = UI[error.key][locale];
  for (const [name, value] of Object.entries(error.vars ?? {})) {
    const shown = typeof value === "object" ? pick(value as LocaleString, locale) : name === "date" ? formatDate(dayStart(String(value)), locale) : String(value);
    text = text.replaceAll(`{${name}}`, shown);
  }
  return text;
}
