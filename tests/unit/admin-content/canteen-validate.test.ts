import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { validateCanonicalForm } from "@/app/admin/content/canonical-dishes/validate";
import { planPrice } from "@/app/admin/content/canteen-dishes/price";
import { validateDishForm } from "@/app/admin/content/canteen-dishes/validate";
import { validateCanteenSettingsForm } from "@/app/admin/content/canteen-settings/validate";
import { parsePriceForm } from "@/app/admin/content/canteen-stalls/prices";
import { validateStallForm } from "@/app/admin/content/canteen-stalls/validate";
import { surveyCanteenData } from "@/lib/canteen/dataset";
import { canonicalDishes, canteenDishes, canteenStallAddOns, canteenStalls } from "@/lib/db/schema";
import { createTestDb } from "../db/harness";

type Db = Awaited<ReturnType<typeof createTestDb>>["db"];
let db: Db;
const NOW = new Date("2026-10-23T05:00:00Z");

function formOf(base: Record<string, string | string[]>, overrides: Record<string, string | string[]> = {}, intent = "save") {
  const fd = new FormData();
  for (const [k, v] of Object.entries({ ...base, intent, ...overrides })) for (const one of [v].flat()) fd.append(k, one);
  return fd;
}

beforeAll(async () => {
  ({ db } = await createTestDb());
});

beforeEach(async () => {
  await db.delete(canteenDishes);
  await db.delete(canteenStallAddOns);
  await db.delete(canteenStalls);
  await db.delete(canonicalDishes);
});

const STALL: Record<string, string | string[]> = {
  slug: "17-am-tea",
  "name.th": "แอมที",
  "name.en": "Am Tea",
  number: "17",
  cuisine: ["drinks", "desserts"],
  mapCol: "10",
  mapRow: "0",
  mapW: "2",
  mapH: "2",
  mapShape: "rect",
};
const stall = (overrides: Record<string, string | string[]> = {}, intent = "save", extra: { id?: string | null; existingStatus?: "draft" | "published" } = {}) =>
  validateStallForm(db, { locale: "en", id: extra.id ?? null, formData: formOf(STALL, overrides, intent), existingStatus: extra.existingStatus });

describe("validateStallForm", () => {
  it("accepts a stall and drops blank rows", async () => {
    const result = await stall({ "hours.0.daysOfWeek": "", "hours.0.opens": "", "addOns.0.delta": "" }, "publish");
    expect(result).toMatchObject({ ok: true, status: "published", data: { number: 17, cuisine: ["drinks", "desserts"], hours: [], addOns: [], halal: false } });
  });

  it("checks opening hours rows", async () => {
    const ok = await stall({ "hours.0.daysOfWeek": ["1", "2"], "hours.0.opens": "08:30", "hours.0.closes": "15:00" });
    expect(ok).toMatchObject({ ok: true, data: { hours: [{ daysOfWeek: ["1", "2"], opens: "08:30", closes: "15:00" }] } });
    expect(await stall({ "hours.0.daysOfWeek": "1", "hours.0.opens": "8.30" })).toMatchObject({
      ok: false,
      errors: { "hours.0.opens": expect.stringContaining("time"), "hours.0.closes": expect.stringContaining("Enter") },
    });
    expect(await stall({ "hours.0.opens": "08:30", "hours.0.closes": "09:00" })).toMatchObject({ ok: false, errors: { "hours.0.daysOfWeek": expect.any(String) } });
  });

  it("requires both languages in a started add-on, and a price", async () => {
    expect(await stall({ "addOns.0.label.th": "ไข่ดาว" })).toMatchObject({
      ok: false,
      errors: { "addOns.0.label.en": expect.stringContaining("English"), "addOns.0.delta": expect.any(String) },
    });
  });

  it("keeps stall numbers and slugs unique, ignoring the stall itself", async () => {
    const [existing] = await db.insert(canteenStalls).values({ slug: "17-am-tea", number: 17, mapCol: 0, mapRow: 0 }).returning();
    expect(await stall()).toMatchObject({ ok: false, errors: { slug: expect.any(String), number: expect.stringContaining("number") } });
    expect((await stall({}, "save", { id: existing!.id })).ok).toBe(true);
  });

  it("only links add-ons to dishes of the same stall", async () => {
    const [own] = await db.insert(canteenStalls).values({ slug: "17-am-tea", number: 17, mapCol: 0, mapRow: 0 }).returning();
    const [other] = await db.insert(canteenStalls).values({ slug: "2-x", number: 2, mapCol: 1, mapRow: 0 }).returning();
    const dish = (stallId: string, slug: string) =>
      db.insert(canteenDishes).values({ slug, stallId, price: 30, type: "rice", course: "main", checkedOn: "2026-10-21" }).returning();
    const [mine] = await dish(own!.id, "17-a");
    const [theirs] = await dish(other!.id, "2-a");
    const base = { "addOns.0.label.th": "ไข่", "addOns.0.label.en": "Egg", "addOns.0.delta": "10" };
    expect((await stall({ ...base, "addOns.0.dishIds": mine!.id }, "save", { id: own!.id })).ok).toBe(true);
    expect(await stall({ ...base, "addOns.0.dishIds": theirs!.id }, "save", { id: own!.id })).toMatchObject({ ok: false, errors: { "addOns.0.dishIds": expect.any(String) } });
  });

  it("rejects an unknown cuisine, shape and a cell outside the grid sizes", async () => {
    expect(await stall({ cuisine: ["pizza"], mapShape: "star", mapW: "0" })).toMatchObject({
      ok: false,
      errors: { cuisine: expect.any(String), mapShape: expect.any(String), mapW: expect.any(String) },
    });
  });
});

const DISH: Record<string, string | string[]> = {
  slug: "17-thai-tea",
  "name.th": "ชาไทย",
  "name.en": "Thai tea",
  price: "25",
  checkedOn: "2026-10-21",
  type: "drink",
  course: "drink",
  protein: "none",
  temperature: "cold",
};
describe("validateDishForm", () => {
  let stallId: string;
  beforeEach(async () => {
    const [row] = await db.insert(canteenStalls).values({ slug: "17-am-tea", number: 17, mapCol: 0, mapRow: 0 }).returning();
    stallId = row!.id;
  });
  const dish = (overrides: Record<string, string | string[]> = {}, intent = "save", id: string | null = null) =>
    validateDishForm(db, { locale: "en", id, formData: formOf({ ...DISH, stallId }, overrides, intent), now: NOW });

  it("accepts a dish and returns parsed values", async () => {
    expect(await dish({ contains: ["milk", "soy"], "variants.0.label.th": "พิเศษ", "variants.0.label.en": "Special", "variants.0.delta": "10", "variants.1.delta": "" }, "publish")).toMatchObject({
      ok: true,
      status: "published",
      data: { price: 25, stallId, protein: ["none"], contains: ["milk", "soy"], style: null, variants: [{ label: { th: "พิเศษ", en: "Special" }, delta: 10 }] },
    });
  });

  it("needs a stall, a price and a type", async () => {
    expect(await dish({ stallId: "", price: "", type: "" })).toMatchObject({ ok: false, errors: { stallId: expect.any(String), price: expect.any(String), type: expect.any(String) } });
    expect(await dish({ price: "-5" })).toMatchObject({ ok: false, errors: { price: expect.any(String) } });
    expect(await dish({ stallId: "00000000-0000-4000-8000-000000000000" })).toMatchObject({ ok: false, errors: { stallId: expect.any(String) } });
  });

  it("applies the protein rules", async () => {
    expect(await dish({ protein: [] })).toMatchObject({ ok: false, errors: { protein: expect.stringContaining("at least one") } });
    expect(await dish({ protein: ["none", "pork"] })).toMatchObject({ ok: false, errors: { protein: expect.stringContaining("No meat") } });
  });

  it("will not accept a check date in the future", async () => {
    expect(await dish({ checkedOn: "2026-10-30" })).toMatchObject({ ok: false, errors: { checkedOn: expect.stringContaining("earlier") } });
  });

  it("requires both languages when publishing but not for a draft", async () => {
    expect((await dish({ "name.en": "" }, "save")).ok).toBe(true);
    expect(await dish({ "name.en": "" }, "publish")).toMatchObject({ ok: false, errors: { "name.en": expect.stringContaining("English") } });
  });

  it("requires a romanised reading with a Thai phrase", async () => {
    expect(await dish({ "sayAs.0.th": "ชาไทยเย็น" })).toMatchObject({ ok: false, errors: { "sayAs.0.romanised": expect.any(String) } });
  });

  it("checks the standard dish exists and the slug is free", async () => {
    expect(await dish({ canonicalId: "00000000-0000-4000-8000-000000000000" })).toMatchObject({ ok: false, errors: { canonicalId: expect.any(String) } });
    await db.insert(canteenDishes).values({ slug: "17-thai-tea", stallId, price: 20, type: "drink", course: "drink", checkedOn: "2026-10-21" });
    expect(await dish()).toMatchObject({ ok: false, errors: { slug: expect.any(String) } });
  });
});

describe("planPrice", () => {
  it("records new dishes, changed prices and re-checks, and dates a price change today", () => {
    expect(planPrice(undefined, { price: 30, checkedOn: "2026-10-01" }, "2026-10-23")).toEqual({ checkedOn: "2026-10-01", record: true });
    expect(planPrice({ price: 30, checkedOn: "2026-10-01" }, { price: 35, checkedOn: "2026-10-01" }, "2026-10-23")).toEqual({ checkedOn: "2026-10-23", record: true });
    expect(planPrice({ price: 30, checkedOn: "2026-10-01" }, { price: 35, checkedOn: "2026-10-20" }, "2026-10-23")).toEqual({ checkedOn: "2026-10-20", record: true });
    expect(planPrice({ price: 30, checkedOn: "2026-10-01" }, { price: 30, checkedOn: "2026-10-20" }, "2026-10-23")).toEqual({ checkedOn: "2026-10-20", record: true });
    expect(planPrice({ price: 30, checkedOn: "2026-10-01" }, { price: 30, checkedOn: "2026-10-01" }, "2026-10-23")).toEqual({ checkedOn: "2026-10-01", record: false });
  });
});

describe("parsePriceForm", () => {
  const sheet = [
    { id: "00000000-0000-4000-8000-000000000001", nameTh: "", nameEn: "A", menuNumber: null, price: 30, checkedOn: "2026-10-01", status: "published" as const },
    { id: "00000000-0000-4000-8000-000000000002", nameTh: "", nameEn: "B", menuNumber: null, price: 40, checkedOn: "2026-10-01", status: "published" as const },
  ];
  it("reads a price per dish and reports bad ones against that dish", () => {
    const ok = parsePriceForm("en", sheet, formOf({ checkedOn: "2026-10-23", [`price.${sheet[0]!.id}`]: "35", [`price.${sheet[1]!.id}`]: "40" }), NOW);
    expect(ok).toMatchObject({ ok: true, prices: { [sheet[0]!.id]: 35, [sheet[1]!.id]: 40 }, confirmAll: false });
    const bad = parsePriceForm("en", sheet, formOf({ checkedOn: "2026-10-23", [`price.${sheet[0]!.id}`]: "abc", [`price.${sheet[1]!.id}`]: "" }), NOW);
    expect(bad).toMatchObject({ ok: false, errors: { [`price.${sheet[0]!.id}`]: expect.any(String), [`price.${sheet[1]!.id}`]: expect.any(String) } });
  });
});

describe("validateCanonicalForm", () => {
  const BASE = { slug: "pad-kra-pao", "name.th": "ผัดกะเพรา", "name.en": "Pad kra pao" };
  const run = (overrides: Record<string, string | string[]> = {}, intent = "save") =>
    validateCanonicalForm(db, { locale: "en", id: null, formData: formOf(BASE, overrides, intent) });

  it("collects aliases and drops blanks and duplicates", async () => {
    const result = await run({ "aliases.0.value": "pad kaprao", "aliases.1.value": "", "aliases.2.value": "pad kaprao" });
    expect(result).toMatchObject({ ok: true, data: { aliases: ["pad kaprao"], howToOrder: [] } });
  });

  it("needs all three parts of an ordering phrase", async () => {
    expect(await run({ "howToOrder.0.th": "ผัดกะเพรา" })).toMatchObject({
      ok: false,
      errors: { "howToOrder.0.romanised": expect.any(String), "howToOrder.0.en": expect.any(String) },
    });
  });

  it("keeps slugs unique", async () => {
    await db.insert(canonicalDishes).values({ slug: "pad-kra-pao" });
    expect(await run()).toMatchObject({ ok: false, errors: { slug: expect.any(String) } });
  });
});

describe("validateCanteenSettingsForm", () => {
  const settings = surveyCanteenData(new Date("2026-10-21T00:00:00Z")).settings!;
  const surveyForm = (overrides: Record<string, string | string[]> = {}) => {
    const f: Record<string, string> = { gridCols: String(settings.gridCols), gridRows: String(settings.gridRows), riverSide: settings.riverSide ?? "" };
    (settings.entrances ?? []).forEach((e, i) => Object.assign(f, { [`entrances.${i}.label.th`]: e.label.th, [`entrances.${i}.label.en`]: e.label.en, [`entrances.${i}.col`]: String(e.col), [`entrances.${i}.row`]: String(e.row), [`entrances.${i}.side`]: e.side }));
    (settings.seatingZones ?? []).forEach((z, i) => Object.assign(f, { [`seatingZones.${i}.label.th`]: z.label.th, [`seatingZones.${i}.label.en`]: z.label.en, [`seatingZones.${i}.col`]: String(z.col), [`seatingZones.${i}.row`]: String(z.row), [`seatingZones.${i}.w`]: String(z.w), [`seatingZones.${i}.h`]: String(z.h) }));
    (settings.outline ?? []).forEach((p, i) => Object.assign(f, { [`outline.${i}.col`]: String(p.col), [`outline.${i}.row`]: String(p.row) }));
    (settings.landmarks ?? []).forEach((l, i) => Object.assign(f, { [`landmarks.${i}.kind`]: l.kind, [`landmarks.${i}.label.th`]: l.label.th, [`landmarks.${i}.label.en`]: l.label.en, [`landmarks.${i}.col`]: String(l.col), [`landmarks.${i}.row`]: String(l.row), [`landmarks.${i}.w`]: String(l.w), [`landmarks.${i}.h`]: String(l.h) }));
    return formOf(f, overrides, "save");
  };
  const run = (overrides: Record<string, string | string[]> = {}) => validateCanteenSettingsForm(db, { locale: "en", formData: surveyForm(overrides) });

  it("accepts the surveyed floor plan as it is", async () => {
    const result = await run();
    expect(result).toMatchObject({ ok: true });
    if (result.ok) {
      expect(result.data.entrances).toHaveLength(settings.entrances?.length ?? 0);
      expect(result.data.landmarks).toHaveLength(settings.landmarks?.length ?? 0);
    }
  });

  it("rejects a plan smaller than what is drawn on it, and a missing grid", async () => {
    expect(await run({ gridCols: "2" })).toMatchObject({ ok: false });
    expect(await run({ gridRows: "" })).toMatchObject({ ok: false, errors: { gridRows: expect.any(String) } });
  });

  it("needs every part of a started landmark", async () => {
    expect(await run({ "landmarks.99.label.th": "บันได" })).toMatchObject({ ok: false });
    expect(await run({ riverSide: "up" })).toMatchObject({ ok: false, errors: { riverSide: expect.any(String) } });
  });
});
