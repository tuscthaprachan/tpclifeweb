import { describe, expect, it } from "vitest";

import { defaultFilters, mealCombos, type CanteenFilters } from "@/lib/canteen";
import { mealShortfall } from "@/lib/canteen/combos";

import { NOW, makeData } from "./fixture";

const data = makeData();
const f = (change: Partial<CanteenFilters> = {}): CanteenFilters => ({ ...defaultFilters(), ...change });

describe("mealCombos", () => {
  it("keeps every combo within the budget and states the change left", () => {
    const combos = mealCombos(data, f(), 60, { now: NOW, limit: 500 });
    expect(combos.length).toBeGreaterThan(10);
    for (const combo of combos) {
      expect(combo.total).toBeLessThanOrEqual(60);
      expect(combo.change).toBe(60 - combo.total);
      expect(combo.total).toBe(combo.items.reduce((sum, dish) => sum + dish.price, 0));
      expect(combo.main.course).toBe("main");
      if (combo.drink) expect(combo.drink.course).toBe("drink");
      if (combo.dessert) expect(combo.dessert.course).toBe("dessert");
    }
  });

  it("ranks by closeness to the budget, then fewest stalls", () => {
    const combos = mealCombos(data, f(), 60, { now: NOW, limit: 500 });
    expect(combos[0]!.change).toBe(0);
    for (let i = 1; i < combos.length; i += 1) {
      const a = combos[i - 1]!;
      const b = combos[i]!;
      expect(a.change < b.change || (a.change === b.change && a.stalls.length <= b.stalls.length)).toBe(true);
    }
    // 60 baht exactly with one stall to visit would beat any 60 with two, if one existed. Here the best has two or three.
    const exact = combos.filter((c) => c.change === 0);
    expect(exact[0]!.stalls.length).toBe(Math.min(...exact.map((c) => c.stalls.length)));
  });

  it("holds the per-dish max for every dish in a combo", () => {
    const combos = mealCombos(data, f({ max: 45 }), 100, { now: NOW, limit: 500 });
    expect(combos.some((c) => c.drink)).toBe(true);
    for (const combo of combos) {
      expect(combo.total).toBeLessThanOrEqual(100);
      for (const dish of combo.items) expect(dish.price).toBeLessThanOrEqual(45);
    }
  });

  it("perMain keeps one main from filling the list, without losing the best combos", () => {
    const all = mealCombos(data, f(), 100, { now: NOW, limit: 500 });
    const capped = mealCombos(data, f(), 100, { now: NOW, limit: 500, perMain: 2 });
    const perMain = new Map<string, number>();
    for (const combo of capped) perMain.set(combo.main.slug.current, (perMain.get(combo.main.slug.current) ?? 0) + 1);
    expect(Math.max(...perMain.values())).toBeLessThanOrEqual(2);
    expect(capped.length).toBeLessThan(all.length);
    expect(capped[0]!.change).toBe(all[0]!.change);
    const limited = mealCombos(data, f(), 100, { now: NOW, limit: 5, perMain: 1 });
    expect(new Set(limited.map((c) => c.main.slug.current)).size).toBe(limited.length);
  });

  it("explains an empty result with the cheapest main and the smallest raise", () => {
    expect(mealCombos(data, f(), 30, { now: NOW })).toEqual([]);
    expect(mealShortfall(data, f(), 30, { now: NOW })).toEqual({ cheapest: 35, raiseTo: 35 });
  });

  it("lists the stalls once each, in walking order", () => {
    const combos = mealCombos(data, f(), 80, { now: NOW, limit: 500 });
    for (const combo of combos) {
      const numbers = combo.stalls.map((s) => s.number);
      expect(new Set(numbers).size).toBe(numbers.length);
      expect(numbers).toEqual([...numbers].sort((a, b) => a - b)); // walking order is stall number order
    }
  });

  it("sameStallOnly keeps drink and dessert at the main's stall", () => {
    const withMain = makeData();
    const drink = withMain.dishes.find((d) => d.slug.current === "fixture-dish-o")!;
    withMain.dishes.push({ ...drink, _id: "dish-extra", slug: { current: "fixture-dish-extra" }, course: "main", type: "snack", price: 30 });
    const combos = mealCombos(withMain, f(), 60, { now: NOW, sameStallOnly: true, limit: 500 });
    expect(combos.every((c) => c.stalls.length === 1)).toBe(true);
    expect(combos.some((c) => c.items.length === 3)).toBe(true); // 30 + 15 + 10 at stall 5
    const free = mealCombos(withMain, f(), 60, { now: NOW, limit: 500 });
    expect(free.length).toBeGreaterThan(combos.length);
  });

  it("applies diet to every course", () => {
    const combos = mealCombos(data, f({ diet: ["vegetarian"] }), 80, { now: NOW, limit: 500 });
    expect(combos.length).toBeGreaterThan(0);
    for (const combo of combos) {
      for (const dish of combo.items) expect(dish.vegetarian || dish.stallId === "stall-4").toBe(true);
    }
  });

  it("halal leaves no drink or dessert from a stall that is not halal", () => {
    const combos = mealCombos(data, f({ diet: ["halal"] }), 80, { now: NOW, limit: 500 });
    expect(combos.every((c) => c.items.length === 1)).toBe(true);
  });

  it("type and feel describe the main, so drinks still join a noodle meal", () => {
    const combos = mealCombos(data, f({ type: ["noodles"] }), 80, { now: NOW, limit: 500 });
    expect(combos.every((c) => c.main.type === "noodles")).toBe(true);
    expect(combos.some((c) => c.drink)).toBe(true);
  });

  it("counts the dearest variant when asked", () => {
    const plain = mealCombos(data, f(), 45, { now: NOW, limit: 500 });
    const withVariants = mealCombos(data, f({ variants: true }), 45, { now: NOW, limit: 500 });
    expect(plain.some((c) => c.main.slug.current === "fixture-dish-b")).toBe(true);
    expect(withVariants.some((c) => c.main.slug.current === "fixture-dish-b")).toBe(false);
  });

  it("returns nothing when the budget buys nothing, and honours the limit", () => {
    expect(mealCombos(data, f(), 20, { now: NOW })).toEqual([]);
    expect(mealCombos(data, f(), 80, { now: NOW, limit: 3 })).toHaveLength(3);
  });

  it("is deterministic", () => {
    const run = () => mealCombos(data, f(), 60, { now: NOW }).map((c) => c.items.map((d) => d.slug.current).join("+"));
    expect(run()).toEqual(run());
  });
});
