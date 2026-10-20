import { describe, expect, it } from "vitest";

import {
  compareSemesters,
  dishPricePoints,
  excerpt,
  median,
  monthYearLabel,
  parseShowIndex,
  priceInSemester,
  ricePlateMedians,
  ricePlateSummary,
  semesterLabel,
  semesterOf,
} from "@/components/domain/canteen/extras";
import { ricePlates } from "@/lib/canteen/derive";
import type { CanteenData } from "@/lib/sanity/types";

import { makeData } from "./fixture";

describe("semesters", () => {
  it("puts August to December in semester 1 of that year", () => {
    expect(semesterOf("2026-08-01")).toEqual({ academicYear: 2026, term: 1 });
    expect(semesterOf("2026-12-31")).toEqual({ academicYear: 2026, term: 1 });
  });

  it("puts January to May in semester 2 of the academic year that began the year before", () => {
    expect(semesterOf("2027-01-01")).toEqual({ academicYear: 2026, term: 2 });
    expect(semesterOf("2027-05-31")).toEqual({ academicYear: 2026, term: 2 });
  });

  it("puts June and July in the summer session of the same academic year", () => {
    expect(semesterOf("2027-06-01")).toEqual({ academicYear: 2026, term: 3 });
    expect(semesterOf("2027-07-31")).toEqual({ academicYear: 2026, term: 3 });
    expect(semesterOf("2027-08-01")).toEqual({ academicYear: 2027, term: 1 });
  });

  it("returns null for a date it cannot read", () => {
    expect(semesterOf("")).toBeNull();
    expect(semesterOf("soon")).toBeNull();
    expect(semesterOf("2026-13-01")).toBeNull();
  });

  it("labels in the Buddhist year in Thai and as an academic year in English", () => {
    const first = semesterOf("2025-09-10")!;
    expect(semesterLabel(first, "th")).toBe("1/2568");
    expect(semesterLabel(first, "en")).toBe("1/2025-26");
    expect(semesterLabel(semesterOf("2026-02-01")!, "th")).toBe("2/2568");
    expect(semesterLabel(semesterOf("2026-02-01")!, "en")).toBe("2/2025-26");
    expect(semesterLabel(semesterOf("2026-06-15")!, "th")).toBe("ฤดูร้อน/2568");
    expect(semesterLabel(semesterOf("2026-06-15")!, "en")).toBe("Summer/2025-26");
  });

  it("rolls the English range over a century", () => {
    expect(semesterLabel({ academicYear: 2099, term: 1 }, "en")).toBe("1/2099-00");
  });

  it("orders semesters in time: 1, then 2, then summer, then the next year", () => {
    const dates = ["2027-09-01", "2026-06-10", "2026-02-01", "2025-10-01", "2026-09-01"];
    const sorted = dates.map((d) => semesterOf(d)!).sort(compareSemesters);
    expect(sorted.map((s) => `${s.academicYear}-${s.term}`)).toEqual(["2025-1", "2025-2", "2025-3", "2026-1", "2027-1"]);
  });
});

describe("median", () => {
  it("takes the middle, or the mean of the two middle values", () => {
    expect(median([45, 40, 50])).toBe(45);
    expect(median([40, 45])).toBe(42.5);
    expect(median([40])).toBe(40);
  });
});

function withHistory(data: CanteenData, id: string, history: Array<[string, number]>, price?: number, checkedOn?: string) {
  const dish = data.dishes.find((d) => d.slug.current === `fixture-dish-${id}`)!;
  dish.priceHistory = history.map(([date, p], i) => ({ _key: `k${i}`, price: p, checkedOn: date }));
  if (price !== undefined) dish.price = price;
  if (checkedOn !== undefined) dish.checkedOn = checkedOn;
  return dish;
}

describe("dish price points", () => {
  it("sorts by date and adds the current price when the history lacks it", () => {
    const data = makeData();
    const dish = withHistory(data, "a", [["2026-02-01", 35], ["2025-09-01", 30]], 40, "2026-08-01");
    expect(dishPricePoints(dish)).toEqual([
      { checkedOn: "2025-09-01", price: 30 },
      { checkedOn: "2026-02-01", price: 35 },
      { checkedOn: "2026-08-01", price: 40 },
    ]);
  });

  it("lets the history win when it disagrees about the same day", () => {
    const data = makeData();
    const dish = withHistory(data, "a", [["2026-08-01", 42]], 40, "2026-08-01");
    expect(dishPricePoints(dish)).toEqual([{ checkedOn: "2026-08-01", price: 42 }]);
  });

  it("copes with a missing history", () => {
    const data = makeData();
    const dish = data.dishes[0]!;
    dish.priceHistory = undefined;
    expect(dishPricePoints(dish)).toHaveLength(1);
  });

  it("reads the last survey inside a semester, and null where there was none", () => {
    const data = makeData();
    const dish = withHistory(data, "a", [["2025-09-01", 30], ["2025-11-20", 32], ["2026-02-01", 35]], 35, "2026-02-01");
    expect(priceInSemester(dish, semesterOf("2025-10-01")!)).toBe(32);
    expect(priceInSemester(dish, semesterOf("2026-03-01")!)).toBe(35);
    expect(priceInSemester(dish, semesterOf("2026-06-01")!)).toBeNull();
  });
});

describe("rice plate medians", () => {
  it("has one semester for a fresh dataset, so no summary", () => {
    const medians = ricePlateMedians(makeData());
    expect(medians).toHaveLength(1);
    expect(medians[0]!.count).toBe(ricePlates(makeData()).length);
    expect(ricePlateSummary(medians)).toBeNull();
  });

  it("computes a median per semester from only the dishes surveyed in it, and never carries a value forward", () => {
    const data = makeData();
    // Three rice plates surveyed in 1/2025, only two of them again in 2/2025, none in the summer.
    withHistory(data, "a", [["2025-09-01", 30], ["2026-02-01", 40]], 40, "2026-02-01");
    withHistory(data, "b", [["2025-09-02", 40], ["2026-02-02", 50]], 50, "2026-02-02");
    withHistory(data, "d", [["2025-09-03", 50]], 50, "2025-09-03");
    // Everything else leaves the rice plates out of the picture.
    for (const dish of data.dishes) {
      if (!["a", "b", "d"].some((id) => dish.slug.current === `fixture-dish-${id}`)) dish.course = "side";
    }
    const medians = ricePlateMedians(data);
    expect(medians.map((m) => [m.semester.academicYear, m.semester.term, m.median, m.count])).toEqual([
      [2025, 1, 40, 3],
      [2025, 2, 45, 2],
    ]);
    expect(medians[1]!.latestCheckedOn).toBe("2026-02-02");
    const summary = ricePlateSummary(medians)!;
    expect(summary.first.median).toBe(40);
    expect(summary.latest.median).toBe(45);
  });

  it("returns nothing for an empty canteen", () => {
    expect(ricePlateMedians(makeData({ dishes: [] }))).toEqual([]);
  });

  it("formats an axis label as month and short year", () => {
    expect(monthYearLabel("2026-08-01", "en")).toMatch(/Aug.*26/);
    expect(monthYearLabel("2026-08-01", "th")).toMatch(/69/);
  });
});

describe("text helpers", () => {
  it("excerpts the first sentence, or cuts long text at a word", () => {
    expect(excerpt("Holy basil stir-fry. Served with rice.")).toBe("Holy basil stir-fry.");
    expect(excerpt("word ".repeat(60), 40).endsWith("...")).toBe(true);
    expect(excerpt(undefined)).toBe("");
    expect(excerpt("  ")).toBe("");
  });

  it("reads a show index only when it is a whole number inside the list", () => {
    expect(parseShowIndex("0", 3)).toBe(0);
    expect(parseShowIndex("2", 3)).toBe(2);
    expect(parseShowIndex(["1", "2"], 3)).toBe(1);
    for (const bad of ["3", "-1", "1.5", "x", "", "01", undefined]) expect(parseShowIndex(bad, 3)).toBeNull();
    expect(parseShowIndex("0", 0)).toBeNull();
  });
});
