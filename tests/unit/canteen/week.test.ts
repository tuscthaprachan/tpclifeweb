import { describe, expect, it } from "vitest";

import { defaultFilters, planWeek, type CanteenFilters, type WeekResult } from "@/lib/canteen";

import { NOW, makeData } from "./fixture";

const data = makeData();
const f = (change: Partial<CanteenFilters> = {}): CanteenFilters => ({ ...defaultFilters(), ...change });
const WEEKDAYS = [1, 2, 3, 4, 5];

function plan(seed: string, more: Partial<Parameters<typeof planWeek>[2]> = {}, filters = f()): WeekResult {
  return planWeek(data, filters, { budget: 250, days: WEEKDAYS, seed, now: NOW, ...more });
}

describe("planWeek", () => {
  it("plans one lunch per day within budget, with no stall or canonical dish twice", () => {
    for (let i = 0; i < 60; i += 1) {
      const result = plan(`w${i}`);
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(result.days.map((d) => d.weekday)).toEqual(WEEKDAYS);
      expect(result.total).toBeLessThanOrEqual(250);
      expect(result.change).toBe(250 - result.total);
      expect(result.allowance).toBe(50);
      expect(new Set(result.days.map((d) => d.stall._id)).size).toBe(5);
      const canonicals = result.days.flatMap((d) => (d.dish.canonicalId ? [d.dish.canonicalId] : []));
      expect(new Set(canonicals).size).toBe(canonicals.length);
      expect(result.days.every((d) => d.dish.course === "main")).toBe(true);
    }
  });

  it("respects the filters", () => {
    const result = plan("w", { days: [1, 2, 3, 4] }, f({ diet: ["nopork"], avoid: ["egg"] }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      for (const day of result.days) {
        expect(day.dish.protein).not.toContain("pork");
        expect(day.dish.protein).not.toContain("egg");
      }
    }
  });

  it("is deterministic for a seed and varies across seeds", () => {
    const key = (r: WeekResult) => (r.ok ? r.days.map((d) => d.dish.slug.current).join("|") : r.reason);
    expect(key(plan("same"))).toBe(key(plan("same")));
    expect(new Set(Array.from({ length: 25 }, (_, i) => key(plan(`v${i}`)))).size).toBeGreaterThan(3);
  });

  it("orders days Monday first even when given Sunday first", () => {
    const result = plan("s", { days: [0, 6, 3] });
    expect(result.ok && result.days.map((d) => d.weekday)).toEqual([3, 6, 0]);
  });

  it("keeps locked days and plans the rest around them", () => {
    const first = plan("a");
    if (!first.ok) throw new Error("expected a plan");
    const locks = Object.fromEntries(first.days.filter((d) => d.weekday !== 3).map((d) => [d.weekday, d.dish.slug.current]));
    for (let i = 0; i < 20; i += 1) {
      const reroll = plan(`re${i}`, { locks });
      expect(reroll.ok).toBe(true);
      if (!reroll.ok) continue;
      for (const day of reroll.days) expect(day.locked).toBe(day.weekday !== 3);
      expect(reroll.days.filter((d) => d.weekday !== 3).map((d) => d.dish.slug.current)).toEqual(first.days.filter((d) => d.weekday !== 3).map((d) => d.dish.slug.current));
      expect(new Set(reroll.days.map((d) => d.stall._id)).size).toBe(5);
    }
  });

  it("explains why a plan is impossible", () => {
    expect(plan("x", { days: [] })).toEqual({ ok: false, reason: "noDays" });
    expect(plan("x", { days: [7] })).toEqual({ ok: false, reason: "badDays" });
    expect(plan("x", { days: [0, 1, 2, 3, 4, 5] })).toEqual({ ok: false, reason: "notEnoughStalls" }); // 5 stalls sell mains
    expect(plan("x", { budget: 150 })).toEqual({ ok: false, reason: "budgetTooLow" });
    expect(plan("x", { locks: { 1: "no-such-dish" } })).toEqual({ ok: false, reason: "unknownLock" });
    expect(plan("x", { locks: { 1: "fixture-dish-a", 2: "fixture-dish-b" } })).toEqual({ ok: false, reason: "lockConflict" }); // same stall
    expect(plan("x", { locks: { 1: "fixture-dish-a", 2: "fixture-dish-j", 3: "fixture-dish-s" } })).toEqual({ ok: false, reason: "lockConflict" }); // basil twice
    expect(plan("x", { days: [1, 2], budget: 200 }, f({ diet: ["halal"] }))).toEqual({ ok: false, reason: "notEnoughStalls" });
  });

  it("blames the budget, not the stall count, when stalls would suffice at a higher price", () => {
    expect(plan("x", { days: [1], budget: 20 })).toEqual({ ok: false, reason: "budgetTooLow" });
    expect(plan("x", { days: [1, 2], budget: 60 })).toEqual({ ok: false, reason: "budgetTooLow" });
  });

  it("ignores a skip when no other plan fits", () => {
    const only = plan("x", { days: [1], budget: 35 });
    if (!only.ok) throw new Error("expected a plan");
    const slug = only.days[0]!.dish.slug.current;
    expect(plan("x", { days: [1], budget: 35, skips: { 1: slug } })).toEqual(only);
    const roomy = plan("x", { days: [1], budget: 100, skips: { 1: slug } });
    expect(roomy.ok && roomy.days[0]!.dish.slug.current).not.toBe(slug);
  });

  it("finds a tight plan by search, not luck", () => {
    // Cheapest main per stall: 35 + 40 + 45 + 40 + 38 = 198. A budget of 198 has exactly one answer set.
    for (let i = 0; i < 10; i += 1) {
      const result = plan(`t${i}`, { budget: 198 });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.total).toBe(198);
    }
  });

  it("counts the dearest variant under variants=true", () => {
    const options = { days: [1, 2], budget: 90, locks: { 1: "fixture-dish-b" } };
    expect(plan("v", options).ok).toBe(true); // 45 + the cheapest other stall, 38
    expect(plan("v", options, f({ variants: true }))).toEqual({ ok: false, reason: "budgetTooLow" }); // 55 + 38 > 90
  });
});
