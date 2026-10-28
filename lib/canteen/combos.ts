/**
 * Meal for my budget: combinations of one main plus an optional drink and an
 * optional dessert whose total is at or under the budget.
 *
 * Pure. The real canteen has hundreds of mains and drinks, so the search
 * keeps only the best `limit` combos as it goes and skips any drink or
 * dessert that could not beat the worst of them.
 */

import type { CanteenData, CanteenDish, CanteenStall } from "@/lib/content/types";

import { effectivePrice, indexCanteen, stallOf } from "./derive";
import { matchesFilters } from "./filter";
import { MAX_BUDGET, type CanteenFilters } from "./params";

export interface ComboOptions {
  /** Drink and dessert must come from the same stall as the main. */
  sameStallOnly?: boolean;
  /** For the `open` filter. */
  now: Date;
  /** How many combos to return, best first. Default 30. */
  limit?: number;
  /** The most combos that may share a main, so the list is not one main with a dozen drinks. Default: no limit. */
  perMain?: number;
}

/** One way to spend the budget. */
export interface MealCombo {
  main: CanteenDish;
  drink?: CanteenDish;
  dessert?: CanteenDish;
  /** The dishes in walking order of their stalls. */
  items: CanteenDish[];
  /** Total in baht, using the same price rule as the budget filter. */
  total: number;
  /** Baht left from the budget. */
  change: number;
  /** The stalls to visit, in walking order, each once. */
  stalls: CanteenStall[];
}

/**
 * The combos that fit `budget`, best first. "Best" means the total gets
 * closest to the budget without going over (the least change left), then the
 * fewest stalls to walk to, then a fixed tie-break so the order is stable.
 *
 * The filters apply to the main in full. For the drink and dessert the budget
 * is replaced by the combo total (each dish still honours the per-dish `max`), and `type` and `feel` are ignored, since
 * "noodles" or "hot" describe the main and would otherwise rule out every
 * drink and dessert. Diet, avoid, stall and open still apply to all
 * three, so a no-pork, halal-only filter holds for the whole meal. When
 * `filters.stall` is set, all three come from that stall.
 */
export function mealCombos(
  data: CanteenData,
  filters: CanteenFilters,
  budget: number,
  options: ComboOptions,
): MealCombo[] {
  const { walkRank } = indexCanteen(data);
  const price = (dish: CanteenDish) => effectivePrice(dish, filters.variants);

  const sideFilters: CanteenFilters = { ...filters, type: [], feel: [] };

  const byPrice = (a: CanteenDish, b: CanteenDish) =>
    price(a) - price(b) || a.slug.current.localeCompare(b.slug.current);

  const pickCourse = (course: CanteenDish["course"], against: CanteenFilters) =>
    data.dishes
      .filter((dish) => dish.course === course && price(dish) <= budget && matchesFilters(data, dish, against, options.now))
      .sort(byPrice);

  const mains = pickCourse("main", filters);
  const drinks = pickCourse("drink", sideFilters);
  const desserts = pickCourse("dessert", sideFilters);

  const limit = Math.max(0, options.limit ?? 30);
  if (limit === 0) return [];

  interface Candidate {
    main: CanteenDish;
    drink?: CanteenDish;
    dessert?: CanteenDish;
    items: CanteenDish[];
    change: number;
    stallCount: number;
    key: string;
  }

  const rank = (dish: CanteenDish) => walkRank.get(dish.stallId) ?? 0;
  const candidate = (main: CanteenDish, drink: CanteenDish | undefined, dessert: CanteenDish | undefined, change: number): Candidate => {
    const items = [main, drink, dessert]
      .filter((dish): dish is CanteenDish => dish !== undefined)
      .sort((a, b) => rank(a) - rank(b));
    const stallCount = new Set(items.map((dish) => dish.stallId)).size;
    return { main, drink, dessert, items, change, stallCount, key: items.map((dish) => dish.slug.current).join("|") };
  };
  const compare = (a: Candidate, b: Candidate) =>
    a.change - b.change ||
    a.stallCount - b.stallCount ||
    b.items.length - a.items.length ||
    a.key.localeCompare(b.key);

  const best: Candidate[] = [];
  const worstChange = () => (best.length < limit ? Infinity : best[best.length - 1]!.change);
  const perMain = Math.max(1, options.perMain ?? Number.POSITIVE_INFINITY);
  const consider = (next: Candidate) => {
    const sharing = best.filter((item) => item.main === next.main);
    if (sharing.length >= perMain) {
      const worst = sharing[sharing.length - 1]!;
      if (compare(next, worst) >= 0) return;
      best.splice(best.indexOf(worst), 1);
    } else if (best.length === limit && compare(next, best[best.length - 1]!) >= 0) return;
    let at = best.length;
    while (at > 0 && compare(next, best[at - 1]!) < 0) at -= 1;
    best.splice(at, 0, next);
    if (best.length > limit) best.pop();
  };

  /** Dishes from `sorted` (cheapest first) costing at most `cap`, dearest first, then "none". */
  const affordable = (sorted: CanteenDish[], cap: number, main: CanteenDish): Array<CanteenDish | undefined> => {
    const out: Array<CanteenDish | undefined> = [];
    for (let i = sorted.length - 1; i >= 0; i -= 1) {
      const dish = sorted[i]!;
      if (price(dish) > cap) continue;
      if (!options.sameStallOnly || dish.stallId === main.stallId) out.push(dish);
    }
    out.push(undefined);
    return out;
  };

  for (const main of mains) {
    const left = budget - price(main);
    const dessertOptions = affordable(desserts, left, main);
    const dearestDessert = dessertOptions[0] ? price(dessertOptions[0]) : 0;

    for (const drink of affordable(drinks, left, main)) {
      const afterDrink = left - (drink ? price(drink) : 0);
      // Drinks run dearest first, so once even the dearest dessert cannot close the gap, no cheaper drink can.
      if (Math.max(0, afterDrink - dearestDessert) > worstChange()) break;

      for (const dessert of dessertOptions) {
        const change = afterDrink - (dessert ? price(dessert) : 0);
        if (change < 0) continue;
        if (change > worstChange()) break;
        consider(candidate(main, drink, dessert, change));
      }
    }
  }

  return best.map(({ main, drink, dessert, items, change }) => {
    const stalls: CanteenStall[] = [];
    for (const item of items) {
      const stall = stallOf(data, item);
      if (stall && !stalls.includes(stall)) stalls.push(stall);
    }
    return { main, ...(drink ? { drink } : {}), ...(dessert ? { dessert } : {}), items, total: budget - change, change, stalls };
  });
}

/**
 * Why `budget` buys no meal: the price of the cheapest main that passes the
 * filters, and the smallest raise (in steps of 5 baht, at most 100 more) that
 * makes a meal fit.
 */
export function mealShortfall(
  data: CanteenData,
  filters: CanteenFilters,
  budget: number,
  options: ComboOptions,
): { cheapest?: number; raiseTo?: number } {
  const mains = data.dishes
    .filter((dish) => dish.course === "main" && matchesFilters(data, dish, filters, options.now))
    .map((dish) => effectivePrice(dish, filters.variants));
  const cheapest = mains.length > 0 ? Math.min(...mains) : undefined;
  let raiseTo: number | undefined;
  for (let step = 5; step <= 100 && budget + step <= MAX_BUDGET; step += 5) {
    if (mealCombos(data, filters, budget + step, { ...options, limit: 1 }).length > 0) {
      raiseTo = budget + step;
      break;
    }
  }
  return { ...(cheapest !== undefined ? { cheapest } : {}), ...(raiseTo !== undefined ? { raiseTo } : {}) };
}
