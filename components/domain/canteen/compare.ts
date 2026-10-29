/**
 * One canonical dish across stalls, grouped by stall. Pure.
 */

import { stallOf } from "@/lib/canteen/derive";
import type { CanteenData, CanteenDish, CanteenStall } from "@/lib/content/types";

export interface StallWithDishes {
  stall: CanteenStall;
  /** This stall's dishes of the canonical dish, cheapest first. */
  dishes: CanteenDish[];
  /** The lowest base price among them. */
  from: number;
}

/** The stalls that make any of `dishes`, cheapest first then by stall number, leaving out `excludeStallId`. */
export function stallsWithDishes(data: CanteenData, dishes: readonly CanteenDish[], excludeStallId?: string): StallWithDishes[] {
  const byStall = new Map<string, StallWithDishes>();
  for (const dish of dishes) {
    if (dish.stallId === excludeStallId) continue;
    const stall = stallOf(data, dish);
    if (!stall) continue;
    const entry = byStall.get(stall._id) ?? { stall, dishes: [], from: dish.price };
    entry.dishes.push(dish);
    entry.from = Math.min(entry.from, dish.price);
    byStall.set(stall._id, entry);
  }
  const out = [...byStall.values()];
  for (const entry of out) entry.dishes.sort((a, b) => a.price - b.price || a.slug.current.localeCompare(b.slug.current));
  return out.sort((a, b) => a.from - b.from || a.stall.number - b.stall.number);
}
