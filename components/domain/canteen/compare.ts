/**
 * Price comparison helpers for one canonical dish across stalls. Pure.
 */

import type { CanteenDish } from "@/lib/sanity/types";

/**
 * The slugs to mark "Cheapest": every dish at the lowest price, but only when
 * some other dish costs more. If every stall charges the same there is no
 * cheapest to point at, so nothing is marked.
 */
export function cheapestSlugs(dishes: readonly CanteenDish[]): Set<string> {
  if (dishes.length < 2) return new Set();
  const lowest = Math.min(...dishes.map((dish) => dish.price));
  if (!dishes.some((dish) => dish.price > lowest)) return new Set();
  return new Set(dishes.filter((dish) => dish.price === lowest).map((dish) => dish.slug.current));
}
