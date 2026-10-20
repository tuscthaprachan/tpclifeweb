/**
 * Decide for me: a seeded, reproducible random pick.
 *
 * The same seed with the same data, filters and options always gives the
 * same dish, on the server and on the client, so a pick can be shared as a
 * URL and reopened. Nothing here reads the clock or `Math.random` except
 * `newSeed`, which exists to make a fresh seed for "Another one".
 *
 * Pure, apart from `newSeed`.
 */

import type { CanteenData, CanteenDish, CanteenStall } from "@/lib/sanity/types";

import { effectivePrice, indexCanteen, stallOf } from "./derive";
import { isMealDish, matchesFilters } from "./filter";
import { activeFilterParams, type CanteenFilters, type FilterParam } from "./params";

/* ------------------------------------------------------------------ *
 * Seeded randomness
 * ------------------------------------------------------------------ */

/** A function returning a float in [0, 1), like `Math.random`. */
export type Rng = () => number;

/**
 * Turns any string into a 32-bit unsigned seed (the xmur3 hash). Different
 * strings give unrelated numbers; the same string always gives the same one.
 */
export function hashSeed(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

/** The mulberry32 generator: a small, fast, well mixed PRNG from a 32-bit seed. */
export function mulberry32(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A generator for a string seed. The same string gives the same sequence. */
export function createRng(seed: string): Rng {
  return mulberry32(hashSeed(seed));
}

/** Letters and digits without look-alikes (no 0, o, 1, l, i), so a seed is easy to read aloud. */
const SEED_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/**
 * A fresh short seed for the URL, for example "k7m2qx". This is the one
 * impure function here. Pass `rng` to make it reproducible in tests.
 */
export function newSeed(rng: Rng = Math.random): string {
  let seed = "";
  for (let i = 0; i < 6; i += 1) seed += SEED_ALPHABET[Math.floor(rng() * SEED_ALPHABET.length)];
  return seed;
}

/** A shuffled copy (Fisher-Yates) using `rng`. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

/* ------------------------------------------------------------------ *
 * Picking
 * ------------------------------------------------------------------ */

/**
 * How to weight the pick.
 * - `fair`: uniform over stalls, then uniform over that stall's dishes, so a
 *   stall with 40 dishes does not dominate one with 4.
 * - `new`: down-weights anything in the device history.
 * - `cheap`: weights by inverse price.
 * - `usual`: weights toward favourites and things eaten before.
 */
export type Bias = "fair" | "new" | "cheap" | "usual";

export const BIASES: readonly Bias[] = ["fair", "new", "cheap", "usual"];

/** One thing eaten, from the device history. */
export interface HistoryEntry {
  slug: string;
  /** ISO timestamp. */
  at: string;
}

/** Which dimensions to keep from the previous pick when rerolling. */
export interface PickLock {
  /** Slug of the previous dish the locks are relative to. It is excluded from the new pick. */
  of: string;
  /** Keep the same stall, change the dish. */
  stall?: boolean;
  /** Keep the same type (for example noodles), change the stall. */
  type?: boolean;
  /** Keep the same canonical dish, change the stall. */
  canonical?: boolean;
}

export type LockKey = "stall" | "type" | "canonical";

export interface PickOptions {
  /** Same seed, same pick. Required. */
  seed: string;
  /** Defaults to `fair`. */
  bias?: Bias;
  lock?: PickLock;
  /** Dish slugs vetoed this session ("Not this"). */
  not?: readonly string[];
  /** Device history, used by repeat avoidance and the `new` and `usual` biases. */
  history?: readonly HistoryEntry[];
  /** Favourite dish slugs, used by the `usual` bias. */
  favourites?: readonly string[];
  /** Dish slugs the student never wants suggested. A hard rule, never relaxed. */
  dislikes?: readonly string[];
  /** Days within which an eaten dish is not suggested again. Default 2. 0 turns it off. */
  avoidRepeatDays?: number;
  now: Date;
}

/** What had to be given up to find a dish, in the order it is given up. */
export type Relaxation = "repeat" | "lock" | "veto";

export interface PickReason {
  /** `noMatches` means the filters (and dislikes) leave no dish at all. */
  code: "matched" | "noMatches";
  bias: Bias;
  /** The locks that were in force for this pick. */
  locks: LockKey[];
  /** The filters that were active, for the "why it matched" line. */
  filters: FilterParam[];
}

export interface PickResult {
  dish: CanteenDish | null;
  stall: CanteenStall | null;
  reason: PickReason;
  /**
   * Null when nothing was given up. Otherwise what was relaxed, in order.
   * Repeat avoidance goes first, then locks, then vetoes. The student's own
   * filters and dislikes are never touched.
   */
  relaxed: Relaxation[] | null;
  /** How many dishes the pick was drawn from. */
  poolSize: number;
}

const DAY_MS = 86_400_000;

/** Weighted draw: one rng step. */
function weightedIndex(weights: readonly number[], rng: Rng): number {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let target = rng() * total;
  for (let i = 0; i < weights.length; i += 1) {
    target -= weights[i]!;
    if (target < 0) return i;
  }
  return weights.length - 1;
}

/**
 * Chooses one dish. See `PickOptions` for the knobs. Only main courses are
 * considered unless the filters name dish types (see `isMealDish`).
 *
 * If locks, vetoes or repeat avoidance leave nothing, they are relaxed
 * (repeat avoidance first) and the result says so in `relaxed`. If the
 * filters themselves leave nothing, `dish` is null and the reason is
 * `noMatches`; use `relaxSuggestions` to offer a way out.
 */
export function pick(
  data: CanteenData,
  filters: CanteenFilters,
  options: PickOptions,
): PickResult {
  const bias = options.bias ?? "fair";
  const index = indexCanteen(data);
  const dislikes = new Set(options.dislikes ?? []);
  const vetoed = new Set(options.not ?? []);
  const history = options.history ?? [];

  // Candidates in a fixed order, so the result never depends on the order the CMS returned them.
  const candidates = data.dishes
    .filter((dish) => !dislikes.has(dish.slug.current) && isMealDish(dish, filters) && matchesFilters(data, dish, filters, options.now))
    .sort(
      (a, b) =>
        (index.walkRank.get(a.stall._ref) ?? 0) - (index.walkRank.get(b.stall._ref) ?? 0) ||
        a.slug.current.localeCompare(b.slug.current),
    );

  const previous = options.lock ? index.dishBySlug.get(options.lock.of) : undefined;
  const locks: LockKey[] = [];
  if (previous && options.lock) {
    if (options.lock.stall) locks.push("stall");
    if (options.lock.type) locks.push("type");
    if (options.lock.canonical && previous.canonical) locks.push("canonical");
  }

  const days = options.avoidRepeatDays ?? 2;
  const recentSlugs = new Set<string>();
  if (days > 0) {
    const since = options.now.getTime() - days * DAY_MS;
    for (const entry of history) {
      const at = Date.parse(entry.at);
      if (Number.isFinite(at) && at >= since) recentSlugs.add(entry.slug);
    }
  }

  const reason = (code: PickReason["code"]): PickReason => ({
    code,
    bias,
    locks,
    filters: activeFilterParams(filters),
  });

  const stages: Relaxation[][] = [[], ["repeat"], ["repeat", "lock"], ["repeat", "lock", "veto"]];
  for (const relaxing of stages) {
    const pool = candidates.filter((dish) => {
      if (!relaxing.includes("repeat") && recentSlugs.has(dish.slug.current)) return false;
      if (!relaxing.includes("veto") && vetoed.has(dish.slug.current)) return false;
      if (!relaxing.includes("lock") && previous && locks.length > 0) {
        if (dish.slug.current === previous.slug.current) return false;
        if (locks.includes("stall") && dish.stall._ref !== previous.stall._ref) return false;
        if (locks.includes("type") && dish.type !== previous.type) return false;
        if (locks.includes("canonical") && dish.canonical?._ref !== previous.canonical?._ref) return false;
      }
      return true;
    });
    if (pool.length === 0) continue;

    const chosen = choose(pool, bias, createRng(options.seed), {
      history,
      favourites: new Set(options.favourites ?? []),
      includeVariants: filters.variants,
    });
    // Report only what was actually in force and given up.
    const givenUp = relaxing.filter(
      (item) =>
        (item === "repeat" && recentSlugs.size > 0) ||
        (item === "lock" && previous !== undefined && locks.length > 0) ||
        (item === "veto" && vetoed.size > 0),
    );
    return {
      dish: chosen,
      stall: stallOf(data, chosen) ?? null,
      reason: reason("matched"),
      relaxed: givenUp.length > 0 ? givenUp : null,
      poolSize: pool.length,
    };
  }

  return { dish: null, stall: null, reason: reason("noMatches"), relaxed: null, poolSize: 0 };
}

function choose(
  pool: readonly CanteenDish[],
  bias: Bias,
  rng: Rng,
  context: { history: readonly HistoryEntry[]; favourites: ReadonlySet<string>; includeVariants: boolean },
): CanteenDish {
  if (bias === "fair") {
    const byStall = new Map<string, CanteenDish[]>();
    for (const dish of pool) {
      const list = byStall.get(dish.stall._ref);
      if (list) list.push(dish);
      else byStall.set(dish.stall._ref, [dish]);
    }
    const stalls = [...byStall.values()];
    const group = stalls[Math.floor(rng() * stalls.length)]!;
    return group[Math.floor(rng() * group.length)]!;
  }

  const eaten = new Map<string, number>();
  for (const entry of context.history) eaten.set(entry.slug, (eaten.get(entry.slug) ?? 0) + 1);

  const weights = pool.map((dish) => {
    const times = eaten.get(dish.slug.current) ?? 0;
    switch (bias) {
      case "new":
        return 1 / (1 + times);
      case "cheap":
        return 1 / Math.max(1, effectivePrice(dish, context.includeVariants));
      case "usual":
        return 1 + (context.favourites.has(dish.slug.current) ? 4 : 0) + Math.min(times, 3);
    }
  });
  return pool[weightedIndex(weights, rng)]!;
}
