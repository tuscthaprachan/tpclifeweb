/** The small-number rule and the category grouping that keeps restricted rows from being found by subtraction. */
import { describe, expect, it } from "vitest";
import { MIN_CASES, countMeasure, groupCategoryCounts, measure, shareMeasure, type CategoryCount } from "@/lib/performance/suppress";

const cat = (key: string, n: number, restricted = false): CategoryCount => ({ key, nameTh: key, nameEn: key, restricted, n });

describe("measure", () => {
  it("hides a figure based on fewer than five cases and carries no number", () => {
    expect(MIN_CASES).toBe(5);
    for (const n of [0, 1, 4]) expect(measure(n, 42)).toEqual({ suppressed: true });
    expect(JSON.stringify(measure(4, 42))).not.toContain("42");
  });

  it("shows a figure from five cases up, with its base", () => {
    expect(measure(5, 42)).toEqual({ suppressed: false, n: 5, value: 42 });
  });

  it("hides a figure with no value", () => {
    expect(measure(50, null)).toEqual({ suppressed: true });
  });

  it("a count is hidden when it is itself below five", () => {
    expect(countMeasure(4)).toEqual({ suppressed: true });
    expect(countMeasure(5)).toMatchObject({ suppressed: false, value: 5 });
  });

  it("a share rounds to a whole percentage and is hidden on a small base", () => {
    expect(shareMeasure(2, 3)).toEqual({ suppressed: true });
    expect(shareMeasure(2, 6)).toMatchObject({ suppressed: false, n: 6, value: 33 });
    expect(shareMeasure(0, 0)).toEqual({ suppressed: true });
  });
});

describe("groupCategoryCounts", () => {
  it("names an ordinary category with five or more and folds the rest into Other", () => {
    const rows = groupCategoryCounts([cat("a", 12), cat("b", 6), cat("c", 3), cat("d", 3)]);
    expect(rows).toEqual([
      { type: "category", key: "a", nameTh: "a", nameEn: "a", n: 12 },
      { type: "category", key: "b", nameTh: "b", nameEn: "b", n: 6 },
      { type: "pool", pool: "other", n: 6 },
    ]);
  });

  it("never names a restricted category, however large", () => {
    const rows = groupCategoryCounts([cat("a", 10), cat("harassment", 20, true), cat("safety", 9, true)]);
    expect(rows).toEqual([
      { type: "category", key: "a", nameTh: "a", nameEn: "a", n: 10 },
      { type: "pool", pool: "sensitive", n: 29 },
    ]);
    expect(JSON.stringify(rows)).not.toContain("harassment");
    expect(JSON.stringify(rows)).not.toContain("safety");
  });

  it("merges a sensitive pool below five with the others so no row is below five", () => {
    const rows = groupCategoryCounts([cat("a", 10), cat("harassment", 2, true), cat("c", 4)]);
    expect(rows).toEqual([
      { type: "category", key: "a", nameTh: "a", nameEn: "a", n: 10 },
      { type: "pool", pool: "sensitive_other", n: 6 },
    ]);
  });

  it("folds the smallest named category in when the merged pool is still below five", () => {
    const rows = groupCategoryCounts([cat("a", 10), cat("b", 5), cat("harassment", 2, true)]);
    expect(rows).toEqual([
      { type: "category", key: "a", nameTh: "a", nameEn: "a", n: 10 },
      { type: "pool", pool: "sensitive_other", n: 7 },
    ]);
  });

  it("a small sensitive count alone cannot be found by subtracting the named rows from the total", () => {
    const input = [cat("a", 10), cat("b", 8), cat("harassment", 3, true)];
    const total = 21;
    const rows = groupCategoryCounts(input);
    const named = rows.filter((r) => r.type === "category").reduce((sum, r) => sum + r.n, 0);
    // Whatever is left over is at least five, so it does not isolate the three.
    expect(total - named).toBeGreaterThanOrEqual(MIN_CASES);
    expect(rows.every((r) => r.n >= MIN_CASES)).toBe(true);
  });

  it("returns nothing when the total is below five", () => {
    expect(groupCategoryCounts([cat("a", 2), cat("harassment", 2, true)])).toEqual([]);
  });

  it("every returned row is five or more for any mix of counts", () => {
    for (let a = 0; a <= 7; a++)
      for (let b = 0; b <= 7; b++)
        for (let s = 0; s <= 7; s++) {
          const rows = groupCategoryCounts([cat("a", a), cat("b", b), cat("harassment", s, true)]);
          expect(rows.every((r) => r.n >= MIN_CASES), `${a} ${b} ${s}`).toBe(true);
          if (a + b + s >= MIN_CASES) expect(rows.reduce((sum, r) => sum + r.n, 0)).toBe(a + b + s);
        }
  });
});
