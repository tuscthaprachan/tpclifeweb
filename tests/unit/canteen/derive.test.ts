import { describe, expect, it } from "vitest";

import {
  bangkokTime,
  cheapestInCanonical,
  closesAt,
  dishesInCanonical,
  effectivePrice,
  emptyCanteenData,
  indexCanteen,
  isJayFestival,
  isOpenNow,
  meetsDiet,
  medianPrice,
  medianRicePrice,
  noPork,
  normaliseCanteenData,
  stallOf,
  weekStartKey,
} from "@/lib/canteen";
import type { CanteenData, CanteenDish } from "@/lib/sanity/types";

import { NOW, makeData, slugs } from "./fixture";

function dishById(data: CanteenData, id: string): CanteenDish {
  return data.dishes.find((d) => d.slug.current === `fixture-dish-${id}`)!;
}

describe("derive: data", () => {
  it("emptyCanteenData is valid and empty", () => {
    expect(emptyCanteenData()).toEqual({ settings: null, stalls: [], dishes: [], canonicals: [] });
  });

  it("normaliseCanteenData fills gaps and drops dishes with a dangling stall", () => {
    const data = makeData();
    const orphan = { ...dishById(data, "a"), _id: "orphan", slug: { _type: "slug" as const, current: "orphan" }, stall: { _type: "reference" as const, _ref: "no-such-stall" } };
    const noArrays = { ...dishById(data, "b"), protein: undefined as unknown as CanteenDish["protein"], variants: undefined };
    const result = normaliseCanteenData({ ...data, dishes: [orphan, noArrays] });
    expect(result.dishes).toHaveLength(1);
    expect(result.dishes[0]!.protein).toEqual([]);
    expect(result.dishes[0]!.variants).toEqual([]);
  });

  it("normaliseCanteenData accepts null and partial input", () => {
    expect(normaliseCanteenData(null)).toEqual(emptyCanteenData());
    expect(normaliseCanteenData({})).toEqual(emptyCanteenData());
  });

  it("indexes once per dataset and joins dishes to stalls", () => {
    const data = makeData();
    expect(indexCanteen(data)).toBe(indexCanteen(data));
    expect(stallOf(data, dishById(data, "e"))?.number).toBe(2);
  });

  it("orders stalls by stall number, whatever the floor plan says, and ties by name", () => {
    const data = makeData();
    data.stalls[0]!.mapCell = { col: 0, row: 5, w: 1, h: 1 };
    expect(indexCanteen(data).stallsInWalkOrder.map((s) => s.number)).toEqual([1, 2, 3, 4, 5, 6]);
    const tied = makeData();
    tied.stalls[1]!.number = 1;
    expect(indexCanteen(tied).stallsInWalkOrder.slice(0, 2).map((s) => s.name.en)).toEqual(["Fixture stall 1", "Fixture stall 2"]);
  });
});

describe("derive: diet", () => {
  const data = makeData();

  it("noPork reads the recorded proteins", () => {
    expect(noPork(dishById(data, "a"))).toBe(false);
    expect(noPork(dishById(data, "b"))).toBe(true);
  });

  it("halal comes from the stall, and certified is stronger than stall says", () => {
    const e = dishById(data, "e");
    const i = dishById(data, "i");
    expect(meetsDiet(e, stallOf(data, e)!, "halal")).toBe(true);
    expect(meetsDiet(e, stallOf(data, e)!, "certified")).toBe(false);
    expect(meetsDiet(i, stallOf(data, i)!, "certified")).toBe(true);
  });

  it("canAsk counts for vegetarian, vegan and jay, and a vegetarian stall implies vegetarian only", () => {
    const d = dishById(data, "d");
    const m = dishById(data, "m");
    expect(meetsDiet(d, stallOf(data, d)!, "vegetarian")).toBe(true);
    expect(meetsDiet(m, stallOf(data, m)!, "vegan")).toBe(true);
    const stall4 = data.stalls.find((s) => s.number === 4)!;
    const plain = { ...dishById(data, "l"), vegetarian: "no" as const, vegan: "no" as const, jay: "no" as const };
    expect(meetsDiet(plain, stall4, "vegetarian")).toBe(true);
    expect(meetsDiet(plain, stall4, "vegan")).toBe(false);
    expect(meetsDiet(plain, stall4, "jay")).toBe(false);
  });
});

describe("derive: time in Asia/Bangkok", () => {
  const data = makeData();
  const stall = (n: number) => data.stalls.find((s) => s.number === n)!;

  it("reads the Bangkok clock whatever the server zone is", () => {
    expect(bangkokTime(new Date("2026-08-09T18:00:00Z"))).toEqual({ dateKey: "2026-08-10", weekday: 1, minutes: 60 });
  });

  it("starts the week on Monday in Bangkok", () => {
    expect(weekStartKey(new Date("2026-08-10T00:00:00+07:00"))).toBe("2026-08-10");
    expect(weekStartKey(new Date("2026-08-09T23:59:00+07:00"))).toBe("2026-08-03");
    expect(weekStartKey(new Date("2026-08-09T18:00:00Z"))).toBe("2026-08-10");
  });

  it("uses the canteen hours unless the stall has its own", () => {
    expect(isOpenNow(data.settings, stall(1), NOW)).toBe(true);
    expect(isOpenNow(data.settings, stall(4), NOW)).toBe(false); // own hours start at 10:00
    expect(isOpenNow(data.settings, stall(4), new Date("2026-08-10T10:30:00+07:00"))).toBe(true);
    expect(isOpenNow(data.settings, stall(1), new Date("2026-08-15T09:00:00+07:00"))).toBe(false); // Saturday
    expect(isOpenNow(data.settings, stall(1), new Date("2026-08-10T15:00:00+07:00"))).toBe(false); // closes at 15:00
  });

  it("says unknown, not closed, when no hours are recorded", () => {
    expect(isOpenNow(null, stall(1), NOW)).toBeNull();
    expect(isOpenNow({ ...data.settings!, canteen: { _type: "reference", _ref: "x" } }, stall(1), NOW)).toBeNull();
  });

  it("reports the closing time while open", () => {
    expect(closesAt(data.settings, stall(1), NOW)).toBe("15:00");
    expect(closesAt(data.settings, stall(1), new Date("2026-08-10T16:00:00+07:00"))).toBeNull();
  });

  it("knows the jay festival window, inclusive", () => {
    expect(isJayFestival(data.settings, new Date("2026-10-18T00:00:00+07:00"))).toBe(true);
    expect(isJayFestival(data.settings, new Date("2026-10-26T23:00:00+07:00"))).toBe(true);
    expect(isJayFestival(data.settings, new Date("2026-10-27T00:00:00+07:00"))).toBe(false);
    expect(isJayFestival(null, NOW)).toBe(false);
  });
});

describe("derive: prices", () => {
  const data = makeData();

  it("effectivePrice adds the dearest variant only on request", () => {
    const b = dishById(data, "b");
    expect(effectivePrice(b, false)).toBe(45);
    expect(effectivePrice(b, true)).toBe(55);
    expect(effectivePrice(dishById(data, "a"), true)).toBe(40);
  });

  it("medianPrice handles odd, even and empty", () => {
    const [a, b, c] = ["a", "b", "c"].map((id) => dishById(data, id)) as [CanteenDish, CanteenDish, CanteenDish];
    expect(medianPrice([a, b, c])).toBe(45);
    expect(medianPrice([a, b])).toBe(42.5);
    expect(medianPrice([])).toBeNull();
  });

  it("computes the typical rice plate from main rice-type dishes", () => {
    expect(medianRicePrice(data)).toBe(45);
    expect(medianRicePrice(emptyCanteenData())).toBeNull();
  });

  it("finds the cheapest dish and the comparison list for a canonical dish", () => {
    expect(slugs(dishesInCanonical(data, "canon-basil"))).toEqual(["a", "b", "j", "s"]);
    expect(cheapestInCanonical(data, "canon-basil")?.slug.current).toBe("fixture-dish-a");
    expect(cheapestInCanonical(data, "nope")).toBeNull();
  });
});
