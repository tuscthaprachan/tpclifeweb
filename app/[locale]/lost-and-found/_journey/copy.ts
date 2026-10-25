import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { JourneyKind } from "@/lib/lost-found/public/steps";

/** The question a page asks, which is also its heading and its title. */
export function stepTitle(kind: JourneyKind, step: string, locale: Locale): string {
  const found = kind === "found";
  switch (step) {
    case "category":
      return UI.lfpQCategory[locale];
    case "describe":
      return (found ? UI.lfpQDescribeFound : UI.lfpQDescribeLost)[locale];
    case "where":
      return (found ? UI.lfpQWhereFound : UI.lfpQWhereLost)[locale];
    case "when":
      return (found ? UI.lfpQWhenFound : UI.lfpQWhenLost)[locale];
    case "detail":
      return UI.lfpQDetail[locale];
    case "now":
      return UI.lfpQWhereNow[locale];
    case "proof":
      return UI.lfpQProof[locale];
    case "contact":
      return UI.lfpQContact[locale];
    case "check":
      return (kind === "claim" ? UI.lfpCheckTitleClaim : UI.lfpCheckTitleReport)[locale];
    default:
      return (kind === "claim" ? UI.lfpDoneClaimTitle : UI.reportReceivedTitle)[locale];
  }
}

/** The name of the service, for breadcrumbs and start pages. */
export function journeyName(kind: JourneyKind, locale: Locale): string {
  return (kind === "lost" ? UI.reportLostItem : kind === "found" ? UI.reportFoundItem : UI.lfpClaimTitle)[locale];
}

/** The element a field error links to. */
export function errorAnchor(field: string): string {
  switch (field) {
    case "category":
    case "whereNow":
    case "preferred":
    case "consent":
      return `#${field}-0`;
    case "when":
      return "#when-day";
    default:
      return `#${field}`;
  }
}
