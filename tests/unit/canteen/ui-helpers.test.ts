import { describe, expect, it } from "vitest";
import { dishDietTags, stallHalalTag } from "@/components/domain/canteen/diet";
import { cheapestSlugs } from "@/components/domain/canteen/compare";
import { activeChips, filterSummary } from "@/components/domain/canteen/chips";
import { paginateGroups, parsePage } from "@/components/domain/canteen/paginate";
import { carriedParams, formQuery, readFilters, tidyQuery } from "@/components/domain/canteen/query";
import { applyFilters, groupDishes } from "@/lib/canteen/filter";
import { defaultFilters, parse } from "@/lib/canteen/params";
import { makeData, NOW } from "./fixture";

const data = makeData();
const dish = (id: string) => data.dishes.find((d) => d.slug.current === `fixture-dish-${id}`)!;
const stallOf = (id: string) => data.stalls.find((s) => s._id === dish(id).stall._ref)!;

describe("dishDietTags", () => {
  it("tags everything a halal stall sells as halal, and nothing elsewhere", () => {
    for (const id of ["i", "j", "k"]) expect(dishDietTags(dish(id), stallOf(id)).map((t) => t.key)).toContain("halal");
    expect(dishDietTags(dish("e"), stallOf("e")).map((t) => t.key)).not.toContain("halal");
  });
  it("tags vegetarian mains only, never drinks, desserts or sides", () => {
    expect(dishDietTags(dish("l"), stallOf("l")).map((t) => t.key)).toEqual(["vegetarian"]);
    for (const id of ["n", "o", "p", "q", "r"]) expect(dishDietTags(dish(id), stallOf(id))).toEqual([]);
    expect(dishDietTags(dish("a"), stallOf("a"))).toEqual([]);
  });
  it("gives a stall halal tag only to a halal stall", () => {
    expect(stallHalalTag(stallOf("a"))).toBeNull();
    expect(stallHalalTag(stallOf("e"))).toBeNull();
    expect(stallHalalTag(stallOf("i"))?.key).toBe("halalWholeStall");
  });
});

describe("cheapestSlugs", () => {
  it("marks the lowest price only when prices differ", () => {
    expect([...cheapestSlugs([dish("a"), dish("b")])]).toEqual(["fixture-dish-a"]);
    expect(cheapestSlugs([dish("a")]).size).toBe(0);
    const same = [dish("a"), { ...dish("b"), price: 40 }];
    expect(cheapestSlugs(same).size).toBe(0);
  });
});

describe("chips and summary", () => {
  it("joins with a middle dot and counts the filters", () => {
    const filters = parse(new URLSearchParams("diet=nopork&max=50&type=noodles"));
    expect(filterSummary(filters, "en")).toBe("No pork · under 50 baht · Noodles · 3 filters");
    expect(filterSummary(defaultFilters(), "en")).toBe("Showing everything");
  });
  it("names only the first three and keeps the total", () => {
    const filters = parse(new URLSearchParams("diet=nopork,halal&max=50&type=noodles"));
    expect(filterSummary(filters, "en")).toBe("No pork · Halal · under 50 baht · 4 filters");
  });
  it("each chip's without removes only that one", () => {
    const filters = parse(new URLSearchParams("diet=nopork,vegetarian&max=50"));
    const chip = activeChips(filters, "en").find((c) => c.id === "diet-vegetarian")!;
    expect(chip.without.diet).toEqual(["nopork"]);
    expect(chip.without.max).toBe(50);
  });
});

describe("paginateGroups", () => {
  const groups = groupDishes(data, applyFilters(data, defaultFilters(), NOW), "stall");
  it("fills each page and cuts groups across the boundary", () => {
    const first = paginateGroups(groups, 1, 5);
    expect(first.groups.reduce((n, g) => n + g.dishes.length, 0)).toBe(5);
    expect(first.totalPages).toBe(Math.ceil(21 / 5));
    const second = paginateGroups(groups, 2, 5);
    expect(second.groups[0]!.continued).toBe(first.groups.at(-1)!.dishes.length < first.groups.at(-1)!.groupSize);
  });
  it("clamps the page and handles no dishes", () => {
    expect(paginateGroups(groups, 99, 5).page).toBe(5);
    expect(paginateGroups([], 1)).toMatchObject({ total: 0, from: 0, to: 0, totalPages: 1 });
  });
  it("parses page numbers safely", () => {
    expect([parsePage("3"), parsePage("0"), parsePage("x"), parsePage(undefined), parsePage(["2", "5"])]).toEqual([3, 1, 1, 1, 2]);
  });
});

describe("form query", () => {
  it("lets the typed amount win over the chip", () => {
    expect(readFilters({ max: "50", maxOther: "55" }).max).toBe(55);
    expect(readFilters({ max: "50", maxOther: "" }).max).toBe(50);
  });
  it("builds the same URL as serialise, drops page, keeps carried params", () => {
    const form = new URLSearchParams("max=&maxOther=&diet=nopork&sort=price&group=none&page=3");
    expect(formQuery(form)).toBe("diet=nopork");
    expect(formQuery(form, { seed: "abc", page: "9" })).toBe("diet=nopork&seed=abc");
  });
  it("carries only what the form does not own", () => {
    expect(carriedParams({ diet: "nopork", seed: "x", page: "2" })).toEqual({ seed: "x" });
  });
});

describe("tidyQuery", () => {
  it("drops the empty values a no JavaScript submit sends", () => {
    expect(tidyQuery({ max: "", maxOther: "", diet: "nopork" })).toBe("diet=nopork");
    expect(tidyQuery({ max: "", maxOther: "" })).toBe("");
  });

  it("folds a typed amount into max and keeps other parameters in order", () => {
    expect(tidyQuery({ max: "50", maxOther: "65", seed: "abc", same: "1" })).toBe("seed=abc&same=1&max=65");
  });

  it("is null when the query is already tidy, so nothing redirects twice", () => {
    expect(tidyQuery({})).toBeNull();
    expect(tidyQuery({ max: "50", diet: "nopork,jay" })).toBeNull();
    expect(tidyQuery(new URLSearchParams(tidyQuery({ max: "", diet: "jay", maxOther: "40" })!))).toBeNull();
  });
});
