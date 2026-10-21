import { describe, expect, it } from "vitest";

import {
  applyFilters,
  bindingConstraint,
  defaultFilters,
  indexCanteen,
  mealCombos,
  normaliseCanteenData,
  oneStallForAll,
  pick,
  planWeek,
  type Person,
} from "@/lib/canteen";
import { surveyCanteenData } from "@/lib/canteen/dataset";
import { SURVEY_DISHES } from "@/lib/canteen/survey-2569";

const NOW = new Date("2026-10-20T12:00:00+07:00"); // a Tuesday at noon in Bangkok
const raw = surveyCanteenData(NOW);
const data = normaliseCanteenData(raw);
const unique = (values: string[]) => new Set(values).size === values.length;

describe("surveyed canteen data", () => {
  it("normalises without dropping anything", () => {
    expect(data.stalls).toHaveLength(raw.stalls.length);
    expect(data.dishes).toHaveLength(raw.dishes.length);
    expect(data.dishes).toHaveLength(SURVEY_DISHES.length);
    expect(data.canonicals).toHaveLength(raw.canonicals.length);
    expect(data.stalls).toHaveLength(18);
  });

  it("has unique slugs and survey-prefixed ids", () => {
    expect(unique(data.dishes.map((dish) => dish.slug.current))).toBe(true);
    expect(unique(data.stalls.map((stall) => stall.slug.current))).toBe(true);
    expect(unique(data.canonicals.map((canonical) => canonical.slug.current))).toBe(true);
    const ids = [data.settings?._id ?? "", ...data.stalls.map((s) => s._id), ...data.dishes.map((d) => d._id), ...data.canonicals.map((c) => c._id)];
    expect(unique(ids)).toBe(true);
    for (const id of ids) expect(id.startsWith("survey-")).toBe(true);
  });

  it("resolves every stall and canonical reference", () => {
    const index = indexCanteen(data);
    for (const dish of data.dishes) {
      expect(index.stallById.has(dish.stall._ref)).toBe(true);
      if (dish.canonical) expect(index.canonicalById.has(dish.canonical._ref)).toBe(true);
    }
    const stallsPerCanonical = new Map<string, Set<string>>();
    for (const dish of data.dishes) {
      if (!dish.canonical) continue;
      const set = stallsPerCanonical.get(dish.canonical._ref) ?? new Set<string>();
      set.add(dish.stall._ref);
      stallsPerCanonical.set(dish.canonical._ref, set);
    }
    expect([...stallsPerCanonical.values()].filter((set) => set.size >= 3).length).toBeGreaterThanOrEqual(2);
  });

  it("has no em or en dashes", () => {
    const dashes = new RegExp(`[${String.fromCharCode(0x2014, 0x2013)}]`);
    expect(JSON.stringify(raw)).not.toMatch(dashes);
  });

  it("has a menu for every photographed stall, 1 to 17, and none for unphotographed 18", () => {
    expect(data.stalls.map((stall) => stall.number).sort((a, b) => a - b)).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
    const dishCount = (number: number) => data.dishes.filter((dish) => dish.stall._ref === `survey-stall-${number}`).length;
    for (let number = 1; number <= 17; number += 1) expect(dishCount(number)).toBeGreaterThan(0);
    expect(dishCount(18)).toBe(0);
    expect(data.stalls.find((stall) => stall.number === 18)?.wayfinding?.en).toMatch(/not yet confirmed/);
  });

  it("keeps the shops at the numbers the photos show", () => {
    const byNumber = new Map(data.stalls.map((stall) => [stall.number, stall]));
    expect(byNumber.get(3)?.name.th).toBe("แม่พิมพ์ อาหารตามสั่ง");
    expect(byNumber.get(7)?.name.en).toBe("Tamasato Ramen");
    expect(byNumber.get(10)?.name.en).toBe("Steak Project");
    expect(byNumber.get(14)?.name.th).toBe("ร้านมุมกินฮาลาล");
  });

  it("draws the north kiosks as triangles either side of the central lobby, and no two stalls overlap", () => {
    const k17 = data.stalls.find((stall) => stall.number === 17)!.mapCell;
    const k18 = data.stalls.find((stall) => stall.number === 18)!.mapCell;
    expect(k17).toMatchObject({ row: 0, w: 2, h: 2, shape: "triangleBottomRight" });
    expect(k18).toMatchObject({ row: 0, w: 2, h: 2, shape: "triangleBottomLeft" });
    expect(k17.col + k17.w).toBeLessThan(k18.col);
    const cells = data.stalls.map((stall) => stall.mapCell);
    for (const [i, a] of cells.entries()) {
      for (const b of cells.slice(i + 1)) {
        const apart = a.col + a.w <= b.col || b.col + b.w <= a.col || a.row + a.h <= b.row || b.row + b.h <= a.row;
        expect(apart).toBe(true);
      }
    }
  });

  it("uses the real 2569 jay festival dates", () => {
    expect(data.settings?.jayFestivalStart).toBe("2026-10-10");
    expect(data.settings?.jayFestivalEnd).toBe("2026-10-18");
  });

  it("puts each column in walking order (stall number)", () => {
    for (const group of [[1, 2, 3, 4, 5, 6, 7], [8, 9, 10, 11], [12, 13, 14, 15, 16]]) {
      const cells = group.map((number) => data.stalls.find((stall) => stall.number === number)!.mapCell);
      expect(new Set(cells.map((cell) => cell.col)).size).toBe(1);
      expect(cells.map((cell) => cell.row)).toEqual(group.map((_, i) => i));
    }
  });

  it("marks only stall 14 halal, and never says a stall was asked", () => {
    expect(data.stalls.filter((stall) => stall.halal !== "none").map((stall) => stall.number)).toEqual([14]);
    for (const dish of data.dishes) for (const tag of [dish.vegetarian, dish.vegan, dish.jay]) expect(tag).not.toBe("canAsk");
  });

  it("keeps prices whole and plausible, with non-negative variants", () => {
    for (const dish of data.dishes) {
      expect(Number.isInteger(dish.price)).toBe(true);
      expect(dish.price).toBeGreaterThanOrEqual(5);
      expect(dish.price).toBeLessThanOrEqual(150);
      for (const variant of dish.variants ?? []) expect(variant.delta).toBeGreaterThan(0);
    }
  });
});

describe("the canteen logic on surveyed data", () => {
  const filters = defaultFilters();

  it("filters", () => {
    expect(applyFilters(data, filters, NOW).length).toBe(data.dishes.length);
    expect(applyFilters(data, { ...filters, diet: ["halal"] }, NOW).length).toBeGreaterThan(0);
    expect(applyFilters(data, { ...filters, diet: ["jay"] }, NOW).length).toBeGreaterThan(0);
    expect(applyFilters(data, { ...filters, max: 40 }, NOW).length).toBeGreaterThan(0);
  });

  const vacantId = "survey-stall-18";

  it("picks, and never from the vacant stall", () => {
    const result = pick(data, filters, { seed: "survey", now: NOW });
    expect(result.dish).not.toBeNull();
    for (let i = 0; i < 200; i += 1) {
      const dish = pick(data, filters, { seed: `vacant-${i}`, now: NOW }).dish;
      expect(dish?.stall._ref).not.toBe(vacantId);
    }
  });

  it("builds meal combos", () => {
    const combos = mealCombos(data, filters, 120, { now: NOW });
    expect(combos.length).toBeGreaterThan(0);
    for (const combo of combos) for (const stall of combo.stalls) expect(stall._id).not.toBe(vacantId);
  });

  it("plans a week", () => {
    const result = planWeek(data, filters, { budget: 400, days: [1, 2, 3, 4, 5], seed: "survey", now: NOW });
    expect(result.ok).toBe(true);
    expect(JSON.stringify(result)).not.toContain(vacantId);
  });

  it("never offers the vacant stall to a group", () => {
    const people: Person[] = [
      { name: "A", diet: ["vegan"], avoid: [] },
      { name: "B", diet: ["halal"], avoid: [], max: 20 },
    ];
    const options = { base: filters, now: NOW };
    expect(oneStallForAll(data, people, options).map((entry) => entry.stall._id)).not.toContain(vacantId);
    const binding = bindingConstraint(data, people, options);
    if (binding) expect(binding.stall._id).not.toBe(vacantId);
  });
});
