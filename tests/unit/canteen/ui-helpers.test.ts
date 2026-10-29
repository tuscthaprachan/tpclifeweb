import { describe, expect, it } from "vitest";
import { dishDietTags, stallHalalTag } from "@/components/domain/canteen/diet";
import { activeChips, filterSummary } from "@/components/domain/canteen/chips";
import { paginateGroups, parsePage } from "@/components/domain/canteen/paginate";
import { canonicalMealQuery, carriedParams, formQuery, legacyMealQuery, readFilters, tidyQuery } from "@/components/domain/canteen/query";
import { applyFilters, groupDishes } from "@/lib/canteen/filter";
import { MAX_BUDGET, defaultFilters, parse, parseMealBudget, serialise } from "@/lib/canteen/params";
import { makeData, NOW } from "./fixture";

const data = makeData();
const dish = (id: string) => data.dishes.find((d) => d.slug.current === `fixture-dish-${id}`)!;
const stallOf = (id: string) => data.stalls.find((s) => s._id === dish(id).stallId)!;

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
    expect(readFilters({ max: "other", maxOther: "55" }).max).toBe(55);
    expect(readFilters({ maxOther: "55" }).max).toBe(55);
    expect(readFilters({ max: "50", maxOther: "55" }).max).toBe(50);
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

describe("readFilters with known stalls", () => {
  it("drops a stall that does not exist and keeps one that does", () => {
    const real = data.stalls[0]!.slug.current;
    expect(readFilters({ stall: "nope" }).stall).toBe("nope");
    expect(readFilters({ stall: "nope" }, data).stall).toBeUndefined();
    expect(readFilters({ stall: real }, data).stall).toBe(real);
  });
});

describe("tidyQuery", () => {
  it("drops the empty values a no JavaScript submit sends", () => {
    expect(tidyQuery({ max: "", maxOther: "", diet: "nopork" })).toBe("diet=nopork");
    expect(tidyQuery({ max: "", maxOther: "" })).toBe("");
  });

  it("keeps an empty days in week mode, and drops the empty one beside ticked days", () => {
    expect(tidyQuery({ mode: "week", budget: "300", days: [""] })).toBeNull();
    expect(tidyQuery(new URLSearchParams("mode=week&budget=300&days=&max="))).toBe("mode=week&budget=300&days=");
    expect(tidyQuery(new URLSearchParams("mode=week&days=&days=1&days=2"))).toBe("mode=week&days=1&days=2");
    expect(tidyQuery({ days: "" })).toBe("");
  });

  it("drops default sort and group and an invalid max, whatever the order", () => {
    expect(tidyQuery(new URLSearchParams("q=ice&diet=halal&sort=price&group=none&max=55"))).toBe("q=ice&diet=halal&max=55");
    expect(tidyQuery(new URLSearchParams("q=ice&sort=name&group=stall&max=0"))).toBe("q=ice&sort=name&group=stall");
    expect(tidyQuery({ max: "99999999999", maxOther: "" })).toBe("");
    expect(tidyQuery({ max: "other", maxOther: "0" })).toBe("");
  });

  it("folds a typed amount into max and keeps other parameters in order", () => {
    expect(tidyQuery({ max: "other", maxOther: "65", seed: "abc", same: "1" })).toBe("seed=abc&same=1&max=65");
    expect(tidyQuery({ max: "50", maxOther: "65", seed: "abc" })).toBe("max=50&seed=abc");
    expect(tidyQuery({ max: "other", maxOther: "" })).toBe("");
  });

  it("is null when the query is already tidy, so nothing redirects twice", () => {
    expect(tidyQuery({})).toBeNull();
    expect(tidyQuery({ max: "50", diet: "nopork,jay" })).toBeNull();
    expect(tidyQuery(new URLSearchParams(tidyQuery({ max: "", diet: "jay", maxOther: "40" })!))).toBeNull();
  });
});

describe("meal budget parameter", () => {
  it("reads meal as the whole-meal budget, separate from the per-dish max", () => {
    expect(parseMealBudget({ meal: "60" })).toBe(60);
    expect(parseMealBudget({ meal: "60", max: "40" })).toBe(60);
    expect(parse({ meal: "60" }).max).toBeUndefined();
    expect(parse({ meal: "60", max: "40" }).max).toBe(40);
  });

  it("drops an invalid meal budget", () => {
    for (const meal of ["0", "-5", "abc", "5001", "60.5", "", "other"]) expect(parseMealBudget({ meal })).toBeUndefined();
    expect(parseMealBudget({})).toBeUndefined();
    expect(parseMealBudget({ meal: String(MAX_BUDGET) })).toBe(MAX_BUDGET);
  });

  it("does not serialise meal as a filter", () => {
    expect(serialise(parse({ meal: "60", diet: "nopork" }))).toBe("diet=nopork");
  });

  it("folds meal=other and the typed amount into meal", () => {
    expect(tidyQuery({ meal: "other", mealOther: "75", same: "1" })).toBe("meal=75&same=1");
    expect(tidyQuery({ meal: "other", mealOther: "" })).toBe("meal=other");
    expect(tidyQuery({ meal: "60", mealOther: "75" })).toBe("meal=60");
    expect(tidyQuery({ meal: "60", mealOther: "" })).toBe("meal=60");
    expect(tidyQuery({ meal: "60" })).toBeNull();
  });

  it("moves an old max meal budget to meal, once", () => {
    expect(legacyMealQuery({ max: "60" })).toBe("meal=60");
    expect(legacyMealQuery({ diet: "nopork", max: "60", same: "1" })).toBe("diet=nopork&meal=60&same=1");
    expect(legacyMealQuery({ meal: "80", max: "40" })).toBeNull();
    expect(legacyMealQuery({ meal: "abc", max: "40" })).toBe("meal=40");
    expect(legacyMealQuery({ diet: "nopork" })).toBeNull();
    expect(legacyMealQuery({ max: "abc" })).toBeNull();
    expect(legacyMealQuery(new URLSearchParams(legacyMealQuery({ max: "60" })!))).toBeNull();
  });

  it("gives one canonical address for a messy old link", () => {
    expect(canonicalMealQuery({ max: "", maxOther: "55" })).toBe("meal=55");
    expect(canonicalMealQuery({ max: "60" })).toBe("meal=60");
    expect(canonicalMealQuery({ max: "60" }, false)).toBeNull();
    expect(canonicalMealQuery({ meal: "60", max: "40" })).toBeNull();
    expect(canonicalMealQuery({ meal: "", max: "" })).toBe("");
  });
});
