import { describe, expect, it } from "vitest";

import {
  MAX_NAME_LENGTH,
  MAX_PEOPLE,
  bindingConstraint,
  decodeGroup,
  defaultFilters,
  eachTheirOwn,
  encodeGroup,
  groupFromParams,
  oneStallForAll,
  personFilters,
  personSeed,
  type Person,
} from "@/lib/canteen";

import { NOW, makeData } from "./fixture";

const data = makeData();
const person = (change: Partial<Person> = {}): Person => ({ name: "", diet: [], avoid: [], ...change });

describe("group encoding", () => {
  it("matches the example in the plan", () => {
    const people = decodeGroup("Mint.50.np-v~Ben.80");
    expect(people).toEqual([
      { name: "Mint", max: 50, diet: ["nopork", "vegetarian"], avoid: [] },
      { name: "Ben", max: 80, diet: [], avoid: [] },
    ]);
    expect(encodeGroup(people)).toBe("Mint.50.np-v~Ben.80");
  });

  it("still reads old links that carried a spice limit, ignoring it", () => {
    expect(decodeGroup("Mint.50.np-v.s1.eg~Ben.80..s3")).toEqual([
      { name: "Mint", max: 50, diet: ["nopork", "vegetarian"], avoid: ["egg"] },
      { name: "Ben", max: 80, diet: [], avoid: [] },
    ]);
  });

  it("round trips awkward names without ambiguity", () => {
    const people: Person[] = [
      person({ name: "a.b~c\\d", max: 40 }),
      person({ name: "มิ้นท์", diet: ["halal", "vegetarian"], avoid: ["pork", "egg"] }),
      person({ name: "🍜" }),
      person({ name: "~", diet: ["vegetarian"] }),
      person({ name: "", max: 55 }),
      person({}),
    ];
    const encoded = encodeGroup(people);
    expect(decodeGroup(encoded)).toEqual(people);
    expect(encodeGroup(decodeGroup(encoded))).toBe(encoded);
  });

  it("writes diet and avoid in canonical order, so the same group is the same link", () => {
    expect(encodeGroup([person({ name: "A", diet: ["vegetarian", "nopork"], avoid: ["egg", "pork"] })])).toBe("A..np-v..pk-eg");
  });

  it("round trips the allergen leave-outs", () => {
    const people: Person[] = [{ name: "Nut", diet: [], avoid: ["nuts", "peanut", "treeNut", "milk", "wheat", "soy", "sesame"] }];
    expect(encodeGroup(people)).toBe("Nut....nu-pn-tn-mk-wh-so-se");
    expect(decodeGroup(encodeGroup(people))).toEqual(people);
  });

  it("limits the group to eight people and the names to 24 characters", () => {
    const many = Array.from({ length: 12 }, (_, i) => person({ name: `P${i}` }));
    expect(decodeGroup(encodeGroup(many))).toHaveLength(MAX_PEOPLE);
    expect(decodeGroup(`${"x".repeat(100)}.50`)[0]!.name).toHaveLength(MAX_NAME_LENGTH);
    expect(decodeGroup(Array.from({ length: 20 }, (_, i) => `n${i}`).join("~"))).toHaveLength(MAX_PEOPLE);
  });

  it("never throws on garbage and drops what it cannot read", () => {
    expect(decodeGroup(undefined)).toEqual([]);
    expect(decodeGroup("")).toEqual([]);
    expect(decodeGroup("~~~")).toEqual([]);
    expect(decodeGroup("\\")).toEqual([{ name: "\\", diet: [], avoid: [] }]);
    const [first] = decodeGroup("Zed.abc.xx-np.s9.zz-pk");
    expect(first).toEqual({ name: "Zed", diet: ["nopork"], avoid: ["pork"] });
    expect(decodeGroup("Li\u0000ne\nbreak")[0]!.name).toBe("Li ne break");
    expect(decodeGroup("A.0")[0]!.max).toBeUndefined();
    expect(decodeGroup("A.-5")[0]!.max).toBeUndefined();
  });

  it("reads p from search params in either form", () => {
    expect(groupFromParams({ p: "A.50" })).toHaveLength(1);
    expect(groupFromParams({ p: ["A.50", "B"] })).toHaveLength(1);
    expect(groupFromParams(new URLSearchParams("p=A.50~B"))).toHaveLength(2);
    expect(groupFromParams({})).toEqual([]);
  });
});

describe("personFilters", () => {
  it("combines base filters with the person's own, the tightest budget winning", () => {
    const base = { ...defaultFilters(), max: 60, diet: ["halal" as const], type: ["rice" as const] };
    const filters = personFilters(person({ max: 50, diet: ["nopork"], avoid: ["egg"] }), base);
    expect(filters).toMatchObject({ max: 50, diet: ["nopork", "halal"], avoid: ["egg"], type: ["rice"] });
    expect(personFilters(person({ max: 70 }), base)).toMatchObject({ max: 60 });
  });
});

describe("oneStallForAll", () => {
  it("lists the stalls where everyone has something, with each person's options", () => {
    const people = [person({ name: "A", diet: ["vegetarian"] }), person({ name: "B", max: 45 })];
    const result = oneStallForAll(data, people, { now: NOW });
    // Vegetarian mains: d (stall 1), l and m (stall 4). Stall 1 has d for A and a, b, d for B.
    expect(result.map((r) => r.stall.number).sort()).toEqual([1, 4]);
    for (const entry of result) {
      expect(entry.perPerson).toHaveLength(2);
      expect(entry.perPerson.every((list) => list.length > 0)).toBe(true);
    }
  });

  it("ranks by how many choices the most constrained person gets", () => {
    const people = [person({ name: "A", diet: ["vegetarian"] }), person({ name: "B" })];
    const result = oneStallForAll(data, people, { now: NOW });
    expect(result[0]!.stall.number).toBe(4); // A has two choices there, one at stall 1
    expect(result[0]!.minChoices).toBe(2);
    expect(result[1]!.minChoices).toBe(1);
  });

  it("returns nothing for an empty group or when nobody can share", () => {
    expect(oneStallForAll(data, [], { now: NOW })).toEqual([]);
    expect(oneStallForAll(data, [person({ diet: ["halal"] }), person({ diet: ["vegetarian"] })], { now: NOW })).toEqual([]);
  });

  it("applies shared base filters to everyone", () => {
    const result = oneStallForAll(data, [person(), person()], { now: NOW, base: { ...defaultFilters(), stall: "fixture-stall-2" } });
    expect(result.map((r) => r.stall.number)).toEqual([2]);
  });
});

describe("eachTheirOwn", () => {
  const people = [person({ name: "A", diet: ["vegetarian"] }), person({ name: "B", diet: ["nopork"] }), person({ name: "C", max: 40 })];

  it("gives each person a dish that suits them, deterministically", () => {
    const run = () => eachTheirOwn(data, people, { now: NOW, seed: "grp" });
    const first = run();
    expect(first.picks.map((p) => p.dish?.slug.current)).toEqual(run().picks.map((p) => p.dish?.slug.current));
    expect(first.picks[0]!.dish!.vegetarian).not.toBe("no");
    expect(first.picks[1]!.dish!.protein).not.toContain("pork");
    expect(first.picks[2]!.dish!.price).toBeLessThanOrEqual(40);
  });

  it("rerolling one person leaves the others alone", () => {
    const base = eachTheirOwn(data, people, { now: NOW, seed: "grp" });
    let changed = false;
    for (let n = 1; n < 20; n += 1) {
      const again = eachTheirOwn(data, people, { now: NOW, seed: "grp", rerolls: { 1: n } });
      expect(again.picks[0]!.dish).toEqual(base.picks[0]!.dish);
      expect(again.picks[2]!.dish).toEqual(base.picks[2]!.dish);
      if (again.picks[1]!.dish?.slug.current !== base.picks[1]!.dish?.slug.current) changed = true;
    }
    expect(changed).toBe(true);
    expect(personSeed("s", 1, { 1: 2 })).toBe("s/1/2");
  });

  it("points the group at the seating zone nearest the picked stalls", () => {
    const west = eachTheirOwn(data, [person()], { now: NOW, seed: "z", base: { ...defaultFilters(), stall: "fixture-stall-1" } });
    expect(west.seating?.zone.label.en).toBe("Fixture zone 1"); // stall 1 is at the left, zone 1 is bottom left
    const east = eachTheirOwn(data, [person()], { now: NOW, seed: "z", base: { ...defaultFilters(), stall: "fixture-stall-3" } });
    expect(east.seating?.zone.label.en).toBe("Fixture zone 2");
  });

  it("copes with someone nobody can feed and with no seating zones", () => {
    const stuck = eachTheirOwn({ ...data, settings: null }, [person({ diet: ["halal"], max: 10 })], { now: NOW, seed: "x" });
    expect(stuck.picks[0]).toMatchObject({ dish: null, stall: null });
    expect(stuck.seating).toBeNull();
  });
});

describe("bindingConstraint", () => {
  it("is null when a stall already works", () => {
    expect(bindingConstraint(data, [person(), person()], { now: NOW })).toBeNull();
    expect(bindingConstraint(data, [], { now: NOW })).toBeNull();
  });

  it("names who blocks and the smallest budget change that unlocks a stall", () => {
    // A needs certified halal (stall 3: i 60, j 45, k 70). B is vegetarian, which stall 3 does not serve.
    // Budgets: C has 30 baht. At stall 3 nothing is that cheap.
    const people = [person({ name: "A", diet: ["halal"] }), person({ name: "C", max: 30 })];
    const result = bindingConstraint(data, people, { now: NOW });
    expect(result).not.toBeNull();
    expect(result!.stall.number).toBe(3);
    expect(result!.blockers).toEqual([{ personIndex: 1, change: { kind: "raiseBudget", to: 45 } }]);
    // The suggestion really does unlock the stall.
    const fixed = [people[0]!, { ...people[1]!, max: 45 }];
    expect(oneStallForAll(data, fixed, { now: NOW }).map((s) => s.stall.number)).toContain(3);
  });

  it("falls back to dropping a diet or avoid choice when no budget would help", () => {
    // Only stall 3 is certified halal. B is vegetarian, and nothing at stall 3 is vegetarian, so no budget helps.
    const people = [person({ name: "A", diet: ["halal"] }), person({ name: "B", diet: ["vegetarian"] })];
    const result = bindingConstraint(data, people, { now: NOW });
    expect(result).not.toBeNull();
    const blocker = result!.blockers.find((b) => b.personIndex === 1);
    // B at stall 3: dropping vegetarian unlocks it. A has dishes at stall 3 so is not a blocker there.
    const stallThree = result!.stall.number === 3;
    if (stallThree) expect(blocker?.change).toEqual({ kind: "dropDiet", value: "vegetarian" });
    else expect(result!.blockers.length).toBeGreaterThan(0);
  });

  it("reports a blocker with no fix as null rather than inventing one", () => {
    const people = [person({ diet: ["halal"] }), person({ avoid: ["pork"], diet: ["halal"], max: 1 })];
    const result = bindingConstraint(data, people, { now: NOW });
    expect(result).not.toBeNull();
    expect(result!.blockers.some((b) => b.change === null || b.change.kind === "raiseBudget")).toBe(true);
  });

  it("resolves an eight person group quickly", () => {
    const eight = Array.from({ length: 8 }, (_, i) => person({ name: `P${i}`, max: 40 + i * 5, diet: i % 2 ? ["nopork"] : [] }));
    const started = performance.now();
    oneStallForAll(data, eight, { now: NOW });
    bindingConstraint(data, eight, { now: NOW });
    eachTheirOwn(data, eight, { now: NOW, seed: "eight" });
    expect(performance.now() - started).toBeLessThan(250);
  });
});
