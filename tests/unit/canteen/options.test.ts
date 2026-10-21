import { describe, expect, it } from "vitest";

import {
  COOKING_STYLES,
  CUISINES,
  DIET_AVAILABILITIES,
  DISH_COURSES,
  DISH_TYPES,
  FLOOR_SIDES,
  HALAL_STATUSES,
  PROTEINS,
  TEMPERATURES,
} from "@/lib/canteen";
import {
  CANTEEN_CUISINE_OPTIONS,
  COOKING_STYLE_OPTIONS,
  DIET_AVAILABILITY_OPTIONS,
  DISH_COURSE_OPTIONS,
  DISH_TYPE_OPTIONS,
  FLOOR_SIDE_OPTIONS,
  HALAL_OPTIONS,
  PROTEIN_OPTIONS,
  TEMPERATURE_OPTIONS,
} from "@/sanity/schemas/constants";

/**
 * The enum lists exist in three places: the unions in `lib/sanity/types.ts`,
 * the runtime lists in `lib/canteen/options.ts`, and the Studio option lists in
 * `sanity/schemas/constants.ts`. The runtime lists are typed against the
 * unions; this test keeps the Studio lists in step with the runtime ones.
 */
describe("canteen option lists", () => {
  const pairs: Array<[string, readonly unknown[], Array<{ value: unknown }>]> = [
    ["cuisine", CUISINES, CANTEEN_CUISINE_OPTIONS],
    ["halal", HALAL_STATUSES, HALAL_OPTIONS],
    ["type", DISH_TYPES, DISH_TYPE_OPTIONS],
    ["course", DISH_COURSES, DISH_COURSE_OPTIONS],
    ["protein", PROTEINS, PROTEIN_OPTIONS],
    ["style", COOKING_STYLES, COOKING_STYLE_OPTIONS],
    ["temperature", TEMPERATURES, TEMPERATURE_OPTIONS],
    ["diet availability", DIET_AVAILABILITIES, DIET_AVAILABILITY_OPTIONS],
    ["floor side", FLOOR_SIDES, FLOOR_SIDE_OPTIONS],
  ];

  it.each(pairs)("Studio %s options match the runtime list", (_name, runtime, studio) => {
    expect(studio.map((option) => option.value)).toEqual([...runtime]);
  });
});
