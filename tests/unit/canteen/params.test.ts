import { describe, expect, it } from "vitest";

import { defaultFilters, normalise, parse, serialise, withFilters, activeFilterParams, countActiveValues } from "@/lib/canteen";

describe("params", () => {
  it("parses the documented example", () => {
    const filters = parse(new URLSearchParams("max=50&diet=nopork&type=noodles,soup&spice=1&sort=price"));
    expect(filters).toMatchObject({ max: 50, diet: ["nopork"], type: ["noodles", "soup"], spice: 1, sort: "price" });
  });

  it("reads the old sort=walk link as stall number order", () => {
    expect(parse(new URLSearchParams("sort=walk")).sort).toBe("stall");
  });

  it("serialises in one canonical order, leaving defaults and commas readable", () => {
    const text = serialise({
      ...defaultFilters(),
      type: ["soup", "noodles"],
      diet: ["jay", "nopork"],
      max: 50,
      spice: 1,
      sort: "stall",
      group: "stall",
      variants: true,
      open: true,
    });
    expect(text).toBe("max=50&diet=nopork,jay&type=noodles,soup&spice=1&open=1&sort=stall&group=stall&variants=1");
    expect(serialise(defaultFilters())).toBe("");
  });

  it("round trips: parse(serialise(f)) equals f for normalised filters", () => {
    const filters = {
      ...defaultFilters(),
      max: 60,
      diet: ["nopork", "halal"] as const,
      type: ["rice", "dessert"] as const,
      avoid: ["pork", "egg"] as const,
      spice: 0 as const,
      feel: ["hot", "notFried"] as const,
      stall: "fixture-stall-2",
      open: true,
      sort: "name" as const,
      group: "canonical" as const,
      variants: true,
    };
    const input = { ...filters, diet: [...filters.diet], type: [...filters.type], avoid: [...filters.avoid], feel: [...filters.feel] };
    expect(parse(new URLSearchParams(serialise(input)))).toEqual(input);
  });

  it("is order independent, so the same filters give the same URL", () => {
    const a = serialise(parse(new URLSearchParams("type=soup,noodles&diet=jay,nopork&max=50")));
    const b = serialise(parse(new URLSearchParams("max=50&diet=nopork&diet=jay&type=noodles&type=soup")));
    expect(a).toBe(b);
  });

  it("drops invalid values silently and never throws", () => {
    const filters = parse({
      max: "abc",
      diet: "nopork,martian,,NOPORK",
      type: ["noodles", "pizza"],
      avoid: "pork,chicken",
      spice: "9",
      feel: "hot,lukewarm",
      stall: "Not A Slug!",
      sort: "random",
      group: "weird",
      open: "maybe",
    });
    expect(filters).toEqual({ ...defaultFilters(), diet: ["nopork"], type: ["noodles"], avoid: ["pork"], feel: ["hot"] });
  });

  it("rejects zero, negative, fractional and absurd budgets", () => {
    for (const max of ["0", "-5", "4.5", "99999", "1e3", ""]) {
      expect(parse({ max }).max).toBeUndefined();
    }
    expect(parse({ max: "50" }).max).toBe(50);
  });

  it("treats spice 3 as no limit and normalises it away", () => {
    expect(parse({ spice: "3" }).spice).toBeUndefined();
    expect(parse({ spice: "0" }).spice).toBe(0);
  });

  it("accepts the values a native checkbox form submits", () => {
    const filters = parse({ open: "on", variants: "on" });
    expect(filters.open).toBe(true);
    expect(filters.variants).toBe(true);
  });

  it("normalise() fixes a hand built object", () => {
    const filters = normalise({ type: ["soup", "noodles", "soup"], diet: ["jay", "nopork"] });
    expect(filters.type).toEqual(["noodles", "soup"]);
    expect(filters.diet).toEqual(["nopork", "jay"]);
  });

  it("withFilters appends filters and extras, skipping empty extras", () => {
    const filters = { ...defaultFilters(), max: 50, type: ["noodles" as const] };
    expect(withFilters("/th/eat/pick", filters, { seed: "k7m2qx", mode: "dish", lock: undefined, not: "" })).toBe(
      "/th/eat/pick?max=50&type=noodles&seed=k7m2qx&mode=dish",
    );
    expect(withFilters("/th/eat", defaultFilters())).toBe("/th/eat");
    expect(withFilters("/th/eat?x=1", filters)).toBe("/th/eat?x=1&max=50&type=noodles");
  });

  it("encodes extras that need it", () => {
    expect(withFilters("/en/eat/group", defaultFilters(), { p: "Mint.50~Ben ก" })).toBe(
      "/en/eat/group?p=Mint.50~Ben%20%E0%B8%81",
    );
  });

  it("counts active filters, not display choices", () => {
    const filters = { ...defaultFilters(), max: 50, diet: ["nopork" as const, "jay" as const], sort: "name" as const, group: "stall" as const };
    expect(activeFilterParams(filters)).toEqual(["max", "diet"]);
    expect(countActiveValues(filters)).toBe(3);
  });
});
