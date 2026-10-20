import { describe, expect, it } from "vitest";

import { defaultFilters, planWeek } from "@/lib/canteen";
import {
  allPins,
  lockDay,
  parseWeekRequest,
  rerollAll,
  rerollDay,
  rerollSeed,
  unlockDay,
  weekHref,
  weekQuery,
  type PinDay,
} from "@/components/domain/canteen/budget/week-params";

import { NOW, makeData } from "./fixture";

const data = makeData();

describe("parseWeekRequest", () => {
  it("defaults to Monday to Friday and reads nothing it cannot trust", () => {
    const request = parseWeekRequest({ budget: "250", seed: "ABC123", "lock.1": "fixture-dish-a", "lock.2": "Bad Slug!" });
    expect(request.budget).toBe(250);
    expect(request.days).toEqual([1, 2, 3, 4, 5]);
    expect(request.seed).toBe("abc123");
    expect(request.locks).toEqual({ 1: "fixture-dish-a" });
  });

  it("tells no days ticked from days not given", () => {
    expect(parseWeekRequest({ budget: "100", days: [""] }).days).toEqual([]);
    expect(parseWeekRequest({ budget: "100", days: ["", "3", "1"] }).days).toEqual([1, 3]);
    expect(parseWeekRequest({ days: "0,6,1" }).days).toEqual([1, 6, 0]);
  });

  it("drops a bad budget", () => {
    expect(parseWeekRequest({ budget: "0" }).budget).toBeUndefined();
    expect(parseWeekRequest({ budget: "abc" }).budget).toBeUndefined();
    expect(parseWeekRequest({ budget: "99999" }).budget).toBeUndefined();
  });
});

describe("weekQuery", () => {
  it("round trips through parseWeekRequest", () => {
    const request = parseWeekRequest({ budget: "300", days: "1,2,3", seed: "k7m2qx", "lock.2": "a-b", "keep.3": "c-d" });
    const query = weekQuery(request, defaultFilters());
    const again = parseWeekRequest(new URLSearchParams(query));
    expect(again).toEqual(request);
    expect(weekHref("/en/eat/week", request, defaultFilters(), "week-plan")).toBe(`/en/eat/week?${query}#week-plan`);
  });
});

describe("pinning moves", () => {
  const request = parseWeekRequest({ budget: "250", days: "1,2,3,4,5", seed: "start1" });
  const result = planWeek(data, defaultFilters(), { budget: 250, days: [1, 2, 3, 4, 5], seed: "start1", now: NOW });
  if (!result.ok) throw new Error("fixture should plan");
  const plan: PinDay[] = result.days.map((day) => ({ weekday: day.weekday, slug: day.dish.slug.current, locked: day.locked }));

  it("reroll of one day changes only that day", () => {
    for (const weekday of [1, 3, 5]) {
      const next = rerollDay(request, plan, weekday);
      expect(next.seed).not.toBe(request.seed);
      expect(next.keeps[weekday]).toBeUndefined();
      expect(Object.keys(next.keeps)).toHaveLength(4);
      const again = planWeek(data, defaultFilters(), { budget: 250, days: [1, 2, 3, 4, 5], seed: next.seed!, locks: allPins(next), now: NOW });
      expect(again.ok).toBe(true);
      if (!again.ok) continue;
      for (const day of again.days) {
        if (day.weekday !== weekday) expect(day.dish.slug.current).toBe(plan.find((p) => p.weekday === day.weekday)!.slug);
      }
    }
  });

  it("lock and unlock keep the whole plan stable", () => {
    const locked = lockDay(request, plan, 2);
    expect(Object.keys(locked.locks)).toEqual(["2"]);
    expect(Object.keys(locked.keeps)).toHaveLength(4);
    const lockedPlan = plan.map((day) => ({ ...day, locked: day.weekday === 2 }));
    const unlocked = unlockDay(locked, lockedPlan, 2);
    expect(unlocked.locks).toEqual({});
    expect(Object.keys(unlocked.keeps)).toHaveLength(5);
  });

  it("reroll all keeps locks only, and the seed is derived", () => {
    const lockedPlan = plan.map((day) => ({ ...day, locked: day.weekday === 4 }));
    const next = rerollAll(request, lockedPlan);
    expect(Object.keys(next.locks)).toEqual(["4"]);
    expect(next.keeps).toEqual({});
    expect(rerollSeed("start1", 3)).toBe(rerollSeed("start1", 3));
    expect(rerollSeed("start1", 3)).not.toBe(rerollSeed("start1", 4));
  });
});
