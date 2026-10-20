import { describe, expect, it } from "vitest";

import { canteenSearchRecords } from "@/lib/search/canteen";
import { canteenShortcutHref, parseCanteenShortcut } from "@/lib/search/canteenShortcut";
import { search } from "@/lib/search";

import { makeData } from "./fixture";

describe("canteen search shortcut", () => {
  it("reads a number and baht", () => {
    expect(parseCanteenShortcut("50 baht")).toEqual({ max: 50, types: [] });
    expect(parseCanteenShortcut("50baht")).toEqual({ max: 50, types: [] });
    expect(parseCanteenShortcut("฿40")).toEqual({ max: 40, types: [] });
    expect(parseCanteenShortcut("60 บาท")).toEqual({ max: 60, types: [] });
    expect(parseCanteenShortcut("60บาท")).toEqual({ max: 60, types: [] });
  });

  it("reads a dish type word before or after, in either language", () => {
    expect(parseCanteenShortcut("50 baht noodles")).toEqual({ max: 50, types: ["noodles"] });
    expect(parseCanteenShortcut("noodle 50 baht")).toEqual({ max: 50, types: ["noodles"] });
    expect(parseCanteenShortcut("Under 50 Baht Rice")).toEqual({ max: 50, types: ["rice"] });
    expect(parseCanteenShortcut("ก๋วยเตี๋ยว 50 บาท")).toEqual({ max: 50, types: ["noodles"] });
    expect(parseCanteenShortcut("ข้าว ไม่เกิน 60 บาท")).toEqual({ max: 60, types: ["rice"] });
    expect(parseCanteenShortcut("drinks 20 baht")).toEqual({ max: 20, types: ["drink"] });
  });

  it("keeps several types in canonical order", () => {
    expect(parseCanteenShortcut("soup noodles 45 baht")).toEqual({ max: 45, types: ["noodles", "soup"] });
  });

  it("does not match anything else", () => {
    for (const query of ["", "baht", "50", "50 baht fee form", "shuttle 9 baht bus", "0 baht", "99999 baht", "form 2026", "ข้าว"]) {
      expect(parseCanteenShortcut(query)).toBeNull();
    }
  });

  it("builds the dishes link in the reader's language", () => {
    expect(canteenShortcutHref("en", { max: 50, types: ["noodles"] })).toBe("/en/eat/dishes?max=50&type=noodles");
    expect(canteenShortcutHref("th", { max: 50, types: [] })).toBe("/th/eat/dishes?max=50");
  });
});

describe("canteen search records and aliases", () => {
  const data = makeData();
  const basil = data.canonicals.find((c) => c._id === "canon-basil")!;
  basil.aliases = ["krapow", "kaprao", "gaprao", "กะเพา"];
  basil.name = { th: "ข้าวกะเพรา", en: "Holy basil stir-fry" };
  basil.explainer = { th: "ผัดกะเพราใส่พริก", en: "Stir-fried holy basil with chilli." };
  const records = canteenSearchRecords(data);

  it("makes one record per canonical dish and per dish, with locale paths", () => {
    expect(records).toHaveLength(data.canonicals.length + data.dishes.length);
    const canonical = records.find((r) => r.id === "canon-basil")!;
    expect(canonical.type).toBe("canonicalDish");
    expect(canonical.path).toEqual({ th: "/th/eat/what-is/fixture-basil", en: "/en/eat/what-is/fixture-basil" });
    const dish = records.find((r) => r.id === "dish-a")!;
    expect(dish.type).toBe("canteenDish");
    expect(dish.path.en).toBe("/en/eat/dishes/fixture-dish-a");
  });

  it("shows a dish price with its checked date, not as a bare figure", () => {
    const dish = records.find((r) => r.id === "dish-a")!;
    expect(dish.summary.en).toMatch(/40 baht, checked 1 August 2026/);
    expect(dish.summary.th).toMatch(/40 บาท ตรวจเมื่อ/);
  });

  it("finds the same dishes whichever spelling is typed", () => {
    const ids = (query: string) => search(query, records).filter((r) => r.record.type === "canteenDish" && r.record.haystack.includes("krapow")).map((r) => r.record.id).sort();
    const expected = ["dish-a", "dish-b", "dish-j", "dish-s"];
    expect(ids("krapow")).toEqual(expected);
    expect(ids("kaprao")).toEqual(expected);
    expect(ids("gaprao")).toEqual(expected);
    expect(ids("กะเพา")).toEqual(expected);
  });

  it("finds the explainer by an alias, and by the Thai name", () => {
    expect(search("kaprao", records)[0]?.record.type).toBeDefined();
    expect(search("kaprao", records).some((r) => r.record.id === "canon-basil")).toBe(true);
    expect(search("กะเพรา", records).some((r) => r.record.id === "canon-basil")).toBe(true);
  });

  it("does not leak aliases onto dishes of another canonical dish", () => {
    expect(search("krapow", records).some((r) => r.record.id === "dish-e")).toBe(false);
  });

  it("gives an empty list for an empty canteen", () => {
    expect(canteenSearchRecords(makeData({ dishes: [], canonicals: [], stalls: [] }))).toEqual([]);
  });
});
