import { afterEach, describe, expect, it } from "vitest";

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
import { DEMO_NOTICE, demoCanteenData, isCanteenDemo } from "@/lib/canteen/demo";
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
    expect(data.stalls).toHaveLength(18);
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

  it("is plainly labelled as example menus, with no em dashes", () => {
    expect(DEMO_NOTICE.title.en).toBe("Example menus");
    expect(DEMO_NOTICE.label.en).toBe("(example menus)");
    expect(DEMO_NOTICE.label.th).toBe("(เมนูตัวอย่าง)");
    expect(DEMO_NOTICE.body.en).toMatch(/made-up examples/);
    expect(DEMO_NOTICE.body.en).toMatch(/assumed/);
    expect(JSON.stringify(DEMO_NOTICE)).not.toMatch(new RegExp(`[${String.fromCharCode(0x2014, 0x2013)}]`));
    expect(JSON.stringify(raw)).not.toMatch(new RegExp(`[${String.fromCharCode(0x2014, 0x2013)}]`));
  });

  it("has 18 numbered stalls, 17 shops and stall 10 vacant", () => {
    expect(data.stalls.map((stall) => stall.number).sort((a, b) => a - b)).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
    const dishCount = (number: number) => {
      const stall = data.stalls.find((s) => s.number === number)!;
      return data.dishes.filter((dish) => dish.stall._ref === stall._id).length;
    };
    const vacant = data.stalls.filter((stall) => dishCount(stall.number) === 0);
    expect(vacant.map((stall) => stall.number)).toEqual([10]);
    expect(vacant[0]!.cuisine).toEqual([]);
    expect(vacant[0]!.name.en).toBe("No shop yet");
    expect(vacant[0]!.wayfinding?.en).toMatch(/Zoned for curry over rice/);
    const shops = data.stalls.filter((stall) => stall.number !== 10);
    expect(shops).toHaveLength(17);
    for (const shop of shops) expect(dishCount(shop.number)).toBeGreaterThan(0);
  });

  it("keeps the real shops where the documents put them", () => {
    const byNumber = new Map(data.stalls.map((stall) => [stall.number, stall]));
    expect(byNumber.get(7)?.name.th).toBe("ร้านคงคา GaNGa");
    expect(byNumber.get(7)?.cuisine).toEqual(["drinks"]);
    expect(byNumber.get(14)?.name.th).toBe("ร้านมุมกินฮาลาล");
    expect(byNumber.get(16)?.name.en).toBe("Tamasato Ramen");
    // Multi-slot types say the pairing is assumed. Stalls 3, 7, 9 and 14 are certain by type.
    const assumedStalls = [1, 2, 4, 5, 6, 8, 11, 12, 13, 15, 16, 17, 18];
    for (const number of assumedStalls) expect(byNumber.get(number)?.wayfinding?.en).toMatch(/assumed from the selection ranking/);
    for (const number of [3, 7, 9, 14]) expect(byNumber.get(number)?.wayfinding?.en).not.toMatch(/assumed/);
  });

  it("draws the north kiosks as triangles either side of the central lobby, and no two stalls overlap", () => {
    const k17 = data.stalls.find((stall) => stall.number === 17)!.mapCell;
    const k18 = data.stalls.find((stall) => stall.number === 18)!.mapCell;
    expect(k17).toMatchObject({ row: 0, w: 2, h: 2, shape: "triangleBottomRight" });
    expect(k18).toMatchObject({ row: 0, w: 2, h: 2, shape: "triangleBottomLeft" });
    expect(k17.col + k17.w).toBeLessThan(k18.col); // the lobby lies between them
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

  it("puts stalls 1 to 7 in one column, in walking order (stall number)", () => {
    const west = [1, 2, 3, 4, 5, 6, 7].map((number) => data.stalls.find((stall) => stall.number === number)!);
    expect(new Set(west.map((stall) => stall.mapCell.col)).size).toBe(1);
    expect(west.map((stall) => stall.mapCell.row)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    const { stallsInWalkOrder } = indexCanteen(data);
    const walked = stallsInWalkOrder.filter((stall) => stall.number <= 7).map((stall) => stall.number);
    expect(walked).toEqual([1, 2, 3, 4, 5, 6, 7]);
    // The middle block and the east column are columns too, top to bottom.
    for (const group of [[8, 9, 10, 11], [12, 13, 14, 15, 16]]) {
      const cells = group.map((number) => data.stalls.find((stall) => stall.number === number)!.mapCell);
      expect(new Set(cells.map((cell) => cell.col)).size).toBe(1);
      expect(cells.map((cell) => cell.row)).toEqual(group.map((_, i) => i));
    }
  });

  it("describes the halls entrances and seating, with no river", () => {
    expect(data.settings?.riverSide).toBeUndefined();
    expect(data.settings?.entrances?.map((entrance) => entrance.side).sort()).toEqual(["north", "north", "south"]);
    expect(data.settings?.seatingZones).toHaveLength(3);
    expect(data.settings!.gridCols).toBeGreaterThan(data.settings!.gridRows);
  });

  it("covers the halal values, with only stall 14 on the halal category", () => {
    expect(new Set(data.stalls.map((stall) => stall.halal))).toEqual(new Set(["none", "stallDeclared"]));
    expect(data.stalls.filter((stall) => stall.halal !== "none").map((stall) => stall.number)).toEqual([14]);
    expect(data.stalls.some((stall) => stall.hours)).toBe(false);
    expect(data.stalls.some((stall) => stall.vegetarianStall)).toBe(false);
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
    expect(applyFilters(data, { ...filters, diet: ["halal"] }, NOW).length).toBeGreaterThan(0);
    expect(applyFilters(data, { ...filters, diet: ["jay"] }, NOW).length).toBeGreaterThan(0);
    expect(applyFilters(data, { ...filters, max: 40 }, NOW).length).toBeGreaterThan(0);
  });

  const vacantId = "demo-stall-10";

  it("picks, and never from the vacant stall", () => {
    const result = pick(data, filters, { seed: "demo", now: NOW });
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
    const result = planWeek(data, filters, { budget: 400, days: [1, 2, 3, 4, 5], seed: "demo", now: NOW });
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
