import { describe, expect, it } from "vitest";
import { stallsWithDishes } from "@/components/domain/canteen/compare";
import { surveyCanteenData } from "@/lib/canteen/dataset";
import { dishesInCanonical } from "@/lib/canteen/derive";

const data = surveyCanteenData(new Date("2026-10-21T00:00:00Z"));
const friedRice = dishesInCanonical(data, "survey-canonical-khao-pad");

describe("stallsWithDishes", () => {
  it("gives one row per stall, cheapest first, with every dish counted once", () => {
    const rows = stallsWithDishes(data, friedRice);
    expect(new Set(rows.map((row) => row.stall._id)).size).toBe(rows.length);
    expect(rows.reduce((sum, row) => sum + row.dishes.length, 0)).toBe(friedRice.length);
    for (const row of rows) expect(row.from).toBe(Math.min(...row.dishes.map((dish) => dish.price)));
    expect(rows.map((row) => row.from)).toEqual([...rows.map((row) => row.from)].sort((a, b) => a - b));
  });

  it("leaves out the excluded stall", () => {
    const stallId = friedRice[0].stallId;
    expect(stallsWithDishes(data, friedRice, stallId).some((row) => row.stall._id === stallId)).toBe(false);
  });
});
