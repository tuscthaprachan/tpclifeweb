/**
 * Which diet tags a dish wears, and in what words. Pure.
 *
 * A halal stall's whole menu is halal, so every dish there carries the halal
 * tag. `canAsk` dishes are shown as "ask for veggie", never as vegetarian.
 * There is no "no pork" tag: the "no pork" filter still works.
 */

import { vegetarianAvailability } from "@/lib/canteen/derive";
import type { DietKey } from "@/lib/canteen/params";
import type { CanteenDish, CanteenStall } from "@/lib/sanity/types";
import type { DIET_TAG_LABEL } from "./labels";

/** The wording key of one diet tag. */
export type DietTagKey = keyof typeof DIET_TAG_LABEL;

/** One tag on a dish. `diet` picks the icon, `key` picks the words. */
export interface DishDietTag {
  key: DietTagKey;
  diet: DietKey;
  /** True for the "ask for it" tags. They never claim the dish is already made that way. */
  canAsk: boolean;
  /** Halal only: the day the stall was asked. */
  checkedOn?: string;
}

/**
 * The tags to show for a dish, in a fixed order: halal, then the
 * vegetarian family. When a dish is vegan the vegetarian tag is left out,
 * because vegan already says it. Stalls with no halal answer give no tag.
 */
export function dishDietTags(dish: CanteenDish, stall: CanteenStall | undefined): DishDietTag[] {
  const tags: DishDietTag[] = [];

  if (stall?.halal === "certified") {
    tags.push({ key: "halalCertified", diet: "certified", canAsk: false, checkedOn: stall.halalCheckedOn });
  } else if (stall?.halal === "stallDeclared") {
    tags.push({ key: "halalStall", diet: "halal", canAsk: false, checkedOn: stall.halalCheckedOn });
  }

  const vegetarian = stall ? vegetarianAvailability(dish, stall) : dish.vegetarian;
  if (dish.vegan !== "yes") {
    if (vegetarian === "yes") tags.push({ key: "vegetarianYes", diet: "vegetarian", canAsk: false });
    else if (vegetarian === "canAsk") tags.push({ key: "vegetarianAsk", diet: "vegetarian", canAsk: true });
  }

  if (dish.vegan === "yes") tags.push({ key: "veganYes", diet: "vegan", canAsk: false });
  else if (dish.vegan === "canAsk") tags.push({ key: "veganAsk", diet: "vegan", canAsk: true });

  if (dish.jay === "yes") tags.push({ key: "jayYes", diet: "jay", canAsk: false });
  else if (dish.jay === "canAsk") tags.push({ key: "jayAsk", diet: "jay", canAsk: true });

  return tags;
}

/** The halal tag for a stall as a whole (not one dish), or null when the stall gave no halal answer. */
export function stallHalalTag(stall: CanteenStall): DishDietTag | null {
  if (stall.halal === "certified") return { key: "halalCertified", diet: "certified", canAsk: false, checkedOn: stall.halalCheckedOn };
  if (stall.halal === "stallDeclared") return { key: "halalWholeStall", diet: "halal", canAsk: false, checkedOn: stall.halalCheckedOn };
  return null;
}
