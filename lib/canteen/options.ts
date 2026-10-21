/**
 * Runtime lists of every enum the canteen uses, in the canonical order the
 * UI and the URLs follow. The unions themselves live in
 * `lib/sanity/types.ts`; the Studio option lists live in
 * `sanity/schemas/constants.ts`. `tests/unit/canteen/options.test.ts` fails
 * if the three drift apart.
 *
 * Pure data, safe on the server and the client.
 */

import type {
  Allergen,
  CanteenCuisine,
  CookingStyle,
  DietAvailability,
  DishCourse,
  DishType,
  FloorSide,
  HalalStatus,
  MapShape,
  Protein,
  Temperature,
} from "@/lib/sanity/types";

export const CUISINES: readonly CanteenCuisine[] = [
  "thaiRice",
  "madeToOrder",
  "noodles",
  "isan",
  "chickenRice",
  "curryOverRice",
  "muslim",
  "international",
  "drinks",
  "desserts",
  "fruit",
];

export const HALAL_STATUSES: readonly HalalStatus[] = ["none", "stallDeclared", "certified"];

export const MAP_SHAPES: readonly MapShape[] = ["rect", "triangleBottomRight", "triangleBottomLeft"];

export const DISH_TYPES: readonly DishType[] = [
  "rice",
  "noodles",
  "soup",
  "curryOverRice",
  "madeToOrder",
  "singlePlate",
  "snack",
  "drink",
  "dessert",
];

export const DISH_COURSES: readonly DishCourse[] = ["main", "side", "drink", "dessert"];

export const PROTEINS: readonly Protein[] = [
  "pork",
  "chicken",
  "beef",
  "seafood",
  "fish",
  "egg",
  "tofu",
  "none",
];

export const ALLERGENS: readonly Allergen[] = [
  "peanut",
  "treeNut",
  "milk",
  "egg",
  "wheat",
  "soy",
  "sesame",
  "fish",
  "shellfish",
];

export const COOKING_STYLES: readonly CookingStyle[] = [
  "stirFried",
  "deepFried",
  "boiled",
  "grilled",
  "steamed",
  "salad",
  "curry",
];

export const TEMPERATURES: readonly Temperature[] = ["hot", "cold"];


export const DIET_AVAILABILITIES: readonly DietAvailability[] = ["no", "canAsk", "yes"];

export const FLOOR_SIDES: readonly FloorSide[] = ["north", "south", "east", "west"];

/** Budget chips on the filter bar, in baht. The relax suggestions step through these. */
export const BUDGET_STEPS: readonly number[] = [40, 50, 60, 80];
