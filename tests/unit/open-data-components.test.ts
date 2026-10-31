/** Chart scaling and the pagination window used by the open data components. */
import { describe, expect, it } from "vitest";
import { niceScale, px, scaleLength, wrapLabel } from "@/components/ui/chart-scale";
import { paginationWindow } from "@/components/ui/pagination-window";

describe("niceScale", () => {
  it("starts at zero and ends at or above the largest value", () => {
    for (const max of [0.7, 9, 31, 313000, 1171383.84, 1988223.24]) {
      const scale = niceScale(max);
      expect(scale.ticks[0]).toBe(0);
      expect(scale.max).toBeGreaterThanOrEqual(max);
      expect(scale.ticks.length).toBeLessThanOrEqual(7);
    }
  });

  it("uses round steps", () => {
    expect(niceScale(1171383.84).ticks).toEqual([0, 500000, 1000000, 1500000]);
    expect(niceScale(31).ticks).toEqual([0, 10, 20, 30, 40]);
    expect(niceScale(30).ticks).toEqual([0, 10, 20, 30]);
  });

  it("falls back to a unit scale for empty or invalid data", () => {
    for (const bad of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) expect(niceScale(bad).max).toBeGreaterThan(0);
  });
});

describe("scaleLength", () => {
  it("is proportional from a zero baseline", () => {
    expect(scaleLength(0, 100, 200)).toBe(0);
    expect(scaleLength(50, 100, 200)).toBe(100);
    expect(scaleLength(100, 100, 200)).toBe(200);
  });

  it("never draws a negative, non-finite or overlong bar", () => {
    expect(scaleLength(-3, 100, 200)).toBe(0);
    expect(scaleLength(Number.NaN, 100, 200)).toBe(0);
    expect(scaleLength(500, 100, 200)).toBe(200);
    expect(scaleLength(5, 0, 200)).toBe(0);
  });

  it("keeps the order of values when scaled", () => {
    const widths = [1171383.84, 313000, 216619.16, 857].map((value) => scaleLength(value, 1500000, 280));
    expect([...widths].sort((a, b) => b - a)).toEqual(widths);
  });
});

describe("wrapLabel and px", () => {
  it("wraps on spaces and never drops a word", () => {
    const lines = wrapLabel("TPC Film Club (independent group)", 20);
    expect(lines.every((line) => line.length <= 20)).toBe(true);
    expect(lines.join(" ")).toBe("TPC Film Club (independent group)");
  });

  it("leaves a short label on one line and an overlong word whole", () => {
    expect(wrapLabel("TU HOST club", 44)).toEqual(["TU HOST club"]);
    expect(wrapLabel("abcdefghijklmnop", 5)).toEqual(["abcdefghijklmnop"]);
    expect(wrapLabel("", 10)).toEqual([""]);
  });

  it("rounds to one decimal place", () => {
    expect(px(244.0432)).toBe(244);
    expect(px(65.26)).toBe(65.3);
  });
});

describe("paginationWindow", () => {
  it("lists every page when there are few", () => {
    expect(paginationWindow(1, 1)).toEqual([1]);
    expect(paginationWindow(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("puts a gap where two or more pages are skipped", () => {
    expect(paginationWindow(1, 11)).toEqual([1, 2, "gap", 11]);
    expect(paginationWindow(6, 11)).toEqual([1, "gap", 5, 6, 7, "gap", 11]);
    expect(paginationWindow(11, 11)).toEqual([1, "gap", 10, 11]);
  });

  it("shows a page instead of a gap that would hide only that page", () => {
    expect(paginationWindow(3, 11)).toEqual([1, 2, 3, 4, "gap", 11]);
    expect(paginationWindow(9, 11)).toEqual([1, "gap", 8, 9, 10, 11]);
  });

  it("clamps a current page outside the range and handles no pages", () => {
    expect(paginationWindow(99, 4)).toEqual([1, 2, 3, 4]);
    expect(paginationWindow(0, 4)).toEqual([1, 2, 3, 4]);
    expect(paginationWindow(1, 0)).toEqual([]);
  });

  it("always includes the first, last and current page", () => {
    for (let total = 1; total <= 30; total += 1) {
      for (let current = 1; current <= total; current += 1) {
        const items = paginationWindow(current, total);
        expect(items[0]).toBe(1);
        expect(items[items.length - 1]).toBe(total);
        expect(items).toContain(current);
      }
    }
  });
});
