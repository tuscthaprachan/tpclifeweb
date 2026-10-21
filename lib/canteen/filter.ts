/**
 * Applying filters to the canteen dataset: the result list, the counts shown
 * on every option, and the "relax" suggestions that stop a zero result being a
 * dead end. The randomiser, meal combos, week planner and group mode all
 * reuse `matchesFilters`, so one filter state means the same thing everywhere.
 *
 * Pure. The server (no JavaScript) and the client run identical code.
 */

import type { Locale } from "@/lib/i18n/config";
import type { CanteenData, CanteenDish, CanteenStall } from "@/lib/sanity/types";

import { effectivePrice, indexCanteen, isOpenNow, meetsDiet, stallOf } from "./derive";
import { BUDGET_STEPS, DISH_TYPES } from "./options";
import {
  AVOID_KEYS,
  DIET_KEYS,
  FEEL_KEYS,
  type AvoidKey,
  type CanteenFilters,
  type DietKey,
  type FeelKey,
  type FilterParam,
  type GroupKey,
} from "./params";
import type { DishType } from "@/lib/sanity/types";

/* ------------------------------------------------------------------ *
 * Matching
 * ------------------------------------------------------------------ */

/** Feel pairs. Choosing both sides of a pair is the same as choosing neither. */
const FEEL_PAIRS: ReadonlyArray<readonly [FeelKey, FeelKey]> = [
  ["hot", "cold"],
  ["soupy", "dry"],
  ["fried", "notFried"],
];

function isFried(dish: CanteenDish): boolean {
  return dish.style === "stirFried" || dish.style === "deepFried";
}

function matchesFeel(dish: CanteenDish, feel: readonly FeelKey[]): boolean {
  return FEEL_PAIRS.every(([a, b]) => {
    const wantsA = feel.includes(a);
    const wantsB = feel.includes(b);
    if (wantsA === wantsB) return true;
    const isA =
      a === "hot" ? dish.temperature === "hot" : a === "soupy" ? dish.wet : isFried(dish);
    return wantsA ? isA : !isA;
  });
}

/**
 * Whether one dish passes every filter. Sort and group are display choices
 * and play no part. Within a facet: diet is AND, type is OR, avoid excludes
 * any listed protein, feel works pairwise, the budget is
 * checked against `effectivePrice`, and `open` removes only stalls whose
 * scheduled hours say they are closed (unknown hours stay in).
 */
/** Whether a dish has what the student wants to leave out, by protein or by inferred allergen. */
function contains(dish: CanteenDish, key: AvoidKey): boolean {
  if ((dish.protein as string[]).includes(key)) return true;
  const allergens = dish.contains ?? [];
  if (key === "seafood") return allergens.includes("shellfish");
  if (key === "nuts") return allergens.includes("peanut") || allergens.includes("treeNut");
  return (allergens as string[]).includes(key);
}

export function matchesFilters(
  data: CanteenData,
  dish: CanteenDish,
  filters: CanteenFilters,
  now: Date,
): boolean {
  const stall = stallOf(data, dish);
  if (!stall) return false;

  if (filters.max !== undefined && effectivePrice(dish, filters.variants) > filters.max) return false;
  if (filters.type.length > 0 && !filters.type.includes(dish.type)) return false;
  if (filters.stall !== undefined && stall.slug.current !== filters.stall) return false;
  if (filters.avoid.some((key) => contains(dish, key))) return false;
  if (!filters.diet.every((diet) => meetsDiet(dish, stall, diet))) return false;
  if (filters.feel.length > 0 && !matchesFeel(dish, filters.feel)) return false;
  if (filters.open && isOpenNow(data.settings, stall, now) === false) return false;
  return true;
}

/**
 * Whether a dish is a sensible pick for "one thing to eat": a main course,
 * unless the student has chosen dish types themselves (then a drink or a
 * snack is exactly what they asked for). The randomiser, week planner and
 * group mode use this so "Decide for me" never answers with a bottle of water.
 * Browsing with `applyFilters` is not restricted by it.
 */
export function isMealDish(dish: CanteenDish, filters: CanteenFilters): boolean {
  return filters.type.length > 0 || dish.course === "main";
}

/* ------------------------------------------------------------------ *
 * Sorting
 * ------------------------------------------------------------------ */

/** Options for `applyFilters`. */
export interface ApplyOptions {
  /** Which language "A to Z" sorts in. Defaults to English. */
  locale?: Locale;
}

function walkRankOf(data: CanteenData, dish: CanteenDish): number {
  return indexCanteen(data).walkRank.get(dish.stall._ref) ?? Number.MAX_SAFE_INTEGER;
}

function stallNumberOf(data: CanteenData, dish: CanteenDish): number {
  return stallOf(data, dish)?.number ?? Number.MAX_SAFE_INTEGER;
}

function compareName(a: CanteenDish, b: CanteenDish, locale: Locale): number {
  return a.name[locale].localeCompare(b.name[locale], locale) || a.slug.current.localeCompare(b.slug.current);
}

/**
 * Returns a sorted copy. `price` is cheapest
 * first, `name` is A to Z, `stall` is by stall number, which follows the way
 * you walk through the hall. Every sort breaks
 * ties the same way, by price then name then slug, so the order is stable.
 */
export function sortDishes(
  data: CanteenData,
  dishes: readonly CanteenDish[],
  filters: Pick<CanteenFilters, "sort" | "variants">,
  options: ApplyOptions = {},
): CanteenDish[] {
  const locale = options.locale ?? "en";
  const price = (dish: CanteenDish) => effectivePrice(dish, filters.variants);
  const tie = (a: CanteenDish, b: CanteenDish) => price(a) - price(b) || compareName(a, b, locale);

  return [...dishes].sort((a, b) => {
    switch (filters.sort) {
      case "price":
        return price(a) - price(b) || walkRankOf(data, a) - walkRankOf(data, b) || compareName(a, b, locale);
      case "name":
        return compareName(a, b, locale);
      case "stall":
        return stallNumberOf(data, a) - stallNumberOf(data, b) || tie(a, b);
    }
  });
}

/**
 * The first `count` dishes, cheapest first, with at most one per stall. The
 * order uses only the price, the stall number and the slug, never a name, so
 * every language picks the same dishes.
 */
export function pickStarters(
  data: CanteenData,
  dishes: readonly CanteenDish[],
  count: number,
  filters: Pick<CanteenFilters, "variants">,
): CanteenDish[] {
  const price = (dish: CanteenDish) => effectivePrice(dish, filters.variants);
  const ordered = [...dishes].sort(
    (a, b) =>
      price(a) - price(b) ||
      stallNumberOf(data, a) - stallNumberOf(data, b) ||
      a.slug.current.localeCompare(b.slug.current) ||
      a._id.localeCompare(b._id),
  );
  const seen = new Set<string>();
  const starters: CanteenDish[] = [];
  for (const dish of ordered) {
    if (seen.has(dish.stall._ref)) continue;
    seen.add(dish.stall._ref);
    starters.push(dish);
    if (starters.length >= count) break;
  }
  return starters;
}

/**
 * The dishes that pass every filter, sorted as the filters ask. `now` is
 * only used by the `open` filter and is passed in so the result is
 * reproducible.
 */
export function applyFilters(
  data: CanteenData,
  filters: CanteenFilters,
  now: Date,
  options: ApplyOptions = {},
): CanteenDish[] {
  const matching = data.dishes.filter((dish) => matchesFilters(data, dish, filters, now));
  return sortDishes(data, matching, filters, options);
}

/** How many distinct stalls the dishes come from. */
export function countStalls(data: CanteenData, dishes: readonly CanteenDish[]): number {
  return new Set(dishes.map((dish) => dish.stall._ref)).size;
}

/* ------------------------------------------------------------------ *
 * Grouping
 * ------------------------------------------------------------------ */

/** One group of results. For `none` there is a single group with `key` "all". */
export interface DishGroup {
  key: string;
  /** Set when grouped by stall. */
  stall?: CanteenStall;
  /** Set when grouped by canonical dish and the group has one. Dishes with none share the group keyed "none". */
  canonicalId?: string;
  dishes: CanteenDish[];
}

/**
 * Splits an already sorted result list into groups, keeping the order inside
 * each group. Stalls come out in walking order; canonical groups come out
 * with the one holding the most dishes first and unmapped dishes last, so a
 * price comparison ("Kra pao: 40 at stall 3, 45 at stall 7") leads.
 */
export function groupDishes(data: CanteenData, dishes: readonly CanteenDish[], group: GroupKey): DishGroup[] {
  if (group === "none") return dishes.length > 0 ? [{ key: "all", dishes: [...dishes] }] : [];

  const buckets = new Map<string, DishGroup>();
  for (const dish of dishes) {
    const key = group === "stall" ? dish.stall._ref : (dish.canonical?._ref ?? "none");
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket =
        group === "stall"
          ? { key, stall: stallOf(data, dish), dishes: [] }
          : { key, ...(dish.canonical ? { canonicalId: dish.canonical._ref } : {}), dishes: [] };
      buckets.set(key, bucket);
    }
    bucket.dishes.push(dish);
  }

  const groups = [...buckets.values()];
  if (group === "stall") {
    const { walkRank } = indexCanteen(data);
    return groups.sort((a, b) => (walkRank.get(a.key) ?? 0) - (walkRank.get(b.key) ?? 0));
  }
  return groups.sort((a, b) => {
    if (a.key === "none") return 1;
    if (b.key === "none") return -1;
    return b.dishes.length - a.dishes.length || a.key.localeCompare(b.key);
  });
}

/* ------------------------------------------------------------------ *
 * Facet counts
 * ------------------------------------------------------------------ */

/**
 * How many dishes each option would give, for every facet.
 *
 * Each count is computed against the OTHER active filters, so it answers
 * "if I choose this, how many dishes do I get?" and the layout can show
 * "Noodles (14)" and disable an option that would give 0 without hiding it.
 * For a facet that narrows (diet, avoid) the count includes the options
 * already chosen in that facet; for one that widens (type) or replaces
 * (stall, budget) it counts that option alone.
 */
export interface FacetCounts {
  /** Dishes passing every active filter. */
  total: number;
  /** Distinct stalls among them. */
  stalls: number;
  /** Keyed by budget chip in baht ("40", "50", ...) plus "any". */
  max: Record<string, number>;
  diet: Record<DietKey, number>;
  type: Record<DishType, number>;
  avoid: Record<AvoidKey, number>;
  /** Keyed "0", "1", "2" and "any". */
  feel: Record<FeelKey, number>;
  /** Keyed by stall slug. */
  stall: Record<string, number>;
  /** Dishes at stalls not known to be closed, with the other filters applied. */
  open: number;
}

/** Counts per option for every facet. See `FacetCounts`. */
export function facetCounts(data: CanteenData, filters: CanteenFilters, now: Date): FacetCounts {
  const count = (changed: CanteenFilters) =>
    data.dishes.reduce((n, dish) => n + (matchesFilters(data, dish, changed, now) ? 1 : 0), 0);
  const withChange = (change: Partial<CanteenFilters>): CanteenFilters => ({ ...filters, ...change });

  const matching = data.dishes.filter((dish) => matchesFilters(data, dish, filters, now));

  const max: Record<string, number> = { any: count(withChange({ max: undefined })) };
  for (const step of BUDGET_STEPS) max[String(step)] = count(withChange({ max: step }));

  const diet = {} as Record<DietKey, number>;
  for (const key of DIET_KEYS) diet[key] = count(withChange({ diet: [...new Set([...filters.diet, key])] }));

  const type = {} as Record<DishType, number>;
  for (const key of DISH_TYPES) type[key] = count(withChange({ type: [key] }));

  const avoid = {} as Record<AvoidKey, number>;
  for (const key of AVOID_KEYS) avoid[key] = count(withChange({ avoid: [...new Set([...filters.avoid, key])] }));


  const feel = {} as Record<FeelKey, number>;
  for (const key of FEEL_KEYS) {
    const pair = FEEL_PAIRS.find((candidate) => candidate.includes(key));
    const kept = filters.feel.filter((existing) => !pair?.includes(existing));
    feel[key] = count(withChange({ feel: [...kept, key] }));
  }

  const stall: Record<string, number> = {};
  for (const candidate of data.stalls) {
    stall[candidate.slug.current] = count(withChange({ stall: candidate.slug.current }));
  }

  return {
    total: matching.length,
    stalls: countStalls(data, matching),
    max,
    diet,
    type,
    avoid,
    feel,
    stall,
    open: count(withChange({ open: true })),
  };
}

/* ------------------------------------------------------------------ *
 * Relax suggestions
 * ------------------------------------------------------------------ */

/**
 * One way to get more results, as data the UI turns into words and a link.
 *
 * `kind` "drop" removes a filter (`value` is the option removed, for example
 * "cold", or null when the whole filter had a single value); "raise" lifts the
 * budget to `value` baht. `filters` is the resulting filter state, ready to
 * pass to `withFilters`, and `count` is how many dishes it gives.
 */
export interface RelaxSuggestion {
  kind: "drop" | "raise";
  param: FilterParam | "variants";
  value: string | number | null;
  count: number;
  filters: CanteenFilters;
}

/**
 * For each active filter, how many dishes there would be without it (or, for
 * the budget, with the next budget step up), keeping the `limit` best. Only
 * suggestions that give more dishes than now are offered, so a zero result
 * is never a dead end while anything can be relaxed. The randomiser reuses
 * this to know what it may relax.
 */
export function relaxSuggestions(
  data: CanteenData,
  filters: CanteenFilters,
  now: Date,
  limit = 2,
): RelaxSuggestion[] {
  const current = data.dishes.reduce((n, dish) => n + (matchesFilters(data, dish, filters, now) ? 1 : 0), 0);
  const candidates: Array<Omit<RelaxSuggestion, "count">> = [];

  if (filters.max !== undefined) {
    const next = BUDGET_STEPS.find((step) => step > filters.max!);
    candidates.push(
      next !== undefined
        ? { kind: "raise", param: "max", value: next, filters: { ...filters, max: next } }
        : { kind: "drop", param: "max", value: null, filters: { ...filters, max: undefined } },
    );
    if (filters.variants) {
      candidates.push({ kind: "drop", param: "variants", value: null, filters: { ...filters, variants: false } });
    }
  }
  for (const value of filters.diet) {
    candidates.push({ kind: "drop", param: "diet", value, filters: { ...filters, diet: filters.diet.filter((v) => v !== value) } });
  }
  for (const value of filters.type) {
    candidates.push({ kind: "drop", param: "type", value, filters: { ...filters, type: filters.type.filter((v) => v !== value) } });
  }
  for (const value of filters.avoid) {
    candidates.push({ kind: "drop", param: "avoid", value, filters: { ...filters, avoid: filters.avoid.filter((v) => v !== value) } });
  }
  for (const value of filters.feel) {
    candidates.push({ kind: "drop", param: "feel", value, filters: { ...filters, feel: filters.feel.filter((v) => v !== value) } });
  }
  if (filters.stall !== undefined) {
    candidates.push({ kind: "drop", param: "stall", value: filters.stall, filters: { ...filters, stall: undefined } });
  }
  if (filters.open) {
    candidates.push({ kind: "drop", param: "open", value: null, filters: { ...filters, open: false } });
  }

  return candidates
    .map((candidate, order) => ({
      suggestion: {
        ...candidate,
        count: data.dishes.reduce((n, dish) => n + (matchesFilters(data, dish, candidate.filters, now) ? 1 : 0), 0),
      },
      order,
    }))
    .filter(({ suggestion }) => suggestion.count > current)
    .sort((a, b) => b.suggestion.count - a.suggestion.count || a.order - b.order)
    .slice(0, Math.max(0, limit))
    .map(({ suggestion }) => suggestion);
}
