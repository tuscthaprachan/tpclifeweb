/**
 * The part of the canteen dataset one detail page needs, for the pages that now send their data to the browser.
 * Stalls and settings stay whole (the map, the stall names and the filters' stall check use them); the dishes and
 * canonical dishes are cut to the ones the page can show. Plain module: safe from server and client.
 */

import type { CanonicalDish, CanteenData, CanteenDish } from "@/lib/content/types";

function withDishes(data: CanteenData, dishes: CanteenDish[]): CanteenData {
  const canonicalIds = new Set(dishes.flatMap((dish) => (dish.canonicalId ? [dish.canonicalId] : [])));
  return {
    settings: data.settings,
    stalls: data.stalls,
    dishes,
    canonicals: data.canonicals.filter((canonical: CanonicalDish) => canonicalIds.has(canonical._id)),
  };
}

/** One stall's page: its dishes. */
export function dataForStall(data: CanteenData, stallId: string): CanteenData {
  return withDishes(data, data.dishes.filter((dish) => dish.stallId === stallId));
}

/** One dish's page: the dish and every dish of its canonical dish. */
export function dataForDish(data: CanteenData, dish: CanteenDish): CanteenData {
  return withDishes(
    data,
    data.dishes.filter((candidate) => candidate._id === dish._id || (dish.canonicalId !== undefined && candidate.canonicalId === dish.canonicalId)),
  );
}

/** One canonical dish's page, or the list of them all: the dishes that have a canonical dish. */
export function dataForCanonicals(data: CanteenData, canonicalId?: string): CanteenData {
  return {
    settings: data.settings,
    stalls: data.stalls,
    dishes: data.dishes.filter((dish) => (canonicalId === undefined ? dish.canonicalId !== undefined : dish.canonicalId === canonicalId)),
    canonicals: canonicalId === undefined ? data.canonicals : data.canonicals.filter((canonical) => canonical._id === canonicalId),
  };
}
