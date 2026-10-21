/**
 * Option lists shared across several schemas, kept in one place so a label
 * or value never drifts between, say, the `form` and `newsPost` category
 * pickers.
 */

/** Matches the `Category` union in `lib/sanity/types.ts`. Maps one to one onto the `--fill-*` tokens. */
export const CATEGORY_OPTIONS = [
  { title: "Transport (shuttle, buses, anything time sensitive)", value: "transport" },
  { title: "Welfare (health, wellbeing)", value: "welfare" },
  { title: "Activity (clubs, events)", value: "activity" },
  { title: "Governance (TUSU, TUSC, policy)", value: "governance" },
];

/** Matches the `Owner` union in `lib/sanity/types.ts`. Every governance item must be attributed. */
export const OWNER_OPTIONS = [
  { title: "TUSU (the student union)", value: "tusu" },
  { title: "TUSC (the student council)", value: "tusc" },
  { title: "University", value: "university" },
  { title: "Joint", value: "joint" },
];

/** 0 = Sunday through 6 = Saturday, matching `Date#getDay`. */
export const WEEKDAY_OPTIONS = [
  { title: "Sunday", value: 0 },
  { title: "Monday", value: 1 },
  { title: "Tuesday", value: 2 },
  { title: "Wednesday", value: 3 },
  { title: "Thursday", value: 4 },
  { title: "Friday", value: 5 },
  { title: "Saturday", value: 6 },
];

/* ------------------------------------------------------------------ *
 * Canteen ("What to eat")
 *
 * Every list below mirrors a union in `lib/sanity/types.ts` and a list in
 * `lib/canteen/options.ts`. A unit test (`tests/unit/canteen/options.test.ts`)
 * fails if the three drift apart.
 * ------------------------------------------------------------------ */

/** Matches `CanteenCuisine`. A stall can have several. */
export const CANTEEN_CUISINE_OPTIONS = [
  { title: "Thai rice dishes", value: "thaiRice" },
  { title: "Made to order (ตามสั่ง)", value: "madeToOrder" },
  { title: "Noodles", value: "noodles" },
  { title: "Isan", value: "isan" },
  { title: "Chicken rice", value: "chickenRice" },
  { title: "Curry over rice", value: "curryOverRice" },
  { title: "Muslim food", value: "muslim" },
  { title: "International", value: "international" },
  { title: "Drinks", value: "drinks" },
  { title: "Desserts", value: "desserts" },
  { title: "Fruit", value: "fruit" },
];

/** Matches `DishType`. */
export const DISH_TYPE_OPTIONS = [
  { title: "Rice", value: "rice" },
  { title: "Noodles", value: "noodles" },
  { title: "Soup", value: "soup" },
  { title: "Curry over rice", value: "curryOverRice" },
  { title: "Made to order (ตามสั่ง)", value: "madeToOrder" },
  { title: "Single plate", value: "singlePlate" },
  { title: "Snack", value: "snack" },
  { title: "Drink", value: "drink" },
  { title: "Dessert", value: "dessert" },
];

/** Matches `DishCourse`. Drives the meal combos: one main, optionally a drink and a dessert. */
export const DISH_COURSE_OPTIONS = [
  { title: "Main", value: "main" },
  { title: "Side", value: "side" },
  { title: "Drink", value: "drink" },
  { title: "Dessert", value: "dessert" },
];

/** Matches `Protein`. */
export const PROTEIN_OPTIONS = [
  { title: "Pork", value: "pork" },
  { title: "Chicken", value: "chicken" },
  { title: "Beef", value: "beef" },
  { title: "Seafood", value: "seafood" },
  { title: "Fish", value: "fish" },
  { title: "Egg", value: "egg" },
  { title: "Tofu", value: "tofu" },
  { title: "None", value: "none" },
];

/** Matches `Allergen`. */
export const ALLERGEN_OPTIONS = [
  { title: "Peanuts", value: "peanut" },
  { title: "Tree nuts", value: "treeNut" },
  { title: "Milk", value: "milk" },
  { title: "Egg", value: "egg" },
  { title: "Wheat", value: "wheat" },
  { title: "Soy", value: "soy" },
  { title: "Sesame", value: "sesame" },
  { title: "Fish or fish sauce", value: "fish" },
  { title: "Shellfish or shrimp paste", value: "shellfish" },
];

/** Matches `CookingStyle`. */
export const COOKING_STYLE_OPTIONS = [
  { title: "Stir-fried", value: "stirFried" },
  { title: "Deep-fried", value: "deepFried" },
  { title: "Boiled or soup", value: "boiled" },
  { title: "Grilled", value: "grilled" },
  { title: "Steamed", value: "steamed" },
  { title: "Salad", value: "salad" },
  { title: "Curry", value: "curry" },
];

/** Matches `Temperature`. */
export const TEMPERATURE_OPTIONS = [
  { title: "Hot", value: "hot" },
  { title: "Cold", value: "cold" },
];

/** Matches `FloorSide`. Which edge of the floor plan an entrance or the river is on. */
export const FLOOR_SIDE_OPTIONS = [
  { title: "North (top of the plan)", value: "north" },
  { title: "South (bottom of the plan)", value: "south" },
  { title: "East (right of the plan)", value: "east" },
  { title: "West (left of the plan)", value: "west" },
];

/** Price older than this many days appears in the Studio list "Prices not checked in 120 days". */
export const CANTEEN_PRICE_STALE_DAYS = 120;
