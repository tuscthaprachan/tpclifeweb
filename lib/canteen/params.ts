/**
 * URL parameters for the canteen section: one filter state read by every
 * view (browse, randomiser, map, budget tools, group mode).
 *
 * `parse` and `serialise` are exact inverses on valid input and normalise
 * everything else: invalid values are dropped silently, duplicates removed,
 * lists put in one canonical order, and defaults left out. So the same
 * filters always produce the same URL, whatever order the browser, a no
 * JavaScript form, or a shared link supplied them in.
 *
 * Pure, so the server (no JavaScript) and the client run identical code.
 *
 * Example: `?max=50&diet=nopork&type=noodles,soup&spice=1&sort=price`
 */

import { DISH_TYPES } from "./options";
import type { DishType, Protein } from "@/lib/sanity/types";

/** Diet filter keys. `halal` is "stall says or certified", `certified` is the stronger tag alone. */
export const DIET_KEYS = ["nopork", "halal", "certified", "vegetarian", "vegan", "jay"] as const;
export type DietKey = (typeof DIET_KEYS)[number];

/** Proteins a student can choose to avoid. A preference, never an allergy tool. */
export const AVOID_KEYS = ["pork", "beef", "seafood", "fish", "egg"] as const satisfies readonly Protein[];
export type AvoidKey = (typeof AVOID_KEYS)[number];

/** Feel chips. Opposite pairs (hot or cold, soupy or dry, fried or not) never contradict each other: choosing both means no constraint. */
export const FEEL_KEYS = ["hot", "cold", "soupy", "dry", "fried", "notFried"] as const;
export type FeelKey = (typeof FEEL_KEYS)[number];

export const SORT_KEYS = ["price", "walk", "name", "stall"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const GROUP_KEYS = ["none", "stall", "canonical"] as const;
export type GroupKey = (typeof GROUP_KEYS)[number];

export const DEFAULT_SORT: SortKey = "price";
export const DEFAULT_GROUP: GroupKey = "none";

/** Highest budget accepted from a URL, in baht. Anything above is dropped as not meaningful. */
export const MAX_BUDGET = 5000;

/** The "any" end of the spice scale. A spice filter of 3 means no limit and is normalised away. */
const SPICE_NO_LIMIT = 3;

/**
 * Every filter the canteen understands. Optional fields mean "not set".
 * Arrays are always sorted in canonical order and free of duplicates.
 */
export interface CanteenFilters {
  /** Budget in baht, whole number. Dishes costing more are hidden. */
  max?: number;
  /** Count the dearest variant (for example special, พิเศษ) as the price when checking the budget. */
  variants: boolean;
  /** Every listed diet must hold (AND). */
  diet: DietKey[];
  /** Any listed type matches (OR). */
  type: DishType[];
  /** None of the listed proteins may be present. */
  avoid: AvoidKey[];
  /** Highest typical spice level accepted, 0 to 2. Unset means any. */
  spice?: 0 | 1 | 2;
  feel: FeelKey[];
  /** One stall, by slug. */
  stall?: string;
  /** Only stalls not known to be closed right now, by scheduled hours. */
  open: boolean;
  sort: SortKey;
  group: GroupKey;
}

/** Input accepted by `parse`: Next's `searchParams`, a plain object, or a `URLSearchParams`. */
export type RawParams = Record<string, string | string[] | undefined> | URLSearchParams;

/** A fresh filter state with nothing set. */
export function defaultFilters(): CanteenFilters {
  return {
    variants: false,
    diet: [],
    type: [],
    avoid: [],
    feel: [],
    open: false,
    sort: DEFAULT_SORT,
    group: DEFAULT_GROUP,
  };
}

/** Every value given for `name`, flattened across repeated parameters. */
function values(raw: RawParams, name: string): string[] {
  if (raw instanceof URLSearchParams) return raw.getAll(name);
  const value = raw[name];
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/** Every comma separated token across all values for `name`, trimmed, empty ones removed. */
function tokens(raw: RawParams, name: string): string[] {
  return values(raw, name)
    .flatMap((value) => value.split(","))
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

function first(raw: RawParams, name: string): string | undefined {
  const [value] = values(raw, name);
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** Keeps the tokens that are in `allowed`, deduplicated, in the order of `allowed`. */
function canonicalList<T extends string>(found: string[], allowed: readonly T[]): T[] {
  const set = new Set(found);
  return allowed.filter((option) => set.has(option));
}

function flag(raw: RawParams, name: string): boolean {
  const value = first(raw, name)?.toLowerCase();
  return value === "1" || value === "true" || value === "on" || value === "yes";
}

/** A slug as it appears in a URL: lowercase letters, digits and hyphens. */
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,79}$/;

/**
 * Reads the canteen filters out of URL parameters. Never throws. Anything
 * invalid is dropped, so a hand edited or stale link degrades to fewer
 * filters rather than to an error.
 */
export function parse(raw: RawParams): CanteenFilters {
  const filters = defaultFilters();

  const maxText = first(raw, "max");
  if (maxText !== undefined && /^\d{1,5}$/.test(maxText)) {
    const max = Number(maxText);
    if (max >= 1 && max <= MAX_BUDGET) filters.max = max;
  }

  filters.variants = flag(raw, "variants");
  filters.diet = canonicalList(tokens(raw, "diet"), DIET_KEYS);
  filters.type = canonicalList(tokens(raw, "type"), DISH_TYPES);
  filters.avoid = canonicalList(tokens(raw, "avoid"), AVOID_KEYS);
  filters.feel = canonicalList(tokens(raw, "feel"), FEEL_KEYS);

  const spiceText = first(raw, "spice");
  if (spiceText !== undefined && /^[0-3]$/.test(spiceText)) {
    const spice = Number(spiceText);
    if (spice < SPICE_NO_LIMIT) filters.spice = spice as 0 | 1 | 2;
  }

  const stall = first(raw, "stall");
  if (stall !== undefined && SLUG_PATTERN.test(stall)) filters.stall = stall;

  filters.open = flag(raw, "open");

  const sort = first(raw, "sort");
  if (sort !== undefined && (SORT_KEYS as readonly string[]).includes(sort)) filters.sort = sort as SortKey;

  const group = first(raw, "group");
  if (group !== undefined && (GROUP_KEYS as readonly string[]).includes(group)) filters.group = group as GroupKey;

  return filters;
}

/**
 * Re-normalises a filter object, for example one built by hand in code.
 * Equivalent to `parse(serialise(filters))` without the string round trip.
 */
export function normalise(filters: Partial<CanteenFilters>): CanteenFilters {
  return parse(new URLSearchParams(serialise({ ...defaultFilters(), ...filters })));
}

/**
 * Turns filters into a query string without the leading `?`. Parameters
 * come out in one fixed order, lists in canonical order, commas are left
 * literal (they are legal in a query), and defaults are omitted, so equal
 * filters always give the identical string. Empty filters give "".
 */
export function serialise(filters: CanteenFilters): string {
  const parts: string[] = [];
  const add = (name: string, value: string) => parts.push(`${name}=${encodeValue(value)}`);

  if (filters.max !== undefined) add("max", String(filters.max));
  if (filters.diet.length > 0) add("diet", canonicalList(filters.diet, DIET_KEYS).join(","));
  if (filters.type.length > 0) add("type", canonicalList(filters.type, DISH_TYPES).join(","));
  if (filters.avoid.length > 0) add("avoid", canonicalList(filters.avoid, AVOID_KEYS).join(","));
  if (filters.spice !== undefined && filters.spice < SPICE_NO_LIMIT) add("spice", String(filters.spice));
  if (filters.feel.length > 0) add("feel", canonicalList(filters.feel, FEEL_KEYS).join(","));
  if (filters.stall !== undefined) add("stall", filters.stall);
  if (filters.open) add("open", "1");
  if (filters.sort !== DEFAULT_SORT) add("sort", filters.sort);
  if (filters.group !== DEFAULT_GROUP) add("group", filters.group);
  if (filters.variants) add("variants", "1");

  return parts.join("&");
}

/** encodeURIComponent, but commas stay literal so lists read as `type=noodles,soup`. */
function encodeValue(value: string): string {
  return encodeURIComponent(value).replace(/%2C/gi, ",");
}

/**
 * Builds a link that carries the filters. `extra` adds parameters after the
 * filters (for example `seed`, `mode`, `p`); entries that are undefined,
 * null or empty are skipped. A `path` that already has a query string gets
 * the parameters appended to it. Pass the path with its locale prefix, for
 * example `localePath(locale, "/eat/pick")`.
 */
export function withFilters(
  path: string,
  filters: CanteenFilters,
  extra?: Record<string, string | number | boolean | null | undefined>,
): string {
  const parts: string[] = [];
  const base = serialise(filters);
  if (base) parts.push(base);
  for (const [name, value] of Object.entries(extra ?? {})) {
    if (value === undefined || value === null || value === "" || value === false) continue;
    parts.push(`${encodeURIComponent(name)}=${encodeValue(value === true ? "1" : String(value))}`);
  }
  if (parts.length === 0) return path;
  const joiner = path.includes("?") ? (/[?&]$/.test(path) ? "" : "&") : "?";
  return `${path}${joiner}${parts.join("&")}`;
}

/**
 * The filters that are switched on, as the names of their URL parameters, in
 * canonical order. Sort and group are display choices, not filters, and are
 * not counted. Drives "3 filters" on the summary bar.
 */
export function activeFilterParams(filters: CanteenFilters): FilterParam[] {
  const active: FilterParam[] = [];
  if (filters.max !== undefined) active.push("max");
  if (filters.diet.length > 0) active.push("diet");
  if (filters.type.length > 0) active.push("type");
  if (filters.avoid.length > 0) active.push("avoid");
  if (filters.spice !== undefined) active.push("spice");
  if (filters.feel.length > 0) active.push("feel");
  if (filters.stall !== undefined) active.push("stall");
  if (filters.open) active.push("open");
  return active;
}

/** The URL parameters that narrow the result set. */
export type FilterParam = "max" | "diet" | "type" | "avoid" | "spice" | "feel" | "stall" | "open";

/** How many individual filter values are on: each diet, type, avoid and feel counts one. */
export function countActiveValues(filters: CanteenFilters): number {
  return (
    (filters.max !== undefined ? 1 : 0) +
    filters.diet.length +
    filters.type.length +
    filters.avoid.length +
    (filters.spice !== undefined ? 1 : 0) +
    filters.feel.length +
    (filters.stall !== undefined ? 1 : 0) +
    (filters.open ? 1 : 0)
  );
}

