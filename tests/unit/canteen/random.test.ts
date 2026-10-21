import { describe, expect, it } from "vitest";

import { createRng, defaultFilters, hashSeed, mulberry32, newSeed, pick, pickSuggested, shuffle, suggestedPool, type CanteenFilters, type PickOptions } from "@/lib/canteen";

import { NOW, makeData } from "./fixture";

const data = makeData();
const f = (change: Partial<CanteenFilters> = {}): CanteenFilters => ({ ...defaultFilters(), ...change });
const opts = (seed: string, more: Partial<PickOptions> = {}): PickOptions => ({ seed, now: NOW, ...more });
const id = (result: ReturnType<typeof pick>) => result.dish?.slug.current.replace("fixture-dish-", "");

describe("seeded randomness", () => {
  it("hashes and generates deterministically", () => {
    expect(hashSeed("abc")).toBe(hashSeed("abc"));
    expect(hashSeed("abc")).not.toBe(hashSeed("abd"));
    const a = createRng("seed");
    const b = createRng("seed");
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    const values = Array.from({ length: 500 }, mulberry32(42));
    expect(values.every((v) => v >= 0 && v < 1)).toBe(true);
    expect(new Set(values).size).toBeGreaterThan(490);
  });

  it("newSeed is short and readable, and reproducible with an injected rng", () => {
    expect(newSeed(createRng("x"))).toBe(newSeed(createRng("x")));
    expect(newSeed()).toMatch(/^[a-km-np-z2-9]{6}$/);
  });

  it("shuffle keeps every element", () => {
    const shuffled = shuffle([1, 2, 3, 4, 5, 6], createRng("s"));
    expect([...shuffled].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe("pick", () => {
  it("gives the same dish for the same inputs", () => {
    for (const seed of ["a", "k7m2qx", "ก"]) {
      expect(id(pick(data, f(), opts(seed)))).toBe(id(pick(data, f(), opts(seed))));
    }
  });

  it("does not depend on the order the CMS returned the dishes in", () => {
    const reversed = { ...data, dishes: [...data.dishes].reverse() };
    for (const seed of ["a", "b", "c", "d", "e", "f"]) {
      expect(id(pick(reversed, f(), opts(seed)))).toBe(id(pick(data, f(), opts(seed))));
    }
  });

  it("varies with the seed", () => {
    const picked = new Set(Array.from({ length: 40 }, (_, i) => id(pick(data, f(), opts(`seed-${i}`)))));
    expect(picked.size).toBeGreaterThan(6);
  });

  it("only picks main courses unless types are chosen, and always honours the filters", () => {
    for (let i = 0; i < 60; i += 1) {
      const result = pick(data, f({ diet: ["nopork"], max: 45 }), opts(`m${i}`));
      expect(result.dish!.course).toBe("main");
      expect(result.dish!.protein).not.toContain("pork");
      expect(result.dish!.price).toBeLessThanOrEqual(45);
    }
    expect(pick(data, f({ type: ["drink"] }), opts("d")).dish?.type).toBe("drink");
  });

  it("fair bias is uniform over stalls, so a big stall does not dominate", () => {
    // Main courses by stall: 4, 4, 3, 2, 3 dishes at five stalls. Flat uniform would give stall 4 about 12%.
    const tally = new Map<string, number>();
    const runs = 2000;
    for (let i = 0; i < runs; i += 1) {
      const result = pick(data, f(), opts(`fair-${i}`, { bias: "fair" }));
      tally.set(result.stall!.slug.current, (tally.get(result.stall!.slug.current) ?? 0) + 1);
    }
    expect(tally.size).toBe(5);
    for (const count of tally.values()) expect(Math.abs(count / runs - 0.2)).toBeLessThan(0.04);
  });

  it("cheap bias lowers the average price and usual bias favours favourites", () => {
    const mean = (bias: PickOptions["bias"], more: Partial<PickOptions> = {}) => {
      let sum = 0;
      for (let i = 0; i < 600; i += 1) sum += pick(data, f(), opts(`b-${i}`, { bias, ...more })).dish!.price;
      return sum / 600;
    };
    expect(mean("cheap")).toBeLessThan(mean("fair"));

    let favouriteHits = 0;
    let baselineHits = 0;
    for (let i = 0; i < 600; i += 1) {
      if (pick(data, f(), opts(`u-${i}`, { bias: "usual", favourites: ["fixture-dish-k"] })).dish!.slug.current === "fixture-dish-k") favouriteHits += 1;
      if (pick(data, f(), opts(`u-${i}`, { bias: "usual" })).dish!.slug.current === "fixture-dish-k") baselineHits += 1;
    }
    expect(favouriteHits).toBeGreaterThan(baselineHits * 2);
  });

  it("new bias eats less of what is in the history", () => {
    const history = [{ slug: "fixture-dish-a", at: "2025-01-01T00:00:00Z" }, { slug: "fixture-dish-a", at: "2025-01-02T00:00:00Z" }];
    let withHistory = 0;
    let without = 0;
    for (let i = 0; i < 800; i += 1) {
      if (pick(data, f({ stall: "fixture-stall-1" }), opts(`n-${i}`, { bias: "new", history })).dish!.slug.current === "fixture-dish-a") withHistory += 1;
      if (pick(data, f({ stall: "fixture-stall-1" }), opts(`n-${i}`, { bias: "new" })).dish!.slug.current === "fixture-dish-a") without += 1;
    }
    expect(withHistory).toBeLessThan(without);
  });

  it("avoids recently eaten dishes", () => {
    const history = [{ slug: "fixture-dish-a", at: "2026-08-09T12:00:00+07:00" }];
    for (let i = 0; i < 100; i += 1) {
      const result = pick(data, f({ stall: "fixture-stall-1" }), opts(`r-${i}`, { history }));
      expect(id(result)).not.toBe("a");
      expect(result.relaxed).toBeNull();
    }
  });

  it("relaxes repeat avoidance first, and says so, when it would leave nothing", () => {
    const only = f({ stall: "fixture-stall-4", max: 40 }); // just dish l
    const recent = [{ slug: "fixture-dish-l", at: "2026-08-10T08:00:00+07:00" }];
    const result = pick(data, only, opts("x", { history: recent }));
    expect(id(result)).toBe("l");
    expect(result.relaxed).toEqual(["repeat"]);

    const old = [{ slug: "fixture-dish-l", at: "2026-08-01T08:00:00+07:00" }];
    expect(pick(data, only, opts("x", { history: old })).relaxed).toBeNull();
    expect(pick(data, only, opts("x", { history: recent, avoidRepeatDays: 0 })).relaxed).toBeNull();
  });

  it("never relaxes the student's filters or dislikes", () => {
    const only = f({ stall: "fixture-stall-4", max: 40 });
    const result = pick(data, only, opts("x", { dislikes: ["fixture-dish-l"] }));
    expect(result.dish).toBeNull();
    expect(result.reason.code).toBe("noMatches");
    expect(pick(data, f({ diet: ["halal"], max: 40 }), opts("x")).dish).toBeNull();
  });

  it("honours vetoes, relaxing them only as a last resort", () => {
    const s4 = f({ stall: "fixture-stall-4" }); // mains l and m
    for (let i = 0; i < 30; i += 1) expect(id(pick(data, s4, opts(`v${i}`, { not: ["fixture-dish-l"] })))).toBe("m");
    const all = pick(data, s4, opts("v", { not: ["fixture-dish-l", "fixture-dish-m"] }));
    expect(all.dish).not.toBeNull();
    expect(all.relaxed).toEqual(["veto"]);
  });

  it("locks the stall, the type or the canonical dish relative to a previous dish", () => {
    for (let i = 0; i < 40; i += 1) {
      const sameStall = pick(data, f(), opts(`l${i}`, { lock: { of: "fixture-dish-a", stall: true } }));
      expect(sameStall.dish!.stall._ref).toBe("stall-1");
      expect(id(sameStall)).not.toBe("a");

      const sameType = pick(data, f(), opts(`l${i}`, { lock: { of: "fixture-dish-e", type: true } }));
      expect(sameType.dish!.type).toBe("noodles");
      expect(id(sameType)).not.toBe("e");

      const sameCanonical = pick(data, f(), opts(`l${i}`, { lock: { of: "fixture-dish-a", canonical: true } }));
      expect(sameCanonical.dish!.canonical?._ref).toBe("canon-basil");
      expect(sameCanonical.reason.locks).toEqual(["canonical"]);
    }
  });

  it("relaxes the lock when it leaves nothing, and ignores a lock on an unknown dish", () => {
    const result = pick(data, f({ max: 35 }), opts("x", { lock: { of: "fixture-dish-d", stall: true } }));
    expect(id(result)).toBe("d");
    expect(result.relaxed).toEqual(["lock"]);
    expect(pick(data, f(), opts("x", { lock: { of: "nope", stall: true } })).relaxed).toBeNull();
  });

  it("explains itself: bias, locks and the active filters", () => {
    const result = pick(data, f({ max: 50, diet: ["nopork"] }), opts("x", { bias: "cheap" }));
    expect(result.reason).toEqual({ code: "matched", bias: "cheap", locks: [], filters: ["max", "diet"] });
    expect(result.poolSize).toBeGreaterThan(0);
  });

  it("returns null cleanly on an empty dataset", () => {
    const result = pick({ settings: null, stalls: [], dishes: [], canonicals: [] }, f(), opts("x"));
    expect(result).toMatchObject({ dish: null, stall: null, relaxed: null, poolSize: 0 });
  });
});

describe("pickSuggested", () => {
  const mains = data.dishes.filter((dish) => dish.course === "main");

  it("only offers main courses, one per stall", () => {
    const chosen = pickSuggested(data.dishes, 50, "abc");
    expect(chosen.length).toBeGreaterThan(0);
    expect(chosen.every((dish) => dish.course === "main")).toBe(true);
    expect(new Set(chosen.map((dish) => dish.stall._ref)).size).toBe(chosen.length);
  });

  it("respects the count", () => {
    expect(pickSuggested(data.dishes, 2, "abc")).toHaveLength(2);
    expect(pickSuggested(data.dishes, 0, "abc")).toHaveLength(0);
  });

  it("is reproducible and independent of input order", () => {
    const ids = (seed: string, list = data.dishes) => pickSuggested(list, 3, seed).map((dish) => dish._id);
    expect(ids("abc")).toEqual(ids("abc"));
    expect(ids("abc", [...data.dishes].reverse())).toEqual(ids("abc"));
  });

  it("differs between seeds", () => {
    const draws = new Set(["a", "b", "c", "d", "e", "f"].map((seed) => pickSuggested(mains, 3, seed).map((dish) => dish._id).join()));
    expect(draws.size).toBeGreaterThan(1);
  });

  it("builds a pool of at most perStall mains per stall", () => {
    const pool = suggestedPool(data.dishes, 2, "abc");
    const perStall = new Map<string, number>();
    for (const dish of pool) perStall.set(dish.stall._ref, (perStall.get(dish.stall._ref) ?? 0) + 1);
    expect(pool.every((dish) => dish.course === "main")).toBe(true);
    expect(Math.max(...perStall.values())).toBeLessThanOrEqual(2);
  });
});
