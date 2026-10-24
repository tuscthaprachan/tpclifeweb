import { z } from "zod";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import type { Bilingual } from "@/components/domain/canteen/strings";

/** Parsing helpers shared by the four canteen content types. */

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Today's date in Thailand, "YYYY-MM-DD". */
export function todayBangkok(now: Date = new Date()): string {
  return new Date(now.getTime() + BANGKOK_OFFSET_MS).toISOString().slice(0, 10);
}

const toList = (v: unknown): unknown[] => (Array.isArray(v) ? v : v === undefined || v === "" || v === null ? [] : [v]);

/** Zero or more values from `values` (a tick list), deduplicated and in the order of `values`. */
export function enumList<const V extends readonly [string, ...string[]]>(label: string, values: V, locale: Locale) {
  return z.preprocess(toList, z.array(z.string())).transform((list, ctx): V[number][] => {
    const wanted = new Set(list.map((v) => String(v).trim()).filter(Boolean));
    if ([...wanted].some((v) => !(values as readonly string[]).includes(v))) {
      ctx.addIssue({ code: "custom", message: a("errSelectField", locale, { field: label }) });
    }
    return values.filter((v) => wanted.has(v));
  });
}

/** An array of posted rows; anything else is an empty list. */
export function rowList<S extends z.ZodType>(item: S, max: number) {
  return z.preprocess((v) => (Array.isArray(v) ? v : []), z.array(item).max(max));
}

/** True when every value in a parsed row is empty (a row added and left alone). */
export function isBlankRow(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (typeof value === "number" || typeof value === "boolean") return false;
  if (Array.isArray(value)) return value.every(isBlankRow);
  if (typeof value === "object") return Object.values(value).every(isBlankRow);
  return false;
}

/** Lower-cases the first letter in English so a field name reads mid-sentence. */
function inSentence(label: string, locale: Locale): string {
  return locale === "en" && !/^[A-Z]{2}/.test(label) ? label.charAt(0).toLowerCase() + label.slice(1) : label;
}

/** Both languages are needed for a row that is not blank: adds an error under each missing one. */
export function requireBoth(
  ctx: z.RefinementCtx,
  locale: Locale,
  path: (string | number)[],
  pair: { th: string; en: string },
  label: string,
): void {
  for (const lang of ["th", "en"] as const) {
    if (pair[lang]) continue;
    ctx.addIssue({
      code: "custom",
      path: [...path, lang],
      message: a("errFieldRequiredIn", locale, {
        field: inSentence(label, locale),
        language: a(lang === "th" ? "langThai" : "langEnglish", locale),
      }),
    });
  }
}

/** A single required value in a row that is not blank. */
export function requireValue(ctx: z.RefinementCtx, locale: Locale, path: (string | number)[], missing: boolean, label: string): void {
  if (!missing) return;
  ctx.addIssue({ code: "custom", path, message: a("errFieldRequired", locale, { field: inSentence(label, locale) }) });
}

/** Option lists for selects and tick lists, in the staff member's language. */
export function labelled<K extends string>(keys: readonly K[], labels: Record<K, Bilingual>, locale: Locale): { value: K; label: string }[] {
  return keys.map((value) => ({ value, label: labels[value][locale] }));
}
