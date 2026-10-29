/** The month and day builders behind the availability calendar, on PGlite. */
import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import { transition } from "@/lib/cases";
import { dayAvailability, monthAvailability } from "@/lib/borrowing/calendar";
import { lendable } from "@/lib/borrowing/availability";
import { at, NOW, setupBorrowing, type Ctx } from "./helpers";

let t: Ctx;
beforeAll(async () => {
  t = await setupBorrowing();
});

const day = (month: Awaited<ReturnType<typeof monthAvailability>>, key: string) => month!.days.find((d) => d.dayKey === key)!;

describe("monthAvailability", () => {
  it("returns the item, category, stock and one entry per day", async () => {
    const m = await monthAvailability(t.db, "football", "2026-03", NOW);
    const football = await t.item("football");
    expect(m!.item.id).toBe(football.id);
    expect(m!.category.key).toBe("sport");
    expect(m!.lendable).toBe(lendable(football));
    expect(m!.days).toHaveLength(31);
    expect(m!.days[0]!.dayKey).toBe("2026-03-01");
    expect(m!.today).toBe("2026-03-09");
    expect(m!.days.every((d) => d.bookings === undefined)).toBe(true);
  });

  it("returns null for an unknown slug", async () => {
    expect(await monthAvailability(t.db, "no-such-item", "2026-03", NOW)).toBeNull();
  });

  it("marks closed days, past days and days inside the notice period", async () => {
    const m = await monthAvailability(t.db, "football", "2026-03", NOW);
    expect(day(m, "2026-03-07")).toMatchObject({ weekday: 6, deskOpen: false, past: true });
    expect(day(m, "2026-03-08")).toMatchObject({ weekday: 0, deskOpen: false, past: true });
    expect(day(m, "2026-03-09")).toMatchObject({ deskOpen: true, past: false, tooSoon: true });
    expect(day(m, "2026-03-11")).toMatchObject({ past: false, tooSoon: true });
    expect(day(m, "2026-03-12")).toMatchObject({ past: false, tooSoon: false });
    expect(day(m, "2026-03-14")).toMatchObject({ deskOpen: false, tooSoon: false });
    expect(m!.earliest).toBe("2026-03-12");
  });

  it("uses the category's own notice: radios need seven working days", async () => {
    const m = await monthAvailability(t.db, "radio-red", "2026-03", NOW);
    expect(day(m, "2026-03-17").tooSoon).toBe(true);
    expect(day(m, "2026-03-18").tooSoon).toBe(false);
  });

  it("shows held and free units on each day a booking touches", async () => {
    const item = await t.item("table-tennis-net");
    await t.request({ collectAt: at("2026-03-12", "10:00"), returnDueAt: at("2026-03-16", "16:00"), lines: [{ itemId: item.id, quantity: 1 }] });
    const m = await monthAvailability(t.db, "table-tennis-net", "2026-03", NOW);
    const total = lendable(item);
    expect(day(m, "2026-03-11")).toMatchObject({ held: 0, free: total });
    for (const k of ["2026-03-12", "2026-03-14", "2026-03-16"]) expect(day(m, k)).toMatchObject({ held: 1, free: total - 1 });
    expect(day(m, "2026-03-17")).toMatchObject({ held: 0, free: total });
  });

  it("reports none free when a booking takes all of the stock", async () => {
    const item = await t.item("football-net");
    await t.request({ lines: [{ itemId: item.id, quantity: lendable(item) }] });
    const m = await monthAvailability(t.db, "football-net", "2026-03", NOW);
    expect(day(m, "2026-03-12").free).toBe(0);
    expect(day(m, "2026-03-13").free).toBe(0);
    expect(day(m, "2026-03-16").free).toBe(lendable(item));
  });

  it("counts requested, approved and on loan, but not declined, cancelled, not collected or returned", async () => {
    const item = await t.item("basketball-net");
    const cases: Array<[string, string, string[], number]> = [
      ["2026-03-12", "requested", [], 1],
      ["2026-03-13", "approved", ["approved"], 1],
      ["2026-03-16", "on_loan", ["approved", "on_loan"], 1],
      ["2026-03-17", "declined", ["declined"], 0],
      ["2026-03-18", "cancelled", ["cancelled"], 0],
      ["2026-03-19", "not_collected", ["approved", "not_collected"], 0],
      ["2026-03-20", "returned", ["approved", "on_loan", "returned"], 0],
    ];
    for (const [key, , path] of cases) {
      const made = await t.request({ lines: [{ itemId: item.id, quantity: 1 }], collectAt: at(key, "10:00"), returnDueAt: at(key, "16:00") });
      for (const to of path) await transition(t.db, made.caseId, to, t.officer, { now: NOW });
    }
    const m = await monthAvailability(t.db, "basketball-net", "2026-03", NOW);
    for (const [key, name, , held] of cases) expect({ name, held: day(m, key).held }).toEqual({ name, held });
  });

  it("keeps an overdue loan holding every day from its return time to now", async () => {
    const item = await t.item("stopwatch");
    const made = await t.request({ collectAt: at("2026-03-12"), returnDueAt: at("2026-03-13", "16:00"), lines: [{ itemId: item.id, quantity: 1 }] });
    await transition(t.db, made.caseId, "approved", t.officer, { now: NOW });
    await transition(t.db, made.caseId, "on_loan", t.officer, { now: NOW });
    const later = new Date("2026-03-18T05:00:00Z");
    const m = await monthAvailability(t.db, "stopwatch", "2026-03", later);
    expect(day(m, "2026-03-16").held).toBe(1);
    expect(day(m, "2026-03-18").held).toBe(1);
    expect(day(m, "2026-03-19").held).toBe(0);
  });

  it("hides inactive items from the public view but not from staff", async () => {
    const item = await t.item("relay-baton");
    await t.db.update(schema.equipmentItems).set({ active: false }).where(eq(schema.equipmentItems.id, item.id));
    expect(await monthAvailability(t.db, "relay-baton", "2026-03", NOW)).toBeNull();
    expect((await monthAvailability(t.db, "relay-baton", "2026-03", NOW, { staff: true }))!.item.id).toBe(item.id);
  });

  it("lists each day's bookings for staff, with reference, quantity and status", async () => {
    const item = await t.item("marker-cone");
    const made = await t.request({ collectAt: at("2026-03-12"), returnDueAt: at("2026-03-13", "16:00"), lines: [{ itemId: item.id, quantity: 3 }] });
    await transition(t.db, made.caseId, "approved", t.officer, { now: NOW });
    const m = await monthAvailability(t.db, "marker-cone", "2026-03", NOW, { staff: true });
    expect(day(m, "2026-03-11").bookings).toEqual([]);
    const booked = day(m, "2026-03-12").bookings!;
    expect(booked).toHaveLength(1);
    expect(booked[0]).toMatchObject({ caseId: made.caseId, reference: made.reference, status: "approved", quantity: 3 });
    expect(booked[0]!.collectAt.getTime()).toBe(at("2026-03-12").getTime());
    expect(booked[0]!.returnDueAt.getTime()).toBe(at("2026-03-13", "16:00").getTime());
    expect(day(m, "2026-03-13").bookings).toHaveLength(1);
    expect(day(m, "2026-03-14").bookings).toEqual([]);
  });

  it("does not list declined bookings", async () => {
    const item = await t.item("red-flag");
    const made = await t.request({ lines: [{ itemId: item.id, quantity: 1 }] });
    await transition(t.db, made.caseId, "declined", t.officer, { now: NOW });
    const m = await monthAvailability(t.db, "red-flag", "2026-03", NOW, { staff: true });
    expect(m!.days.every((d) => d.bookings!.length === 0)).toBe(true);
  });

  it("includes a booking that starts in the previous month and runs into this one", async () => {
    const item = await t.item("drumsticks");
    await t.request({ collectAt: at("2026-03-31", "10:00"), returnDueAt: at("2026-04-02", "16:00"), lines: [{ itemId: item.id, quantity: 1 }] });
    const m = await monthAvailability(t.db, "drumsticks", "2026-04", NOW, { staff: true });
    expect(day(m, "2026-04-01").bookings).toHaveLength(1);
    expect(day(m, "2026-04-01").held).toBe(1);
    expect(day(m, "2026-04-03").bookings).toHaveLength(0);
  });
});

describe("dayAvailability", () => {
  it("groups every active item by category with its free count", async () => {
    const d = await dayAvailability(t.db, "2026-03-20", NOW);
    expect(d).toMatchObject({ day: "2026-03-20", today: "2026-03-09", deskOpen: true, past: false });
    expect(d.categories.map((c) => c.category.key)).toEqual(expect.arrayContaining(["sport", "recreation", "radio", "first-aid"]));
    const sport = d.categories.find((c) => c.category.key === "sport")!;
    const ball = sport.items.find((i) => i.item.slug === "volleyball")!;
    expect(ball.lendable).toBe(4);
    expect(ball.free).toBeLessThanOrEqual(4);
    expect(sport.tooSoon).toBe(false);
  });

  it("subtracts bookings made on that day", async () => {
    const item = await t.item("volleyball");
    await t.request({ collectAt: at("2026-03-24"), returnDueAt: at("2026-03-25", "16:00"), lines: [{ itemId: item.id, quantity: 2 }] });
    const d = await dayAvailability(t.db, "2026-03-24", NOW);
    const free = d.categories.flatMap((c) => c.items).find((i) => i.item.slug === "volleyball")!.free;
    expect(free).toBe(lendable(item) - 2);
  });

  it("flags closed, past and too-soon days", async () => {
    expect((await dayAvailability(t.db, "2026-03-21", NOW)).deskOpen).toBe(false);
    expect((await dayAvailability(t.db, "2026-03-02", NOW)).past).toBe(true);
    const soon = await dayAvailability(t.db, "2026-03-13", NOW);
    expect(soon.categories.find((c) => c.category.key === "sport")!.tooSoon).toBe(false);
    expect(soon.categories.find((c) => c.category.key === "radio")!.tooSoon).toBe(true);
  });

  it("leaves out inactive items and categories with no active items", async () => {
    const item = await t.item("first-aid-kit");
    await t.db.update(schema.equipmentItems).set({ active: false }).where(eq(schema.equipmentItems.id, item.id));
    const d = await dayAvailability(t.db, "2026-03-20", NOW);
    expect(d.categories.some((c) => c.category.key === "first-aid")).toBe(false);
  });
});
