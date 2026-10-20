/**
 * Meal for my budget: combinations of one main plus an optional drink and an
 * optional dessert whose total is at or under the budget.
 *
 * Pure. With a few hundred dishes the enumeration is a few thousand
 * combinations at most, fine on the server and the client.
 */

import type { CanteenData, CanteenDish, CanteenStall } from "@/lib/sanity/types";

import { effectivePrice, indexCanteen, stallOf } from "./derive";
import { matchesFilters } from "./filter";
import type { CanteenFilters } from "./params";

export interface ComboOptions {
  /** Drink and dessert must come from the same stall as the main. */
  sameStallOnly?: boolean;
  /** For the `open` filter. */
  now: Date;
  /** How many combos to return, best first. Default 30. */
  limit?: number;
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
 * is replaced by the combo total, and `type` and `feel` are ignored, since
 * "noodles" or "hot" describe the main and would otherwise rule out every
 * drink and dessert. Diet, avoid, spice, stall and open still apply to all
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

  const mainFilters: CanteenFilters = { ...filters, max: undefined };
  const sideFilters: CanteenFilters = { ...mainFilters, type: [], feel: [] };

  const byPrice = (a: CanteenDish, b: CanteenDish) =>
    price(a) - price(b) || a.slug.current.localeCompare(b.slug.current);

  const pickCourse = (course: CanteenDish["course"], against: CanteenFilters) =>
    data.dishes
      .filter((dish) => dish.course === course && price(dish) <= budget && matchesFilters(data, dish, against, options.now))
      .sort(byPrice);

  const mains = pickCourse("main", mainFilters);
  const drinks = pickCourse("drink", sideFilters);
  const desserts = pickCourse("dessert", sideFilters);

  const combos: MealCombo[] = [];

  for (const main of mains) {
    const left = budget - price(main);
    const drinkOptions: Array<CanteenDish | undefined> = [undefined];
    const dessertOptions: Array<CanteenDish | undefined> = [undefined];
    for (const drink of drinks) {
      if (price(drink) > left) break;
      if (!options.sameStallOnly || drink.stall._ref === main.stall._ref) drinkOptions.push(drink);
    }
    for (const dessert of desserts) {
      if (price(dessert) > left) break;
      if (!options.sameStallOnly || dessert.stall._ref === main.stall._ref) dessertOptions.push(dessert);
    }

    for (const drink of drinkOptions) {
      for (const dessert of dessertOptions) {
        const total = price(main) + (drink ? price(drink) : 0) + (dessert ? price(dessert) : 0);
        if (total > budget) continue;

        const items = [main, drink, dessert]
          .filter((dish): dish is CanteenDish => dish !== undefined)
          .sort((a, b) => (walkRank.get(a.stall._ref) ?? 0) - (walkRank.get(b.stall._ref) ?? 0));
        const stalls: CanteenStall[] = [];
        for (const item of items) {
          const stall = stallOf(data, item);
          if (stall && !stalls.includes(stall)) stalls.push(stall);
        }
        combos.push({ main, ...(drink ? { drink } : {}), ...(dessert ? { dessert } : {}), items, total, change: budget - total, stalls });
      }
    }
  }

  const key = (combo: MealCombo) => combo.items.map((dish) => dish.slug.current).join("|");
  combos.sort(
    (a, b) =>
      a.change - b.change ||
      a.stalls.length - b.stalls.length ||
      b.items.length - a.items.length ||
      key(a).localeCompare(key(b)),
  );

  return combos.slice(0, Math.max(0, options.limit ?? 30));
}
