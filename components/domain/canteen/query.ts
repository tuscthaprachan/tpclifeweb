/**
 * Reading the filter form back into filters and a URL. Pure, so the server
 * (a plain GET) and the client (instant apply) agree on every URL.
 *
 * The form has one extra field that `lib/canteen/params.ts` does not know:
 * `maxOther`, the amount box shown with the "Other" budget chip. It counts
 * only when "Other" (or no chip) is chosen. Everything else is a straight
 * read through `parse`.
 *
 * The whole-meal budget is the separate `meal` parameter. Its quick form
 * offers an "Other" choice (`meal=other`) with the amount in `mealOther`;
 * `tidyQuery` folds that into `meal=<amount>`. Old links that put the meal
 * budget in `max` are moved to `meal` by `canonicalMealQuery`.
 */

import { parse, parseMealBudget, serialise, type CanteenFilters, type RawParams } from "@/lib/canteen/params";

/** Flattens Next's `searchParams` (or a plain object) into URLSearchParams. */
export function toSearchParams(raw: RawParams): URLSearchParams {
  if (raw instanceof URLSearchParams) return new URLSearchParams(raw);
  const out = new URLSearchParams();
  for (const [name, value] of Object.entries(raw)) {
    if (value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) out.append(name, item);
  }
  return out;
}

function typedMax(params: URLSearchParams): string | undefined {
  const chosen = params.get("max")?.trim();
  return chosen && chosen !== "other" ? undefined : params.get("maxOther")?.trim() || undefined;
}

/**
 * Filters out of a request's query. Same as `parse`, plus the `maxOther`
 * box, which sets the budget when the "Other" chip (`max=other`) is chosen
 * or no chip is.
 */
export function readFilters(raw: RawParams): CanteenFilters {
  const params = toSearchParams(raw);
  const other = typedMax(params);
  if (other) {
    params.delete("max");
    params.set("max", other);
  }
  return parse(params);
}

/**
 * The tidy form of a request's query, or null when it is already tidy.
 * A plain GET of the filter form sends every field, so the address fills with
 * empty values such as `max=&maxOther=`. Tidy drops empty values, folds a
 * typed amount (`maxOther`) into `max` and a typed meal amount (`mealOther`,
 * used when `meal=other`) into `meal`, and leaves everything else, in order,
 * alone. Returns the query string without the leading `?`.
 */
export function tidyQuery(raw: RawParams): string | null {
  const before = toSearchParams(raw);
  const other = typedMax(before);
  const mealOther = before.get("mealOther")?.trim();
  const after = new URLSearchParams();
  for (const [name, value] of before) {
    if (name === "maxOther" || name === "mealOther") continue;
    if (value.trim() === "") continue;
    if (name === "max" && (other || value.trim() === "other")) continue;
    if (name === "meal" && value.trim() === "other") {
      if (mealOther) after.append("meal", mealOther);
      continue;
    }
    after.append(name, value);
  }
  if (other) after.append("max", other);
  return before.toString() === after.toString() ? null : after.toString();
}

/**
 * Old links kept the whole-meal budget in `max`. When a meal page is asked for
 * with a valid `max` and no valid `meal`, returns the query with that `max`
 * moved to `meal` (in the same place); otherwise null.
 */
export function legacyMealQuery(raw: RawParams): string | null {
  const params = toSearchParams(raw);
  if (parseMealBudget(params) !== undefined) return null;
  const max = parse(params).max;
  if (max === undefined) return null;
  const out = new URLSearchParams();
  let moved = false;
  for (const [name, value] of params) {
    if (name === "meal") continue;
    if (name === "max") {
      if (!moved) out.append("meal", String(max));
      moved = true;
      continue;
    }
    out.append(name, value);
  }
  return out.toString();
}

/**
 * The one address a meal page should live at, or null when the request is
 * already it: tidied, and with an old `max` meal budget moved to `meal`
 * (when `legacy` is on, that is, the page is in meal mode). Applied in one step so
 * an old messy link redirects once.
 */
export function canonicalMealQuery(raw: RawParams, legacy = true): string | null {
  const tidy = tidyQuery(raw);
  const moved = legacy ? legacyMealQuery(tidy === null ? raw : new URLSearchParams(tidy)) : null;
  return moved ?? tidy;
}

/** Query parameters the filter form leaves alone: everything it does not own. */
const FORM_OWNED = new Set([
  "max",
  "maxOther",
  "variants",
  "diet",
  "type",
  "avoid",
  "feel",
  "stall",
  "open",
  "sort",
  "group",
  "q",
  "page",
  "show",
]);

/**
 * The query string a submitted filter form turns into: normalised filters,
 * then the `carry` parameters (for example `seed` on a page that has one),
 * and never `page`, because a changed filter starts again at page one.
 * Returns the string without the leading `?`.
 */
export function formQuery(form: URLSearchParams, carry: Record<string, string> = {}): string {
  const base = serialise(readFilters(form));
  const extra = new URLSearchParams();
  for (const [name, value] of Object.entries(carry)) {
    if (!FORM_OWNED.has(name) && value !== "") extra.set(name, value);
  }
  const tail = extra.toString();
  return [base, tail].filter(Boolean).join("&");
}

/** The parameters of a request that the filter form does not own, ready to pass as `carry`. */
export function carriedParams(raw: RawParams): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, value] of toSearchParams(raw).entries()) {
    if (!FORM_OWNED.has(name) && value !== "" && !(name in out)) out[name] = value;
  }
  return out;
}
