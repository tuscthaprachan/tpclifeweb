import { describe, expect, it } from "vitest";

import { defaultFilters, planWeek } from "@/lib/canteen";
import {
  allPins,
  lockDay,
  parseWeekRequest,
  rerollAll,
  rerollDay,
  rerollSeed,
  skippedDishes,
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
    expect(request.pins).toEqual({ 1: { mode: "lock", slug: "fixture-dish-a" } });
    expect(allPins(request)).toEqual({ 1: "fixture-dish-a" });
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
    expect(query.startsWith("mode=week")).toBe(true);
    expect(weekHref("/en/eat/plan", request, defaultFilters(), "week-plan")).toBe(`/en/eat/plan?${query}#week-plan`);
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
      expect(next.pins[weekday]?.mode).toBe("free");
      expect(Object.keys(allPins(next))).toHaveLength(4);
      const again = planWeek(data, defaultFilters(), { budget: 250, days: [1, 2, 3, 4, 5], seed: next.seed!, locks: allPins(next), now: NOW });
      expect(again.ok).toBe(true);
      if (!again.ok) continue;
      for (const day of again.days) {
        if (day.weekday !== weekday) expect(day.dish.slug.current).toBe(plan.find((p) => p.weekday === day.weekday)!.slug);
      }
    }
  });

  it("reroll moves the day off its current dish, and the skip survives a round trip through the URL", () => {
    for (const weekday of [1, 2, 3, 4, 5]) {
      const next = rerollDay(request, plan, weekday);
      const current = plan.find((p) => p.weekday === weekday)!.slug;
      expect(skippedDishes(next)).toEqual({ [weekday]: current });
      const reread = parseWeekRequest(new URLSearchParams(weekQuery(next, defaultFilters())));
      expect(skippedDishes(reread)).toEqual({ [weekday]: current });
      const again = planWeek(data, defaultFilters(), { budget: 400, days: [1, 2, 3, 4, 5], seed: reread.seed!, locks: allPins(reread), skips: skippedDishes(reread), now: NOW });
      expect(again.ok).toBe(true);
      if (again.ok) expect(again.days.find((d) => d.weekday === weekday)!.dish.slug.current).not.toBe(current);
    }
    expect(skippedDishes(lockDay(rerollDay(request, plan, 2), plan, 3))).toEqual({});
  });

  it("lock and unlock keep the whole plan stable", () => {
    const locked = lockDay(request, plan, 2);
    expect(locked.pins[2]).toEqual({ mode: "lock", slug: plan.find((d) => d.weekday === 2)!.slug });
    expect(Object.values(locked.pins).filter((pin) => pin.mode === "keep")).toHaveLength(4);
    const lockedPlan = plan.map((day) => ({ ...day, locked: day.weekday === 2 }));
    const unlocked = unlockDay(locked, lockedPlan, 2);
    expect(Object.values(unlocked.pins).filter((pin) => pin.mode === "lock")).toHaveLength(0);
    expect(Object.values(unlocked.pins).filter((pin) => pin.mode === "keep")).toHaveLength(5);
  });

  it("reroll all keeps locks only, and the seed is derived", () => {
    const lockedPlan = plan.map((day) => ({ ...day, locked: day.weekday === 4 }));
    const next = rerollAll(request, lockedPlan);
    expect(Object.keys(next.pins)).toEqual(["4"]);
    expect(next.pins[4]?.mode).toBe("lock");
    expect(rerollSeed("start1", 3)).toBe(rerollSeed("start1", 3));
    expect(rerollSeed("start1", 3)).not.toBe(rerollSeed("start1", 4));
  });

  it("cannot represent a lock and a skip on the same day", () => {
    const request = parseWeekRequest({ "lock.2": "a-b", "skip.2": "c-d", "keep.3": "e-f", "skip.3": "g-h", "skip.4": "i-j" });
    expect(request.pins).toEqual({ 2: { mode: "lock", slug: "a-b" }, 3: { mode: "keep", slug: "e-f" }, 4: { mode: "free", skip: "i-j" } });
    expect(skippedDishes(request)).toEqual({ 4: "i-j" });
    expect(weekQuery(request, defaultFilters())).toBe("mode=week&days=1,2,3,4,5&lock.2=a-b&keep.3=e-f&skip.4=i-j");
  });
});
