/**
 * Which diet tags a dish wears. Pure.
 *
 * Two tags only. "Halal" goes on everything a halal stall sells.
 * "Vegetarian" goes on vegetarian mains only: drinks, desserts, toppings and
 * add-ons do not need it, so they never carry it.
 */

import { isVegetarian } from "@/lib/canteen/derive";
import type { DietKey } from "@/lib/canteen/params";
import type { CanteenDish, CanteenStall } from "@/lib/sanity/types";
import type { DIET_TAG_LABEL } from "./labels";

/** The wording key of one diet tag. */
export type DietTagKey = keyof typeof DIET_TAG_LABEL;

/** One tag on a dish. `diet` picks the icon, `key` picks the words. */
export interface DishDietTag {
  key: DietTagKey;
  diet: DietKey;
}

/** The tags to show for a dish: halal, then vegetarian. */
export function dishDietTags(dish: CanteenDish, stall: CanteenStall | undefined): DishDietTag[] {
  const tags: DishDietTag[] = [];
  if (stall?.halal) tags.push({ key: "halal", diet: "halal" });
  if (dish.course === "main" && stall && isVegetarian(dish, stall)) tags.push({ key: "vegetarian", diet: "vegetarian" });
  return tags;
}

/** The halal tag for a stall as a whole (not one dish), or null for a stall that is not halal. */
export function stallHalalTag(stall: CanteenStall): DishDietTag | null {
  return stall.halal ? { key: "halalWholeStall", diet: "halal" } : null;
}
