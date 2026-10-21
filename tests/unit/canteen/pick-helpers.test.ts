import { describe, expect, it } from "vitest";

import {
  chooseCombo,
  pickExtras,
  pickHref,
  readPickParams,
  reelNames,
  serverBias,
  toPickLock,
  type PickParams,
} from "@/components/domain/canteen/pick/helpers";
import { defaultFilters, mealCombos } from "@/lib/canteen";

import { NOW, makeData } from "./fixture";


const base: PickParams = { seed: "k7m2qx", mode: "dish", bias: "fair", lock: [], not: [], sameStall: false };

describe("readPickParams meal budget", () => {
  it("reads meal, and links carry it in meal mode only", () => {
    const params = readPickParams({ mode: "meal", meal: "60", max: "40" });
    expect(params.meal).toBe(60);
    expect(pickExtras(params).meal).toBe("60");
    expect(pickExtras({ ...params, mode: "dish" }).meal).toBeUndefined();
    expect(readPickParams({ mode: "meal", meal: "x" }).meal).toBeUndefined();
  });
});

describe("readPickParams", () => {
  it("defaults to a dish, fair, nothing locked or vetoed", () => {
    expect(readPickParams({})).toEqual({ mode: "dish", bias: "fair", lock: [], not: [], sameStall: false });
  });

  it("reads every parameter and drops what is invalid", () => {
    const params = readPickParams({
      seed: "K7M2QX",
      mode: "meal",
      bias: "usual",
      lock: "type,stall,bogus",
      of: "fixture-dish-a",
      not: "one,two,BAD SLUG,one",
    });
    expect(params).toEqual({
      seed: "k7m2qx",
      mode: "meal",
      bias: "usual",
      lock: ["stall", "type"],
      of: "fixture-dish-a",
      not: ["one", "two"],
      sameStall: false,
    });
  });

  it("ignores a lock without a valid previous dish, and bad modes, biases and seeds", () => {
    const params = readPickParams({ lock: "stall", of: "NOT A SLUG", mode: "x", bias: "y", seed: "no spaces!" });
    expect(params).toEqual({ mode: "dish", bias: "fair", lock: [], not: [], sameStall: false });
  });

  it("caps the vetoes so a hand edited link cannot grow without limit", () => {
    const many = Array.from({ length: 200 }, (_, i) => `dish-${i}`).join(",");
    expect(readPickParams({ not: many }).not).toHaveLength(60);
  });
});

describe("links", () => {
  it("leaves defaults out, so equal picks have equal URLs", () => {
    expect(pickExtras(base)).toEqual({ seed: "k7m2qx", mode: undefined, bias: undefined, lock: undefined, of: undefined, not: undefined });
  });

  it("carries the lock with its dish, and the vetoes", () => {
    const extras = pickExtras(base, { lock: ["stall"], of: "fixture-dish-a", not: ["x", "y"], mode: "stall", bias: "cheap" });
    expect(extras).toEqual({ seed: "k7m2qx", mode: "stall", bias: "cheap", lock: "stall", of: "fixture-dish-a", not: "x,y" });
  });

  it("drops a lock that has no dish to be relative to", () => {
    expect(pickExtras({ ...base, lock: ["stall"] }).lock).toBeUndefined();
  });

  it("keeps same=1 on a meal link, and leaves it out otherwise", () => {
    expect(readPickParams({ mode: "meal", same: "1" }).sameStall).toBe(true);
    expect(readPickParams({ mode: "meal", same: "yes" }).sameStall).toBe(false);
    expect(pickExtras({ ...base, sameStall: true }).same).toBe("1");
    expect(pickExtras(base).same).toBeUndefined();
  });

  it("builds a href that parses back to the same state", () => {
    const filters = { ...defaultFilters(), max: 50 };
    const state: PickParams = { seed: "abc123", mode: "meal", bias: "cheap", lock: ["type"], of: "fixture-dish-a", not: ["q"], sameStall: true };
    const href = pickHref("en", filters, state);
    expect(href.startsWith("/en/eat/pick?max=50&")).toBe(true);
    expect(readPickParams(new URLSearchParams(href.split("?")[1]))).toEqual(state);
  });
});

describe("bias and lock", () => {
  it("the server only honours fair and cheap", () => {
    expect(serverBias("new")).toBe("fair");
    expect(serverBias("usual")).toBe("fair");
    expect(serverBias("cheap")).toBe("cheap");
    expect(serverBias("fair")).toBe("fair");
  });

  it("builds the lock pick() takes", () => {
    expect(toPickLock(base)).toBeUndefined();
    expect(toPickLock({ lock: ["stall", "canonical"], of: "d" })).toEqual({ of: "d", stall: true, canonical: true });
  });
});

describe("chooseCombo", () => {
  const data = makeData();
  const combos = mealCombos(data, { ...defaultFilters() }, 80, { now: NOW });

  it("is reproducible and always one of the best few", () => {
    expect(combos.length).toBeGreaterThan(1);
    const a = chooseCombo(combos, "seed", []);
    const b = chooseCombo(combos, "seed", []);
    expect(a.combo).toBe(b.combo);
    expect(combos.slice(0, 10)).toContain(a.combo);
  });

  it("skips combos with a vetoed dish, and says so when it has to give the vetoes up", () => {
    const first = combos[0]!.main.slug.current;
    const skipped = chooseCombo(combos, "seed", [first], 1);
    expect(skipped.combo?.items.some((dish) => dish.slug.current === first)).toBe(false);
    expect(skipped.vetoRelaxed).toBe(false);

    const everything = [...new Set(combos.flatMap((combo) => combo.items.map((dish) => dish.slug.current)))];
    const relaxed = chooseCombo(combos, "seed", everything);
    expect(relaxed.combo).not.toBeNull();
    expect(relaxed.vetoRelaxed).toBe(true);
  });

  it("returns nothing for no combos", () => {
    expect(chooseCombo([], "seed", [])).toEqual({ combo: null, vetoRelaxed: false });
  });
});

describe("reelNames", () => {
  it("always ends on the final name, with no repeats and a cap", () => {
    const names = Array.from({ length: 30 }, (_, i) => `dish ${i}`);
    const reel = reelNames(names, "dish 7", "seed", 12);
    expect(reel).toHaveLength(12);
    expect(reel.at(-1)).toBe("dish 7");
    expect(new Set(reel).size).toBe(reel.length);
    expect(reelNames(names, "dish 7", "seed", 12)).toEqual(reel);
  });

  it("copes with one name", () => {
    expect(reelNames(["only"], "only", "s")).toEqual(["only"]);
  });
});
