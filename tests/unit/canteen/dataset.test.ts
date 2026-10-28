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
import { addOnsFor } from "@/lib/canteen/derive";
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
      expect(index.stallById.has(dish.stallId)).toBe(true);
      if (dish.canonicalId) expect(index.canonicalById.has(dish.canonicalId)).toBe(true);
    }
    const stallsPerCanonical = new Map<string, Set<string>>();
    for (const dish of data.dishes) {
      if (!dish.canonicalId) continue;
      const set = stallsPerCanonical.get(dish.canonicalId) ?? new Set<string>();
      set.add(dish.stallId);
      stallsPerCanonical.set(dish.canonicalId, set);
    }
    expect([...stallsPerCanonical.values()].filter((set) => set.size >= 3).length).toBeGreaterThanOrEqual(2);
  });

  it("has no em or en dashes", () => {
    const dashes = new RegExp(`[${String.fromCharCode(0x2014, 0x2013)}]`);
    expect(JSON.stringify(raw)).not.toMatch(dashes);
  });

  it("has a menu for every photographed stall, 1 to 17, and none for unphotographed 18", () => {
    expect(data.stalls.map((stall) => stall.number).sort((a, b) => a - b)).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
    const dishCount = (number: number) => data.dishes.filter((dish) => dish.stallId === `survey-stall-${number}`).length;
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


  it("draws the hall outline, landmarks and seating on the surveyed grid without overlapping the stalls", () => {
    const settings = data.settings!;
    expect(settings).toMatchObject({ gridCols: 26, gridRows: 12 });
    expect(settings.outline).toHaveLength(8);
    expect(settings.landmarks!.map((landmark) => landmark.kind).sort()).toEqual(["atm", "lifts", "lobby", "stairs", "toilets", "toilets"]);
    const blocks = [...data.stalls.map((stall) => stall.mapCell), ...settings.landmarks!, ...settings.seatingZones!];
    for (const [i, a] of blocks.entries()) {
      expect(a.col + a.w).toBeLessThanOrEqual(26);
      expect(a.row + a.h).toBeLessThanOrEqual(12);
      for (const b of blocks.slice(i + 1)) {
        const apart = a.col + a.w <= b.col || b.col + b.w <= a.col || a.row + a.h <= b.row || b.row + b.h <= a.row;
        expect(apart).toBe(true);
      }
    }
    for (const entrance of settings.entrances!) expect(entrance.col).toBeLessThan(26);
  });

  it("puts each column in walking order (stall number)", () => {
    for (const group of [[1, 2, 3, 4, 5, 6, 7], [8, 9, 10, 11], [12, 13, 14, 15, 16]]) {
      const cells = group.map((number) => data.stalls.find((stall) => stall.number === number)!.mapCell);
      expect(new Set(cells.map((cell) => cell.col)).size).toBe(1);
      expect(cells.map((cell) => cell.row)).toEqual(group.map((_, i) => cells[0]!.row + i));
    }
  });

  it("marks only stall 14 halal", () => {
    expect(data.stalls.filter((stall) => stall.halal).map((stall) => stall.number)).toEqual([14]);
  });

  it("lists add-ons on the stall, not as dishes, and splits choices into phrases to say", () => {
    const stall = (number: number) => data.stalls.find((s) => s.number === number)!;
    const atStall = (number: number) => data.dishes.filter((dish) => dish.stallId === stall(number)._id);
    expect(atStall(17).some((dish) => dish.name.th === "ไข่มุก")).toBe(false);
    const drink = atStall(17).find((dish) => dish.course === "drink")!;
    expect(addOnsFor(drink, stall(17)).some((addOn) => addOn.label.th === "เพิ่มไข่มุก")).toBe(true);
    expect(addOnsFor(atStall(17).find((dish) => dish.course === "dessert") ?? drink, stall(5))).toEqual([]);
    const choice = data.dishes.find((dish) => dish.name.th === "ข้าวผัดหมูหรือไก่")!;
    expect(choice.sayAs?.map((phrase) => phrase.romanised)).toEqual(["khao phat mu", "khao phat kai"]);
    for (const dish of data.dishes) for (const phrase of dish.sayAs ?? []) expect(phrase.th).not.toMatch(/หรือ/);
  });

  it("tags allergens on the dishes that obviously have them", () => {
    const tagged = (th: string) => data.dishes.filter((dish) => dish.name.th.includes(th));
    for (const dish of tagged("ผัดไทย")) expect(dish.contains).toContain("peanut");
    for (const dish of [...tagged("ราเมน"), ...tagged("ราเม็ง")]) expect(dish.contains).toContain("wheat");
    for (const dish of tagged("กุ้ง")) expect(dish.contains).toContain("shellfish");
    expect(applyFilters(data, { ...defaultFilters(), avoid: ["peanut", "milk", "wheat"] }, NOW).length).toBeGreaterThan(0);
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
    expect(applyFilters(data, { ...filters, diet: ["vegetarian"] }, NOW).length).toBeGreaterThan(0);
    expect(applyFilters(data, { ...filters, max: 40 }, NOW).length).toBeGreaterThan(0);
  });

  const vacantId = "survey-stall-18";

  it("picks, and never from the vacant stall", () => {
    const result = pick(data, filters, { seed: "survey", now: NOW });
    expect(result.dish).not.toBeNull();
    for (let i = 0; i < 200; i += 1) {
      const dish = pick(data, filters, { seed: `vacant-${i}`, now: NOW }).dish;
      expect(dish?.stallId).not.toBe(vacantId);
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
      { name: "A", diet: ["vegetarian"], avoid: [] },
      { name: "B", diet: ["halal"], avoid: [], max: 20 },
    ];
    const options = { base: filters, now: NOW };
    expect(oneStallForAll(data, people, options).map((entry) => entry.stall._id)).not.toContain(vacantId);
    const binding = bindingConstraint(data, people, options);
    if (binding) expect(binding.stall._id).not.toBe(vacantId);
  });
});

describe("planWeek on the surveyed data", () => {
  it("proves an impossible budget too low rather than timing out, and plans the first budget that works", () => {
    const options = { days: [1, 2, 3, 4, 5], seed: "abc", now: NOW };
    for (let budget = 150; budget < 165; budget += 1) {
      expect(planWeek(data, defaultFilters(), { ...options, budget })).toEqual({ ok: false, reason: "budgetTooLow" });
    }
    expect(planWeek(data, defaultFilters(), { ...options, budget: 165 }).ok).toBe(true);
    expect(planWeek(data, defaultFilters(), { ...options, budget: 25, days: [1] })).toEqual({ ok: false, reason: "budgetTooLow" });
  });
});
