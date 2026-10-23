import { describe, expect, it } from "vitest";

import {
  ALLERGENS,
  COOKING_STYLES,
  CUISINES,
  DISH_COURSES,
  DISH_TYPES,
  FLOOR_SIDES,
  PROTEINS,
  TEMPERATURES,
} from "@/lib/canteen";
import * as db from "@/lib/db/schema/content/enums";

/**
 * The enum lists exist in two places: the runtime lists in
 * `lib/canteen/options.ts` (typed against the unions in `lib/content/types.ts`)
 * and the Postgres enums in `lib/db/schema/content/enums.ts`. This test keeps
 * them in step.
 */
describe("canteen option lists", () => {
  const pairs: Array<[string, readonly unknown[], readonly unknown[]]> = [
    ["cuisine", CUISINES, db.CANTEEN_CUISINES],
    ["type", DISH_TYPES, db.DISH_TYPES],
    ["course", DISH_COURSES, db.DISH_COURSES],
    ["protein", PROTEINS, db.PROTEINS],
    ["allergen", ALLERGENS, db.ALLERGENS],
    ["style", COOKING_STYLES, db.COOKING_STYLES],
    ["temperature", TEMPERATURES, db.TEMPERATURES],
    ["floor side", FLOOR_SIDES, db.FLOOR_SIDES],
  ];

  it.each(pairs)("database %s enum matches the runtime list", (_name, runtime, database) => {
    expect([...database]).toEqual([...runtime]);
  });
});
