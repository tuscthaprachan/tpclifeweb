import type { Locale, LocaleString } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { DocumentSummary, RecommendationRow, SurveyResultRow } from "@/lib/open-data/read";
import { formatDate } from "@/lib/i18n/format";

/** The three committee reports, by source file number. Those with a report page of their own come first. */
export const REPORT_NUMBERS = ["46", "47", "48"] as const;
export const REPORT_PAGE_NUMBERS: readonly string[] = ["46", "47"];
export const AUDIT_REPORT_NUMBER = "46";
export const CANTEEN_REPORT_NUMBER = "47";
export const BUDGET_REPORT_NUMBER = "48";

export const BUDGET_PAGE_PATH = "/about/open-data/tusc/budget/2569";
export const CANTEEN_COMMITTEE_PATH = "/about/open-data/tusc/committees/canteen-ad-hoc-committee";

export const REPORT_DESCRIPTION: Record<string, LocaleString> = {
  "46": UI.odRpDesc46,
  "47": UI.odRpDesc47,
  "48": UI.odRpDesc48,
};

export const REPORT_SHORT_NAME: Record<string, LocaleString> = {
  "46": UI.odRpShort46,
  "47": UI.odRpShort47,
  "48": UI.odRpShort48,
};

export const REPORT_ISSUER_SHORT: Record<string, LocaleString> = {
  "46": UI.odRpIssuer46,
  "47": UI.odRpIssuer47,
  "48": UI.odRpIssuer48,
};

/** A report states its date only when it carries one; none of them does today. */
export function reportDate(doc: Pick<DocumentSummary, "dateIso">, locale: Locale): string {
  return doc.dateIso ? formatDate(doc.dateIso, locale) : UI.odDateNotStated[locale];
}

const URGENCY: Record<string, LocaleString> = {
  urgent: UI.odRpUrgent,
  "long term": UI.odRpLongTerm,
  "within 1 month": UI.odRpWithinMonth,
  "future plan": UI.odRpFuturePlan,
};

const ADDRESSEE: Record<string, LocaleString> = {
  "[not stated]": UI.odNotStated,
  "Responsible university units (not named)": UI.odRpToUnits,
  "Unit responsible for cleaning (not named)": UI.odRpToCleaning,
  "All vendors in the canteen": UI.odRpToVendors,
  "Canteen managers (to negotiate with the shops)": UI.odRpToManagers,
  "Food shops in the canteen": UI.odRpToShops,
};

const RESPONSE: Record<string, LocaleString> = {
  "No response recorded": UI.odRpNoResponse,
};

/** The Thai or English wording of a stored value, or the value as stored when it has no pair. */
function label(map: Record<string, LocaleString>, value: string | null, locale: Locale): string {
  if (value === null || value === "") return UI.odNotStated[locale];
  return map[value]?.[locale] ?? value;
}

export const urgencyLabel = (value: string | null, locale: Locale) => label(URGENCY, value, locale);
export const addresseeLabel = (value: string | null, locale: Locale) => label(ADDRESSEE, value, locale);
export const responseLabel = (value: string | null, locale: Locale) => label(RESPONSE, value, locale);

export function recommendationsFor(rows: readonly RecommendationRow[], slug: string): RecommendationRow[] {
  return rows.filter((row) => row.reportDocumentSlug === slug);
}

/** The status shared by every recommendation of a report, or null when they differ or there are none. */
export function sharedResponse(rows: readonly RecommendationRow[]): string | null {
  const first = rows[0]?.responseStatus;
  if (first === undefined || first === null) return null;
  return rows.every((row) => row.responseStatus === first) ? first : null;
}

/** Survey rows for a report, most mentions first and "Other" (the fewest) last, as the report orders them. */
export function surveyFor(rows: readonly SurveyResultRow[], slug: string): SurveyResultRow[] {
  return rows.filter((row) => row.reportDocumentSlug === slug).sort((a, b) => b.mentions - a.mentions);
}

export function csvPath(dataset: "recommendations" | "canteen-survey"): string {
  return `/about/open-data/tusc/data/${dataset}.csv`;
}
