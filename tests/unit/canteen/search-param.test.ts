import { describe, expect, it } from "vitest";

import { applyFilters, countActiveValues, defaultFilters, groupDishes, matchesQuery, normalise, parse, relaxSearch, relaxSuggestions, serialise, withFilters, type CanteenFilters } from "@/lib/canteen";
import { parseShow, showGroups } from "@/components/domain/canteen/paginate";
import { priceText } from "@/components/domain/canteen/PriceTag";

import { NOW, makeData, slugs } from "./fixture";

const f = (change: Partial<CanteenFilters> = {}): CanteenFilters => ({ ...defaultFilters(), ...change });

function searchData() {
  const data = makeData();
  data.canonicals[0]!.aliases = ["krapow", "kaprao", "กะเพา"];
  const dish = data.dishes.find((d) => d.slug.current === "fixture-dish-a")!;
  dish.name = { th: "ข้าวกะเพราหมู", en: "Basil pork rice" };
  dish.sayAs = [{ _key: "s1", th: "ข้าวกะเพราหมู", romanised: "khao kaphrao mu" }];
  return data;
}

describe("q parameter", () => {
  it("parses, trims and collapses whitespace", () => {
    expect(parse(new URLSearchParams("q=%20%20Basil%20%20pork%20")).q).toBe("Basil pork");
    expect(parse(new URLSearchParams("q=")).q).toBeUndefined();
    expect(parse(new URLSearchParams("q=%20%20")).q).toBeUndefined();
    expect(parse(new URLSearchParams("")).q).toBeUndefined();
  });

  it("cuts long text to 80 characters", () => {
    expect(parse(new URLSearchParams(`q=${"a".repeat(200)}`)).q).toHaveLength(80);
  });

  it("serialises encoded, after open and before sort, and leaves it out when empty", () => {
    expect(serialise(f({ q: "kra pao", max: 50, open: true, sort: "name" }))).toBe("max=50&open=1&q=kra%20pao&sort=name");
    expect(serialise(f({ q: "  " }))).toBe("");
  });

  it("round trips Thai and spaces", () => {
    const filters = f({ q: "ข้าว กะเพรา", type: ["rice"] });
    expect(parse(new URLSearchParams(serialise(filters)))).toEqual(filters);
    expect(normalise(filters)).toEqual(filters);
  });

  it("counts as one active value and is kept by links", () => {
    expect(countActiveValues(f({ q: "rice", max: 50 }))).toBe(2);
    expect(countActiveValues(f({ q: " " }))).toBe(0);
    expect(withFilters("/en/eat/dishes", f({ q: "rice" }), { q: "other", show: 40 })).toBe("/en/eat/dishes?q=rice&show=40");
  });
});

describe("search matching", () => {
  const data = searchData();
  const run = (q: string, change: Partial<CanteenFilters> = {}) => slugs(applyFilters(data, f({ q, ...change }), NOW));

  it("matches the name in either language, ignoring case", () => {
    expect(run("BASIL PORK")).toEqual(["a"]);
    expect(run("กะเพรา")).toEqual(["a"]);
    expect(run("FIXTURE DISH B")).toContain("b");
    expect(run("เมนูตัวอย่าง b")).toContain("b");
  });

  it("matches the romanised way to say it", () => {
    expect(run("kaphrao")).toEqual(["a"]);
    expect(run("khao kaphrao")).toEqual(["a"]);
  });

  it("matches a canonical name or alias for every dish mapped to it", () => {
    const basil = slugs(data.dishes.filter((d) => d.canonicalId === "canon-basil"));
    expect(run("krapow").sort()).toEqual(basil.map((s) => s.replace("fixture-dish-", "")).sort());
    expect(run("Fixture basil dish").length).toBe(basil.length);
  });

  it("needs every word, in any order", () => {
    expect(run("pork basil")).toEqual(["a"]);
    expect(run("basil zebra")).toEqual([]);
  });

  it("treats punctuation like a space", () => {
    expect(run("khao-kaphrao")).toEqual(["a"]);
  });

  it("combines with the other filters", () => {
    expect(run("krapow", { max: 40 })).toEqual(["a"]);
  });

  it("matches everything when empty", () => {
    expect(matchesQuery(data, data.dishes[0]!, undefined)).toBe(true);
    expect(matchesQuery(data, data.dishes[0]!, "   ")).toBe(true);
  });
});

describe("relaxing a search", () => {
  const data = searchData();

  it("offers the same filters without the search text and what that gives", () => {
    const filters = f({ q: "zebra", max: 60 });
    expect(applyFilters(data, filters, NOW)).toEqual([]);
    const relax = relaxSearch(data, filters, NOW);
    expect(relax?.filters.q).toBeUndefined();
    expect(relax?.filters.max).toBe(60);
    expect(relax?.count).toBe(applyFilters(data, { ...filters, q: undefined }, NOW).length);
  });

  it("offers nothing without search text, or when dropping it gives no more", () => {
    expect(relaxSearch(data, f({ max: 60 }), NOW)).toBeNull();
    expect(relaxSearch(data, f({ q: "fixture" }), NOW)).toBeNull();
  });

  it("keeps the search text in the other relax suggestions", () => {
    const suggestions = relaxSuggestions(data, f({ q: "fixture", max: 40 }), NOW);
    expect(suggestions.length).toBeGreaterThan(0);
    for (const suggestion of suggestions) expect(suggestion.filters.q).toBe("fixture");
  });
});

describe("show more", () => {
  const data = makeData();
  const groups = groupDishes(data, applyFilters(data, defaultFilters(), NOW), "stall");

  it("reads show, then an old page link, then the default, within range", () => {
    expect(parseShow("40", undefined, 752)).toBe(40);
    expect(parseShow(undefined, undefined, 752)).toBe(20);
    expect(parseShow("7", undefined, 752)).toBe(20);
    expect(parseShow("9999", undefined, 752)).toBe(752);
    expect(parseShow("x", "2", 752)).toBe(96);
    expect(parseShow(["60", "80"], "2", 752)).toBe(60);
    expect(parseShow(undefined, "0", 752)).toBe(20);
    expect(parseShow(undefined, "-1", 752)).toBe(20);
    expect(parseShow(undefined, "1", 752)).toBe(20);
    expect(parseShow(undefined, undefined, 0)).toBe(20);
  });

  it("shows the first dishes cumulatively, cut across groups", () => {
    const first = showGroups(groups, 8, 5);
    expect(first).toMatchObject({ shown: 8, total: 21, nextCount: 5 });
    expect(first.groups.reduce((n, g) => n + g.dishes.length, 0)).toBe(8);
    expect(first.groups.every((g) => !g.continued)).toBe(true);
    expect(showGroups(groups, 100, 5)).toMatchObject({ shown: 21, nextCount: 0 });
    expect(showGroups(groups, 18, 5).nextCount).toBe(3);
    expect(showGroups([], 20)).toMatchObject({ shown: 0, total: 0, nextCount: 0 });
  });
});

describe("price text", () => {
  it("is the base price without extras and a range with them", () => {
    expect(priceText("en", 45)).toBe("45 baht");
    expect(priceText("en", 45, [{ _key: "a", label: { th: "ก", en: "A" }, delta: 10 }, { _key: "b", label: { th: "ข", en: "B" }, delta: 15 }])).toBe("45 to 60 baht");
    expect(priceText("th", 45, [{ _key: "a", label: { th: "ก", en: "A" }, delta: 15 }])).toBe("45 ถึง 60 บาท");
    expect(priceText("en", 45, [{ _key: "a", label: { th: "ก", en: "A" }, delta: 0 }])).toBe("45 baht");
  });
});
