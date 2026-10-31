import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { fillText } from "./fill";

const BUDDHIST_OFFSET = 543;

function capitalise(text: string, capital: boolean): string {
  return capital ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

/**
 * The academic year as the council writes it, from its Buddhist era number.
 * Thai: "ปีการศึกษา 2568". English: "academic year 2568 (2025 to 2026)".
 */
export function academicYearLabel(buddhistYear: number, locale: Locale, options: { capital?: boolean } = {}): string {
  const from = buddhistYear - BUDDHIST_OFFSET;
  const text = fillText(UI.odYearAcademic[locale], { year: buddhistYear, from, to: from + 1 });
  return capitalise(text, options.capital === true && locale === "en");
}

/**
 * The fiscal year from its Buddhist era number.
 * Thai: "ปีงบประมาณ 2569". English: "FY 2569 (2026)".
 */
export function fiscalYearLabel(buddhistYear: number, locale: Locale): string {
  return fillText(UI.odYearFiscal[locale], { year: buddhistYear, ce: buddhistYear - BUDDHIST_OFFSET });
}
