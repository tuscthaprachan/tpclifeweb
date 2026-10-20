import { afterEach, describe, expect, it } from "vitest";

import {
  applyFilters,
  defaultFilters,
  indexCanteen,
  mealCombos,
  normaliseCanteenData,
  pick,
  planWeek,
} from "@/lib/canteen";
import { demoCanteenData, isCanteenDemo } from "@/lib/canteen/demo";
import { semesterKey, semesterOf } from "@/components/domain/canteen/extras/priceHistory";

const NOW = new Date("2026-10-20T12:00:00+07:00"); // a Tuesday at noon in Bangkok
const raw = demoCanteenData(NOW);
const data = normaliseCanteenData(raw);
const unique = (values: string[]) => new Set(values).size === values.length;

describe("demo canteen data", () => {
  it("normalises without dropping anything", () => {
    expect(data.stalls).toHaveLength(raw.stalls.length);
    expect(data.dishes).toHaveLength(raw.dishes.length);
    expect(data.canonicals).toHaveLength(raw.canonicals.length);
    expect(data.settings).not.toBeNull();
    expect(data.stalls).toHaveLength(8);
    expect(data.dishes.length).toBeGreaterThanOrEqual(70);
    expect(data.canonicals.length).toBeGreaterThanOrEqual(15);
  });

  it("has unique slugs and demo-prefixed ids", () => {
    expect(unique(data.dishes.map((dish) => dish.slug.current))).toBe(true);
    expect(unique(data.stalls.map((stall) => stall.slug.current))).toBe(true);
    expect(unique(data.canonicals.map((canonical) => canonical.slug.current))).toBe(true);
    const ids = [data.settings?._id ?? "", ...data.stalls.map((s) => s._id), ...data.dishes.map((d) => d._id), ...data.canonicals.map((c) => c._id)];
    expect(unique(ids)).toBe(true);
    for (const id of ids) expect(id.startsWith("demo-")).toBe(true);
  });

  it("resolves every stall and canonical reference", () => {
    const index = indexCanteen(data);
    for (const dish of data.dishes) {
      expect(index.stallById.has(dish.stall._ref)).toBe(true);
      if (dish.canonical) expect(index.canonicalById.has(dish.canonical._ref)).toBe(true);
    }
    // Several canonical dishes are sold at more than one stall, so the comparison page has something to show.
    const stallsPerCanonical = new Map<string, Set<string>>();
    for (const dish of data.dishes) {
      if (!dish.canonical) continue;
      const set = stallsPerCanonical.get(dish.canonical._ref) ?? new Set<string>();
      set.add(dish.stall._ref);
      stallsPerCanonical.set(dish.canonical._ref, set);
    }
    expect([...stallsPerCanonical.values()].filter((set) => set.size >= 3).length).toBeGreaterThanOrEqual(4);
  });

  it("is plainly labelled as demo, with no em dashes", () => {
    for (const stall of data.stalls) {
      expect(stall.name.en).toMatch(/^Demo stall/);
      expect(stall.name.th).toMatch(/^ร้านตัวอย่าง/);
    }
    expect(JSON.stringify(raw)).not.toMatch(new RegExp(`[${String.fromCharCode(0x2014, 0x2013)}]`));
  });

  it("covers the halal values and the stall with its own hours", () => {
    expect(new Set(data.stalls.map((stall) => stall.halal))).toEqual(new Set(["none", "stallDeclared", "certified"]));
    expect(data.stalls.filter((stall) => stall.hours).length).toBe(1);
    expect(data.stalls.some((stall) => stall.vegetarianStall)).toBe(true);
    expect(data.settings?.entrances).toHaveLength(2);
    expect(data.settings?.seatingZones).toHaveLength(3);
  });

  it("keeps prices in a plausible range and history in order", () => {
    for (const dish of data.dishes) {
      expect(dish.price).toBeGreaterThanOrEqual(10);
      expect(dish.price).toBeLessThanOrEqual(70);
      const history = dish.priceHistory ?? [];
      expect(history.at(-1)?.price).toBe(dish.price);
      expect(history.at(-1)?.checkedOn).toBe(dish.checkedOn);
      expect(history.map((r) => r.checkedOn)).toEqual([...history.map((r) => r.checkedOn)].sort());
    }
    expect(data.dishes.some((dish) => (dish.priceHistory ?? []).some((r) => r.price !== dish.price))).toBe(true);
  });

  it("has at least two semesters of price history", () => {
    const semesters = new Set<string>();
    for (const dish of data.dishes) {
      for (const record of dish.priceHistory ?? []) {
        const semester = semesterOf(record.checkedOn);
        if (semester) semesters.add(semesterKey(semester));
      }
    }
    expect(semesters.size).toBeGreaterThanOrEqual(4);
  });
});

describe("the canteen logic on demo data", () => {
  const filters = defaultFilters();

  it("filters", () => {
    expect(applyFilters(data, filters, NOW).length).toBe(data.dishes.length);
    expect(applyFilters(data, { ...filters, diet: ["certified"] }, NOW).length).toBeGreaterThan(0);
    expect(applyFilters(data, { ...filters, diet: ["jay"] }, NOW).length).toBeGreaterThan(0);
    expect(applyFilters(data, { ...filters, max: 40 }, NOW).length).toBeGreaterThan(0);
  });

  it("picks", () => {
    const result = pick(data, filters, { seed: "demo", now: NOW });
    expect(result.dish).not.toBeNull();
  });

  it("builds meal combos", () => {
    expect(mealCombos(data, filters, 120, { now: NOW }).length).toBeGreaterThan(0);
  });

  it("plans a week", () => {
    const result = planWeek(data, filters, { budget: 400, days: [1, 2, 3, 4, 5], seed: "demo", now: NOW });
    expect(result.ok).toBe(true);
  });
});

describe("isCanteenDemo", () => {
  const original = process.env.CANTEEN_DEMO;
  afterEach(() => {
    if (original === undefined) delete process.env.CANTEEN_DEMO;
    else process.env.CANTEEN_DEMO = original;
  });

  it("reads CANTEEN_DEMO", () => {
    delete process.env.CANTEEN_DEMO;
    expect(isCanteenDemo()).toBe(false);
    process.env.CANTEEN_DEMO = "0";
    expect(isCanteenDemo()).toBe(false);
    process.env.CANTEEN_DEMO = "1";
    expect(isCanteenDemo()).toBe(true);
  });
});
