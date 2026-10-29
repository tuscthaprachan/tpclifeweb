/** The availability sweep (pure) and the hold query (PGlite). */
import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import { transition } from "@/lib/cases";
import { availableOnDay, availableOver, lendable, listInventory, loadHolds, peakHeld, type Hold, type Stock } from "@/lib/borrowing/availability";
import { dayStart } from "@/lib/borrowing/time";
import { at, NOW, setupBorrowing, type Ctx } from "./helpers";

const hold = (caseId: string, quantity: number, start: Date, end: Date, itemId = "a"): Hold => ({ caseId, itemId, quantity, start, end });
const stock: Stock = { id: "a", totalQuantity: 5, outOfService: 1 };

describe("lendable", () => {
  it("is the total less what is out of service, never negative", () => {
    expect(lendable(stock)).toBe(4);
    expect(lendable({ id: "a", totalQuantity: 3, outOfService: 3 })).toBe(0);
    expect(lendable({ id: "a", totalQuantity: 2, outOfService: 5 })).toBe(0);
  });
});

describe("peakHeld", () => {
  const mon = at("2026-03-09", "10:00");
  const tue = at("2026-03-10", "10:00");
  const wed = at("2026-03-11", "10:00");
  const thu = at("2026-03-12", "10:00");

  it("is zero with no holds, or none for this item", () => {
    expect(peakHeld([], "a", mon, thu)).toBe(0);
    expect(peakHeld([hold("c1", 2, mon, tue, "b")], "a", mon, thu)).toBe(0);
  });

  it("adds holds that overlap one another", () => {
    const holds = [hold("c1", 2, mon, wed), hold("c2", 1, tue, thu)];
    expect(peakHeld(holds, "a", mon, thu)).toBe(3);
  });

  it("does not add holds that follow one another, only the larger one counts", () => {
    const holds = [hold("c1", 2, mon, tue), hold("c2", 3, wed, thu)];
    expect(peakHeld(holds, "a", mon, thu)).toBe(3);
  });

  it("treats periods as half open: a return at noon and a collection at noon do not clash", () => {
    const holds = [hold("c1", 2, mon, tue), hold("c2", 2, tue, wed)];
    expect(peakHeld(holds, "a", mon, wed)).toBe(2);
  });

  it("ignores a hold that ends exactly when the window starts, or starts exactly when it ends", () => {
    const holds = [hold("c1", 4, mon, tue), hold("c2", 4, wed, thu)];
    expect(peakHeld(holds, "a", tue, wed)).toBe(0);
  });

  it("counts a hold that begins before the window and one that ends after it", () => {
    const holds = [hold("c1", 1, mon, wed), hold("c2", 1, tue, thu)];
    expect(peakHeld(holds, "a", at("2026-03-10", "12:00"), at("2026-03-11", "08:00"))).toBe(2);
  });

  it("sees a peak that starts partway through the window", () => {
    const holds = [hold("c1", 1, mon, thu), hold("c2", 2, wed, thu)];
    expect(peakHeld(holds, "a", mon, thu)).toBe(3);
  });

  it("leaves out the case being re-checked", () => {
    const holds = [hold("c1", 3, mon, thu), hold("c2", 1, mon, thu)];
    expect(peakHeld(holds, "a", mon, thu)).toBe(4);
    expect(peakHeld(holds, "a", mon, thu, "c1")).toBe(1);
  });

  it("counts two lines of the same case on the same item together", () => {
    const holds = [hold("c1", 1, mon, thu), hold("c1", 2, mon, thu)];
    expect(peakHeld(holds, "a", mon, thu)).toBe(3);
  });
});

describe("availableOver and availableOnDay", () => {
  it("subtracts the peak from the lendable stock", () => {
    const holds = [hold("c1", 3, at("2026-03-12", "10:00"), at("2026-03-13", "16:00"))];
    expect(availableOver(stock, holds, at("2026-03-12", "09:00"), at("2026-03-13", "17:00"))).toBe(1);
  });

  it("never goes below zero when holds exceed stock", () => {
    const holds = [hold("c1", 9, at("2026-03-12", "10:00"), at("2026-03-13", "16:00"))];
    expect(availableOver(stock, holds, at("2026-03-12", "09:00"), at("2026-03-13", "17:00"))).toBe(0);
  });

  it("measures a whole Bangkok day, midnight to midnight", () => {
    const holds = [hold("c1", 2, at("2026-03-12", "10:00"), at("2026-03-13", "16:00"))];
    expect(availableOnDay(stock, holds, "2026-03-11")).toBe(4);
    expect(availableOnDay(stock, holds, "2026-03-12")).toBe(2);
    expect(availableOnDay(stock, holds, "2026-03-13")).toBe(2);
    expect(availableOnDay(stock, holds, "2026-03-14")).toBe(4);
  });

  it("is not free on a day that is partly held: free means free all day", () => {
    const holds = [hold("c1", 4, at("2026-03-12", "16:00"), at("2026-03-12", "17:00"))];
    expect(availableOnDay(stock, holds, "2026-03-12")).toBe(0);
  });

  it("frees a day when the hold ends exactly at its midnight", () => {
    const holds = [hold("c1", 4, at("2026-03-11", "10:00"), dayStart("2026-03-12"))];
    expect(availableOnDay(stock, holds, "2026-03-12")).toBe(4);
  });

  it("uses only holds for the item asked about", () => {
    const holds = [hold("c1", 4, at("2026-03-12", "10:00"), at("2026-03-13", "10:00"), "other")];
    expect(availableOnDay(stock, holds, "2026-03-12")).toBe(4);
  });
});

describe("loadHolds", () => {
  let t: Ctx;
  beforeAll(async () => {
    t = await setupBorrowing();
  });

  async function holdsFor(slug: string, from: string, to: string, now = NOW) {
    const item = await t.item(slug);
    return { item, holds: await loadHolds(t.db, { from: dayStart(from), to: dayStart(to) }, { itemIds: [item.id], now }) };
  }

  it("holds stock while a request is waiting, approved, and on loan", async () => {
    const item = await t.item("volleyball");
    const made = await t.request({ lines: [{ itemId: item.id, quantity: 1 }] });
    const range = ["2026-03-12", "2026-03-14"] as const;
    expect((await holdsFor("volleyball", ...range)).holds.map((h) => h.caseId)).toEqual([made.caseId]);
    await transition(t.db, made.caseId, "approved", t.officer, { now: NOW });
    expect((await holdsFor("volleyball", ...range)).holds).toHaveLength(1);
    await transition(t.db, made.caseId, "on_loan", t.officer, { now: NOW });
    expect((await holdsFor("volleyball", ...range)).holds).toHaveLength(1);
    await transition(t.db, made.caseId, "returned", t.officer, { now: NOW });
    expect((await holdsFor("volleyball", ...range)).holds).toHaveLength(0);
  });

  it("releases stock when a request is declined, cancelled or not collected", async () => {
    const item = await t.item("basketball-7");
    const declined = await t.request({ lines: [{ itemId: item.id, quantity: 1 }] });
    await transition(t.db, declined.caseId, "declined", t.officer, { now: NOW });
    const cancelled = await t.request({ lines: [{ itemId: item.id, quantity: 1 }] });
    await transition(t.db, cancelled.caseId, "cancelled", t.officer, { now: NOW });
    const missed = await t.request({ lines: [{ itemId: item.id, quantity: 1 }] });
    await transition(t.db, missed.caseId, "approved", t.officer, { now: NOW });
    await transition(t.db, missed.caseId, "not_collected", t.officer, { now: NOW });
    expect((await holdsFor("basketball-7", "2026-03-12", "2026-03-14")).holds).toHaveLength(0);
  });

  it("only returns holds overlapping the range, half open at both ends", async () => {
    const item = await t.item("basketball-6");
    await t.request({ collectAt: at("2026-03-12", "10:00"), returnDueAt: at("2026-03-13", "10:00"), lines: [{ itemId: item.id, quantity: 1 }] });
    expect((await holdsFor("basketball-6", "2026-03-13", "2026-03-14")).holds).toHaveLength(1);
    expect((await holdsFor("basketball-6", "2026-03-14", "2026-03-16")).holds).toHaveLength(0);
    expect((await holdsFor("basketball-6", "2026-03-10", "2026-03-12")).holds).toHaveLength(0);
    const exact = await loadHolds(t.db, { from: at("2026-03-13", "10:00"), to: at("2026-03-14", "10:00") }, { itemIds: [item.id], now: NOW });
    expect(exact).toHaveLength(0);
    const before = await loadHolds(t.db, { from: at("2026-03-11", "10:00"), to: at("2026-03-12", "10:00") }, { itemIds: [item.id], now: NOW });
    expect(before).toHaveLength(0);
  });

  it("keeps an overdue loan holding until now", async () => {
    const item = await t.item("table-tennis-bat");
    const made = await t.request({ collectAt: at("2026-03-12", "10:00"), returnDueAt: at("2026-03-13", "16:00"), lines: [{ itemId: item.id, quantity: 1 }] });
    await transition(t.db, made.caseId, "approved", t.officer, { now: NOW });
    await transition(t.db, made.caseId, "on_loan", t.officer, { now: NOW });
    const later = new Date("2026-03-20T05:00:00Z");
    const { holds } = await holdsFor("table-tennis-bat", "2026-03-18", "2026-03-22", later);
    expect(holds).toHaveLength(1);
    expect(holds[0]!.end.getTime()).toBe(later.getTime());
    expect(availableOnDayOf(item, holds, "2026-03-19")).toBeLessThan(lendable(item));
    const sameWindowNotYetDue = await holdsFor("table-tennis-bat", "2026-03-18", "2026-03-22", NOW);
    expect(sameWindowNotYetDue.holds).toHaveLength(0);
  });

  it("does not stretch a request that is only approved past its return time", async () => {
    const item = await t.item("basketball-5");
    const made = await t.request({ lines: [{ itemId: item.id, quantity: 1 }] });
    await transition(t.db, made.caseId, "approved", t.officer, { now: NOW });
    const { holds } = await holdsFor("basketball-5", "2026-03-18", "2026-03-22", new Date("2026-03-20T05:00:00Z"));
    expect(holds).toHaveLength(0);
  });

  it("returns nothing for an empty item list, and filters by item", async () => {
    expect(await loadHolds(t.db, { from: dayStart("2026-03-01"), to: dayStart("2026-04-01") }, { itemIds: [], now: NOW })).toEqual([]);
    const football = await t.item("football");
    const other = await t.item("basketball-6");
    await t.request({ lines: [{ itemId: football.id, quantity: 1 }] });
    const only = await loadHolds(t.db, { from: dayStart("2026-03-12"), to: dayStart("2026-03-14") }, { itemIds: [other.id], now: NOW });
    expect(only.every((h) => h.itemId === other.id)).toBe(true);
  });
});

function availableOnDayOf(item: Stock, holds: Hold[], day: string) {
  return availableOnDay(item, holds, day);
}

describe("listInventory", () => {
  it("lists categories in order with their items, and drops inactive ones on request", async () => {
    const t = await setupBorrowing();
    const all = await listInventory(t.db);
    expect(all.length).toBeGreaterThanOrEqual(4);
    expect(all.every((c) => c.items.length > 0)).toBe(true);
    const positions = all.map((c) => c.position);
    expect([...positions].sort((x, y) => x - y)).toEqual(positions);
    const first = all[0]!.items[0]!;
    await t.db.update(schema.equipmentItems).set({ active: false }).where(eq(schema.equipmentItems.id, first.id));
    const active = await listInventory(t.db, { activeOnly: true });
    expect(active.flatMap((c) => c.items).some((i) => i.id === first.id)).toBe(false);
    expect((await listInventory(t.db)).flatMap((c) => c.items).some((i) => i.id === first.id)).toBe(true);
  });
});
