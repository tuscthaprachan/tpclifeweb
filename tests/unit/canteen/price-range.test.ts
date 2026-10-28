import { describe, expect, it } from "vitest";
import { priceRange } from "@/lib/canteen/derive";
import type { CanteenDish } from "@/lib/content/types";

const dish = (price: number, deltas: number[] = []) => ({ price, variants: deltas.map((delta) => ({ delta })) }) as unknown as CanteenDish;

describe("priceRange", () => {
  it("includes the dearest variant", () => {
    expect(priceRange([dish(25), dish(40, [5, 10])])).toEqual({ min: 25, max: 50 });
  });

  it("can ignore variants", () => {
    expect(priceRange([dish(25), dish(40, [10])], false)).toEqual({ min: 25, max: 40 });
  });

  it("is null for no dishes", () => {
    expect(priceRange([])).toBeNull();
  });
});
