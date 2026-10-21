import { describe, expect, it } from "vitest";

import {
  applyFilters,
  commonCheckedOn,
  defaultFilters,
  facetCounts,
  groupDishes,
  parse,
  relaxSuggestions,
  type CanteenFilters,
} from "@/lib/canteen";

import { NOW, makeData, slugs } from "./fixture";

const data = makeData();
const f = (change: Partial<CanteenFilters> = {}): CanteenFilters => ({ ...defaultFilters(), ...change });
const run = (change: Partial<CanteenFilters>) => slugs(applyFilters(data, f(change), NOW));

describe("applyFilters", () => {
  it("returns every dish with no filters", () => {
    expect(run({})).toHaveLength(21);
  });

  it("budget, with and without counting the dearest variant", () => {
    expect(run({ max: 50 })).toHaveLength(17);
    expect(run({ max: 50, variants: true })).toHaveLength(16);
    expect(run({ max: 50, variants: true })).not.toContain("b");
  });

  it("diet is AND", () => {
    expect(run({ diet: ["nopork"] })).toHaveLength(16);
    expect(run({ diet: ["nobeef"] })).toEqual(expect.not.arrayContaining(["c", "f", "i"]));
    expect(run({ diet: ["nochicken"] })).toEqual(expect.not.arrayContaining(["b", "e", "j"]));
    expect(run({ diet: ["noseafood"] })).toEqual(expect.not.arrayContaining(["g", "h", "k", "u"]));
    expect(run({ diet: ["halal"] }).sort()).toEqual(["i", "j", "k"]);
    expect(run({ diet: ["vegetarian"] }).sort()).toEqual(["d", "l", "m", "n", "q", "r"]);
    expect(run({ diet: ["halal", "vegetarian"] })).toEqual([]);
  });

  it("type is OR", () => {
    expect(run({ type: ["noodles", "soup"] }).sort()).toEqual(["e", "f", "g", "h", "m"]);
  });

  it("avoid removes any listed protein", () => {
    expect(run({ avoid: ["pork", "egg"] })).toHaveLength(15);
    expect(run({ avoid: ["pork", "egg"] }).some((id) => ["a", "b", "d", "m", "s", "t"].includes(id))).toBe(false);
  });

  it("avoid also removes dishes by inferred allergen, seafood by shellfish", () => {
    const tagged = {
      ...data,
      dishes: data.dishes.map((dish) =>
        dish.slug.current === "fixture-dish-c" ? { ...dish, contains: ["peanut" as const] } : dish.slug.current === "fixture-dish-e" ? { ...dish, contains: ["shellfish" as const] } : dish,
      ),
    };
    const without = (avoid: CanteenFilters["avoid"]) => slugs(applyFilters(tagged, f({ avoid }), NOW));
    expect(without(["peanut"])).not.toContain("c");
    expect(without(["peanut"])).toHaveLength(20);
    expect(without(["nuts"])).not.toContain("fixture-dish-c");
    expect(without(["treeNut"])).toHaveLength(21);
    expect(without(["seafood"])).not.toContain("e");
    expect(without(["milk"])).toHaveLength(21);
  });

  it("feel works pairwise: choosing both sides of a pair means no constraint", () => {
    expect(run({ feel: ["soupy"] }).sort()).toEqual(["e", "f", "g", "i", "m", "o", "p"]);
    expect(run({ feel: ["notFried"] })).toHaveLength(10);
    expect(run({ feel: ["hot", "cold"] })).toHaveLength(21);
    expect(run({ feel: ["cold", "soupy"] }).sort()).toEqual(["o", "p"]);
  });

  it("stall filter uses the slug", () => {
    expect(run({ stall: "fixture-stall-2" }).sort()).toEqual(["e", "f", "g", "h"]);
    expect(run({ stall: "no-such-stall" })).toEqual([]);
  });

  it("open now drops only stalls known to be closed", () => {
    expect(run({ open: true })).toHaveLength(18); // stall 4 opens at 10:00
    expect(slugs(applyFilters(data, f({ open: true }), new Date("2026-08-10T10:30:00+07:00")))).toHaveLength(21);
    expect(slugs(applyFilters(data, f({ open: true }), new Date("2026-08-15T09:00:00+07:00")))).toHaveLength(0);
    expect(slugs(applyFilters({ ...data, settings: null, stalls: data.stalls.map((s) => ({ ...s, hours: undefined })) }, f({ open: true }), NOW))).toHaveLength(21);
  });

  it("sorts by price, ties by walking order", () => {
    expect(run({ sort: "price" }).slice(0, 10)).toEqual(["r", "o", "p", "q", "n", "d", "t", "a", "g", "l"]);
  });

  it("sorts by stall number, which is the walking order, whatever the floor plan says", () => {
    expect(run({ sort: "stall" }).slice(0, 5)).toEqual(["d", "a", "b", "c", "g"]);
    const moved = makeData();
    moved.stalls[0]!.mapCell = { col: 0, row: 5, w: 1, h: 1 };
    const order = slugs(applyFilters(moved, f({ sort: "stall" }), NOW));
    expect(order.slice(0, 4)).toEqual(["d", "a", "b", "c"]); // stall 1 stays first
    expect(order.slice(-4)).toEqual(slugs(applyFilters(makeData(), f({ sort: "stall" }), NOW)).slice(-4));
  });

  it("sorts A to Z", () => {
    expect(run({ sort: "name" })).toEqual("abcdefghijklmnopqrstu".split(""));
  });

  it("is a pure function of its inputs", () => {
    expect(run({ max: 50, diet: ["nopork"] })).toEqual(run({ max: 50, diet: ["nopork"] }));
  });
});

describe("groupDishes", () => {
  it("groups by stall in walking order", () => {
    const groups = groupDishes(data, applyFilters(data, f({ sort: "price" }), NOW), "stall");
    expect(groups.map((g) => g.stall?.number)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("groups by canonical dish with the biggest comparison first and unmapped last", () => {
    const groups = groupDishes(data, applyFilters(data, f({ sort: "price" }), NOW), "canonical");
    expect(groups[0]!.canonicalId).toBe("canon-basil");
    expect(slugs(groups[0]!.dishes)).toEqual(["a", "b", "j", "s"]);
    expect(groups.at(-1)!.key).toBe("none");
  });

  it("returns one group, or none, for group=none", () => {
    expect(groupDishes(data, [], "none")).toEqual([]);
    expect(groupDishes(data, applyFilters(data, f(), NOW), "none")).toHaveLength(1);
  });
});

describe("facetCounts", () => {
  it("counts every option against the OTHER active filters", () => {
    const counts = facetCounts(data, f({ max: 50 }), NOW);
    expect(counts.total).toBe(17);
    expect(counts.stalls).toBe(6);
    expect(counts.type.noodles).toBe(3); // e, h, m (f is 55)
    expect(counts.diet.nopork).toBe(12);
    expect(counts.max["40"]).toBe(10);
    expect(counts.max.any).toBe(21);
    expect(counts.stall["fixture-stall-3"]).toBe(1);
  });

  it("agrees with applyFilters for every single option", () => {
    const filters = f({ max: 60, diet: ["nopork"], type: ["rice"], feel: ["notFried"] });
    const counts = facetCounts(data, filters, NOW);
    for (const [type, n] of Object.entries(counts.type)) {
      expect(n).toBe(applyFilters(data, { ...filters, type: [type as never] }, NOW).length);
    }
    for (const [diet, n] of Object.entries(counts.diet)) {
      expect(n).toBe(applyFilters(data, { ...filters, diet: [...new Set([...filters.diet, diet as never])] }, NOW).length);
    }
    for (const [slug, n] of Object.entries(counts.stall)) {
      expect(n).toBe(applyFilters(data, { ...filters, stall: slug }, NOW).length);
    }
  });

  it("shows zero for an option that would empty the list, rather than omitting it", () => {
    const counts = facetCounts(data, f({ diet: ["halal"] }), NOW);
    expect(counts.type.noodles).toBe(0);
    expect("noodles" in counts.type).toBe(true);
  });

  it("replaces within a feel pair rather than combining", () => {
    const counts = facetCounts(data, f({ feel: ["hot"] }), NOW);
    expect(counts.feel.cold).toBe(applyFilters(data, f({ feel: ["cold"] }), NOW).length);
  });

  it("is all zero on an empty dataset", () => {
    const counts = facetCounts({ settings: null, stalls: [], dishes: [], canonicals: [] }, f(), NOW);
    expect(counts.total).toBe(0);
    expect(counts.type.rice).toBe(0);
    expect(counts.stall).toEqual({});
  });
});

describe("relaxSuggestions", () => {
  it("offers the next budget step and dropped filters, best two by count", () => {
    const suggestions = relaxSuggestions(data, f({ max: 40, type: ["noodles"] }), NOW);
    expect(suggestions).toHaveLength(2);
    expect(suggestions[0]).toMatchObject({ kind: "drop", param: "type", value: "noodles", count: 10 });
    expect(suggestions[1]).toMatchObject({ kind: "raise", param: "max", value: 50, count: 3 });
  });

  it("carries the resulting filters ready for a link", () => {
    const [first] = relaxSuggestions(data, f({ max: 40, type: ["noodles"] }), NOW);
    expect(first!.filters.type).toEqual([]);
    expect(first!.filters.max).toBe(40);
  });

  it("respects the limit", () => {
    expect(relaxSuggestions(data, f({ max: 40, type: ["noodles"] }), NOW, 1)).toHaveLength(1);
    expect(relaxSuggestions(data, f({ max: 40, type: ["noodles"] }), NOW, 5).length).toBeGreaterThan(1);
  });

  it("offers dropping the budget when it is already above the top step", () => {
    const suggestions = relaxSuggestions(data, f({ max: 80, diet: ["halal"], type: ["noodles"] }), NOW);
    expect(suggestions.map((s) => [s.param, s.value, s.count])).toEqual([
      ["diet", "halal", 4],
      ["type", "noodles", 3],
    ]);
  });

  it("never suggests something that does not help", () => {
    expect(relaxSuggestions(data, f({ max: 80 }), NOW)).toEqual([]);
    expect(relaxSuggestions(data, f(), NOW)).toEqual([]);
  });

  it("can drop individual values of a multi value filter", () => {
    const suggestions = relaxSuggestions(data, f({ feel: ["cold", "soupy", "fried"] }), NOW, 3);
    for (const s of suggestions) expect(s.filters.feel).toHaveLength(2);
  });

  it("works from parsed URL filters", () => {
    const filters = parse(new URLSearchParams("max=40&type=noodles"));
    expect(relaxSuggestions(data, filters, NOW)[0]!.count).toBe(10);
  });
});

describe("commonCheckedOn", () => {
  it("returns the shared date, or undefined when dates differ or the list is empty", () => {
    expect(commonCheckedOn(data.dishes)).toBe("2026-08-01");
    expect(commonCheckedOn([])).toBeUndefined();
    expect(commonCheckedOn([data.dishes[0]!, { ...data.dishes[1]!, checkedOn: "2026-08-02" }])).toBeUndefined();
  });
});
