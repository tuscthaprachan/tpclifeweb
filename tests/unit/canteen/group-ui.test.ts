import { describe, expect, it } from "vitest";

import { decodeGroup, type Person } from "@/lib/canteen/group";
import {
  applyAction,
  applyChange,
  bumpReroll,
  cleanSeed,
  encodeRerolls,
  groupHref,
  groupQuery,
  isFormSubmission,
  parseRerolls,
  peopleFromForm,
  personBadge,
  readGroupState,
  stateFromForm,
} from "@/components/domain/canteen/group/state";

const mint: Person = { name: "Mint", max: 50, diet: ["nopork", "vegetarian"], avoid: [] };
const ben: Person = { name: "Ben", max: 80, diet: [], avoid: [] };

describe("group url state", () => {
  it("keeps the p parameter compact and readable", () => {
    expect(groupQuery({ people: [mint, ben], strategy: "one" })).toBe("p=Mint.50.np-v~Ben.80");
  });

  it("round trips people, strategy, seed and rerolls", () => {
    const href = groupHref("/en/eat/group", { people: [mint, ben], strategy: "own", seed: "k7m2qx", rerolls: [1, 0] }, "results");
    const params = new URLSearchParams(href.split("#")[0]!.split("?")[1]);
    const state = readGroupState(params);
    expect(state.people).toEqual(decodeGroup("Mint.50.np-v~Ben.80"));
    expect(state.strategy).toBe("own");
    expect(state.seed).toBe("k7m2qx");
    expect(state.rerolls).toEqual([1]);
    expect(href.endsWith("#results")).toBe(true);
  });

  it("leaves seed and rerolls off for the one stall strategy", () => {
    expect(groupQuery({ people: [ben], strategy: "one", seed: "abc", rerolls: [2] })).toBe("p=Ben.80");
  });

  it("drops a seed that is not plain letters and digits", () => {
    expect(cleanSeed("<script>")).toBeUndefined();
    expect(cleanSeed("a b")).toBeUndefined();
    expect(cleanSeed("k7m2qx")).toBe("k7m2qx");
  });

  it("parses and encodes rerolls safely", () => {
    expect(parseRerolls("1-0-2")).toEqual([1, 0, 2]);
    expect(parseRerolls("x-5000-3")).toEqual([0, 0, 3]);
    expect(parseRerolls("1-1-1-1-1-1-1-1-1-1")).toHaveLength(8);
    expect(encodeRerolls([1, 0, 0])).toBe("1");
    expect(encodeRerolls([0, 0])).toBe("");
  });

  it("bumps one person's reroll only", () => {
    expect(bumpReroll([1], 2, 3)).toEqual([1, 0, 1]);
    expect(bumpReroll([99], 0, 1)).toEqual([99]);
  });

  it("falls back to one for an unknown strategy", () => {
    expect(readGroupState({ p: "Ben", strat: "nope" }).strategy).toBe("one");
  });
});

describe("group form round trip", () => {
  const form = new URLSearchParams();
  form.set("n0", "Mint");
  form.set("max0", "50");
  form.append("d0", "nopork");
  form.append("d0", "vegetarian");
  form.set("s0", "1");
  form.set("n1", "  Ben  ");
  form.set("max1", "abc");
  form.set("s1", "");
  form.append("a1", "beef");
  form.append("a1", "bogus");
  form.set("act", "show");

  it("recognises a submitted form", () => {
    expect(isFormSubmission(form)).toBe(true);
    expect(isFormSubmission(new URLSearchParams("p=Ben"))).toBe(false);
  });

  it("reads people from fields, dropping bad values", () => {
    const people = peopleFromForm(form);
    expect(people).toHaveLength(2);
    expect(people[0]).toEqual(mint);
    expect(people[1]).toEqual({ name: "Ben", diet: [], avoid: ["beef"] });
  });

  it("lands on the results after Show results", () => {
    const { state, hash } = stateFromForm(form);
    expect(state.people).toHaveLength(2);
    expect(hash).toBe("results");
  });

  it("adds a blank person and lands on them", () => {
    const add = new URLSearchParams(form);
    add.set("act", "add");
    const { state, hash } = stateFromForm(add);
    expect(state.people).toHaveLength(3);
    expect(state.people[2]).toEqual({ name: "", diet: [], avoid: [] });
    expect(hash).toBe("person-3");
  });

  it("stops at eight people", () => {
    const people = Array.from({ length: 8 }, (_, i) => ({ name: `P${i}`, diet: [], avoid: [] }) as Person);
    expect(applyAction(people, { kind: "add" })).toHaveLength(8);
    const many = new URLSearchParams();
    for (let i = 0; i < 12; i += 1) many.set(`n${i}`, `P${i}`);
    expect(peopleFromForm(many)).toHaveLength(8);
  });

  it("removes one person and never leaves the group empty", () => {
    const remove = new URLSearchParams(form);
    remove.set("act", "remove-0");
    const { state, hash } = stateFromForm(remove);
    expect(state.people.map((person) => person.name)).toEqual(["Ben"]);
    expect(hash).toBe("builder");
    expect(applyAction([mint], { kind: "remove", index: 0 })).toEqual([{ name: "", diet: [], avoid: [] }]);
  });

  it("caps long names and strips control characters", () => {
    const long = new URLSearchParams({ n0: `${"x".repeat(60)}\u0007`, act: "show" });
    expect(peopleFromForm(long)[0]!.name).toBe("x".repeat(24));
  });

  it("clears reroll counts when the group is edited", () => {
    const withR = new URLSearchParams(form);
    withR.set("r", "3-3");
    expect(stateFromForm(withR).state.rerolls).toEqual([]);
  });
});

describe("group helpers", () => {
  it("applies each kind of suggested change", () => {
    expect(applyChange(mint, { kind: "raiseBudget", to: 55 }).max).toBe(55);
    expect(applyChange(mint, { kind: "dropDiet", value: "nopork" }).diet).toEqual(["vegetarian"]);
    expect(applyChange({ ...mint, avoid: ["beef"] }, { kind: "dropAvoid", value: "beef" }).avoid).toEqual([]);
  });

  it("makes a badge from the first character, keeping emoji whole", () => {
    expect(personBadge({ name: "mint", diet: [], avoid: [] }, 0)).toBe("M");
    expect(personBadge({ name: "🍜 Noodle", diet: [], avoid: [] }, 0)).toBe("🍜");
    expect(personBadge({ name: "", diet: [], avoid: [] }, 2)).toBe("3");
    expect(personBadge({ name: "มิ้นท์", diet: [], avoid: [] }, 0)).toBe("มิ้");
  });

  it("keeps a typed name as data: the url carries it as text, never markup", () => {
    const query = groupQuery({ people: [{ name: "<img src=x>", diet: [], avoid: [] }], strategy: "one" });
    expect(query).not.toContain("<");
    expect(decodeGroup(decodeURIComponent(query.slice(2)))[0]!.name).toBe("<img src=x>");
  });
});
