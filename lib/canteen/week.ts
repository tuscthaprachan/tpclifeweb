/**
 * Plan my week: one lunch per day on campus, with no stall twice, no
 * canonical dish twice, and the total inside a weekly budget.
 *
 * A small depth-first search with a seeded shuffle. The same seed gives the
 * same plan; a different seed gives a different valid plan. Pure.
 */

import type { CanteenData, CanteenDish, CanteenStall } from "@/lib/content/types";

import { effectivePrice, indexCanteen, stallOf } from "./derive";
import { isMealDish, matchesFilters } from "./filter";
import type { CanteenFilters } from "./params";
import { createRng, shuffle } from "./random";

export interface WeekOptions {
  /** Total budget for all the days, in baht. */
  budget: number;
  /** The days on campus, as weekdays 0 (Sunday) to 6 (Saturday). */
  days: readonly number[];
  seed: string;
  /** Pinned days: weekday to dish slug. A locked day keeps its dish; the rest are planned around it. */
  locks?: Readonly<Record<number, string>>;
  now: Date;
}

/** One planned lunch. */
export interface WeekDayPlan {
  weekday: number;
  dish: CanteenDish;
  stall: CanteenStall;
  /** Baht, under the same price rule as the budget filter. */
  price: number;
  locked: boolean;
}

/** Why no plan could be made. */
export type WeekFailure =
  | "noDays"
  | "badDays"
  | "unknownLock"
  | "lockConflict"
  | "notEnoughStalls"
  | "budgetTooLow"
  | "noPlan";

export type WeekResult =
  | {
      ok: true;
      /** Monday first. */
      days: WeekDayPlan[];
      total: number;
      /** Budget divided by the number of days. */
      allowance: number;
      /** Baht left from the weekly budget. */
      change: number;
    }
  | { ok: false; reason: WeekFailure };

/** Search steps before giving up, so a hard request cannot hang a page. */
const NODE_LIMIT = 50_000;

/** Weekdays in the order a student reads a week: Monday to Sunday. */
const MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0];

/** Interleaves stalls round robin, so early candidates spread across stalls rather than clustering in a big one. */
function fairOrder(dishes: readonly CanteenDish[], rng: () => number): CanteenDish[] {
  const byStall = new Map<string, CanteenDish[]>();
  for (const dish of dishes) {
    const list = byStall.get(dish.stallId);
    if (list) list.push(dish);
    else byStall.set(dish.stallId, [dish]);
  }
  const queues = shuffle([...byStall.values()].map((list) => shuffle(list, rng)), rng);
  const ordered: CanteenDish[] = [];
  for (let round = 0; ordered.length < dishes.length; round += 1) {
    for (const queue of queues) {
      const dish = queue[round];
      if (dish) ordered.push(dish);
    }
  }
  return ordered;
}

/**
 * Plans one dish per day, main courses only unless the filters name dish
 * types (see `isMealDish`). Every dish passes the filters (a locked dish is
 * kept even if it no longer does), no two days share a stall or a canonical
 * dish, and the total is at or under the budget. Returns the reason when it
 * cannot, so the page can say what to change. To reroll one day, call again
 * with a new seed and every other day in `locks`.
 */
export function planWeek(data: CanteenData, filters: CanteenFilters, options: WeekOptions): WeekResult {
  const uniqueDays = [...new Set(options.days)];
  if (uniqueDays.length === 0) return { ok: false, reason: "noDays" };
  if (uniqueDays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) {
    return { ok: false, reason: "badDays" };
  }
  const days = MONDAY_FIRST.filter((day) => uniqueDays.includes(day));
  const index = indexCanteen(data);
  const price = (dish: CanteenDish) => effectivePrice(dish, filters.variants);
  const rng = createRng(options.seed);

  // Locked days first.
  const chosen = new Map<number, CanteenDish>();
  for (const day of days) {
    const slug = options.locks?.[day];
    if (slug === undefined) continue;
    const dish = index.dishBySlug.get(slug);
    if (!dish) return { ok: false, reason: "unknownLock" };
    chosen.set(day, dish);
  }
  const usedStalls = new Set<string>();
  const usedCanonicals = new Set<string>();
  let spent = 0;
  for (const dish of chosen.values()) {
    if (usedStalls.has(dish.stallId) || (dish.canonicalId && usedCanonicals.has(dish.canonicalId))) {
      return { ok: false, reason: "lockConflict" };
    }
    usedStalls.add(dish.stallId);
    if (dish.canonicalId) usedCanonicals.add(dish.canonicalId);
    spent += price(dish);
  }
  if (spent > options.budget) return { ok: false, reason: "budgetTooLow" };

  const freeDays = days.filter((day) => !chosen.has(day));
  const pool = data.dishes
    .filter((dish) => isMealDish(dish, filters) && matchesFilters(data, dish, filters, options.now) && price(dish) <= options.budget)
    .sort((a, b) => a.slug.current.localeCompare(b.slug.current));

  // Cheapest dish per stall bounds what the remaining days must cost.
  const cheapestByStall = new Map<string, number>();
  for (const dish of pool) {
    const best = cheapestByStall.get(dish.stallId);
    if (best === undefined || price(dish) < best) cheapestByStall.set(dish.stallId, price(dish));
  }
  const freeStallPrices = [...cheapestByStall.entries()]
    .filter(([stallId]) => !usedStalls.has(stallId))
    .map(([, cheapest]) => cheapest)
    .sort((a, b) => a - b);

  if (freeStallPrices.length < freeDays.length) return { ok: false, reason: "notEnoughStalls" };
  const floor = freeStallPrices.slice(0, freeDays.length).reduce((sum, value) => sum + value, 0);
  if (spent + floor > options.budget) return { ok: false, reason: "budgetTooLow" };

  const sortedStallPrices = [...cheapestByStall.entries()].sort((a, b) => a[1] - b[1]);

  /** Sum of the `count` cheapest prices among stalls still unused once `taking` is used. Infinity if too few stalls remain. */
  const remainingFloor = (count: number, taking: string): number => {
    let sum = 0;
    let found = 0;
    for (const [stallId, cheapest] of sortedStallPrices) {
      if (stallId === taking || usedStalls.has(stallId)) continue;
      sum += cheapest;
      found += 1;
      if (found === count) return sum;
    }
    return Number.POSITIVE_INFINITY;
  };

  const order = fairOrder(pool, rng);
  const assignment = new Map<number, CanteenDish>();
  let nodes = 0;

  const search = (position: number, total: number): boolean => {
    if (position === freeDays.length) return true;
    const remaining = freeDays.length - position - 1;
    for (const dish of order) {
      nodes += 1;
      if (nodes > NODE_LIMIT) return false;
      if (usedStalls.has(dish.stallId)) continue;
      if (dish.canonicalId && usedCanonicals.has(dish.canonicalId)) continue;

      const cost = total + price(dish);
      // The days still to fill each need at least the cheapest stall price left.
      const reserve = remaining === 0 ? 0 : remainingFloor(remaining, dish.stallId);
      if (cost + reserve > options.budget) continue;

      usedStalls.add(dish.stallId);
      if (dish.canonicalId) usedCanonicals.add(dish.canonicalId);
      assignment.set(freeDays[position]!, dish);

      if (search(position + 1, cost)) return true;

      usedStalls.delete(dish.stallId);
      if (dish.canonicalId) usedCanonicals.delete(dish.canonicalId);
      assignment.delete(freeDays[position]!);
      if (nodes > NODE_LIMIT) return false;
    }
    return false;
  };

  if (!search(0, spent)) return { ok: false, reason: "noPlan" };

  const plan: WeekDayPlan[] = days.map((weekday) => {
    const locked = chosen.has(weekday);
    const dish = (locked ? chosen.get(weekday) : assignment.get(weekday))!;
    return { weekday, dish, stall: stallOf(data, dish)!, price: price(dish), locked };
  });
  const total = plan.reduce((sum, day) => sum + day.price, 0);
  return { ok: true, days: plan, total, allowance: options.budget / days.length, change: options.budget - total };
}
