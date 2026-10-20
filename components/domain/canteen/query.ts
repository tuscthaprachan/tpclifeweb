/**
 * Reading the filter form back into filters and a URL. Pure, so the server
 * (a plain GET) and the client (instant apply) agree on every URL.
 *
 * The form has one extra field that `lib/canteen/params.ts` does not know:
 * `maxOther`, the "type an amount" box beside the budget chips. When it holds
 * a number it wins over the chosen chip. Everything else is a straight read
 * through `parse`.
 */

import { parse, serialise, type CanteenFilters, type RawParams } from "@/lib/canteen/params";

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

/**
 * Filters out of a request's query. Same as `parse`, plus the `maxOther`
 * box, which overrides the budget chip when it holds a number.
 */
export function readFilters(raw: RawParams): CanteenFilters {
  const params = toSearchParams(raw);
  const other = params.get("maxOther")?.trim();
  if (other) {
    params.delete("max");
    params.set("max", other);
  }
  return parse(params);
}

/**
 * The tidy form of a request's query, or null when it is already tidy.
 * A plain GET of the filter form sends every field, so the address fills with
 * empty values such as `max=&maxOther=`. Tidy drops empty values and folds a
 * typed amount (`maxOther`) into `max`, and leaves everything else, in order,
 * alone. Returns the query string without the leading `?`.
 */
export function tidyQuery(raw: RawParams): string | null {
  const before = toSearchParams(raw);
  const other = before.get("maxOther")?.trim();
  const after = new URLSearchParams();
  for (const [name, value] of before) {
    if (name === "maxOther") continue;
    if (value.trim() === "") continue;
    if (name === "max" && other) continue;
    after.append(name, value);
  }
  if (other) after.append("max", other);
  return before.toString() === after.toString() ? null : after.toString();
}

/** Query parameters the filter form leaves alone: everything it does not own. */
const FORM_OWNED = new Set([
  "max",
  "maxOther",
  "variants",
  "diet",
  "type",
  "avoid",
  "spice",
  "feel",
  "stall",
  "open",
  "sort",
  "group",
  "page",
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
