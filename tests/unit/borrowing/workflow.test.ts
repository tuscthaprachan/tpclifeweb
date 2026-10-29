/** The desk's side of a loan: decide, hand over, take back, settle. On PGlite with the real migrations. */
import { beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { auditLog, borrowingLines, borrowingRequests, caseEvents, cases, equipmentItems } from "@/lib/db/schema";
import { BorrowingError } from "@/lib/borrowing/errors";
import { approveLoan, cancelByStaff, declineLoan, listSchedule, LoanInputError, markNotCollected, readLoanFacts, recordHandover, recordReturn, revealBorrowerDetails, settleLoan } from "@/lib/borrowing/workflow";
import { env, at, NOW, setupBorrowing, type Ctx } from "./helpers";

let t: Ctx;
beforeAll(async () => {
  t = await setupBorrowing();
});

const row = async (id: string) => (await t.db.select().from(cases).where(eq(cases.id, id)))[0]!;
const req = async (id: string) => (await t.db.select().from(borrowingRequests).where(eq(borrowingRequests.caseId, id)))[0]!;
const lines = async (id: string) => t.db.select().from(borrowingLines).where(eq(borrowingLines.caseId, id));
const events = async (id: string) => t.db.select().from(caseEvents).where(eq(caseEvents.caseId, id));
const stock = async (slug: string) => (await t.item(slug)).outOfService;
const WED = at("2026-03-11", "10:00");
const THU = at("2026-03-12", "10:00");
const FRI = at("2026-03-13", "15:00");

/** A request for `qty` of `slug`, with the default period (Thursday 12th to Friday 13th). */
async function made(slug: string, qty: number, over: Parameters<Ctx["request"]>[0] = {}) {
  const item = await t.item(slug);
  return t.request({ lines: [{ itemId: item.id, quantity: qty }], ...over });
}

/** Takes a request to on_loan. */
async function onLoan(slug: string, qty: number) {
  const c = await made(slug, qty);
  await approveLoan(t.db, c.caseId, t.officer, {}, { now: NOW });
  await recordHandover(t.db, c.caseId, t.officer, { checked: true, depositKind: "student_card", depositCount: 1 }, { now: THU });
  return c;
}

describe("a clean loan, start to finish", () => {
  it("approves with a lowered quantity, hands over and takes it back good", async () => {
    const c = await made("football", 3);
    const [line] = await lines(c.caseId);

    await approveLoan(t.db, c.caseId, t.officer, { quantities: { [line!.id]: 2 }, note: { en: "Please collect before noon." } }, { now: NOW });
    expect((await row(c.caseId)).status).toBe("approved");
    expect((await lines(c.caseId))[0]!.quantity).toBe(2);
    expect((await req(c.caseId)).decidedAt).toEqual(NOW);
    const afterApprove = await events(c.caseId);
    expect(afterApprove.find((e) => e.type === "lines_changed")!.metadata).toEqual({ changes: [{ itemId: line!.itemId, from: 3, to: 2 }] });
    expect(afterApprove.find((e) => e.type === "public_update")).toMatchObject({ bodyEn: "Please collect before noon.", visibility: "public" });

    await recordHandover(t.db, c.caseId, t.officer, { checked: true, depositKind: "student_card", depositCount: 1, note: "Both balls pumped up" }, { now: THU });
    expect((await row(c.caseId)).status).toBe("on_loan");
    expect(await req(c.caseId)).toMatchObject({ collectedAt: THU, handoverChecked: true, depositKind: "student_card", depositCount: 1 });
    const handover = (await events(c.caseId)).find((e) => e.type === "handover_recorded")!;
    expect(handover.metadata).toEqual({ checked: true, depositKind: "student_card", depositCount: 1 });
    expect(handover.visibility).toBe("internal");

    const out = await recordReturn(t.db, c.caseId, t.officer, { lines: { [line!.id]: { good: 2, damaged: 0, lost: 0 } }, depositReturned: true }, { now: FRI });
    expect(out.status).toBe("returned");
    const done = await row(c.caseId);
    expect(done.status).toBe("returned");
    expect(done.closedAt).toEqual(FRI);
    expect(await req(c.caseId)).toMatchObject({ returnedAt: FRI, depositReturnedAt: FRI, compensationBaht: null });
    expect((await lines(c.caseId))[0]).toMatchObject({ returnedGood: 2, damaged: 0, lost: 0 });
    expect(await stock("football")).toBe(0);
    expect((await t.db.select().from(auditLog).where(and(eq(auditLog.entityId, c.caseId), eq(auditLog.action, "borrowing.return")))).length).toBe(1);
  });

  it("approves a request that holds all the stock, because its own hold is left out", async () => {
    const all = await made("table-tennis-net-clamp", 2);
    await approveLoan(t.db, all.caseId, t.officer, {}, { now: NOW });
    expect((await row(all.caseId)).status).toBe("approved");
  });
});

describe("damage and compensation", () => {
  it("needs an amount, ends at compensation_due, takes units out of service, then settles", async () => {
    const c = await onLoan("stopwatch", 2);
    const [line] = await lines(c.caseId);
    const base = { lines: { [line!.id]: { good: 1, damaged: 1, lost: 0 } }, depositReturned: false, takeOutOfService: true };

    await expect(recordReturn(t.db, c.caseId, t.officer, base, { now: FRI })).rejects.toMatchObject({ field: "compensation" });
    expect((await row(c.caseId)).status).toBe("on_loan");

    const out = await recordReturn(t.db, c.caseId, t.officer, { ...base, compensationBaht: 250, compensationNote: "Cracked face" }, { now: FRI });
    expect(out.status).toBe("compensation_due");
    expect(await req(c.caseId)).toMatchObject({ compensationBaht: 250, compensationNote: "Cracked face", returnedAt: FRI, depositReturnedAt: null });
    expect((await row(c.caseId)).closedAt).toBeNull();
    expect(await stock("stopwatch")).toBe(1);
    expect((await events(c.caseId)).find((e) => e.type === "return_recorded")!.metadata).toMatchObject({ good: 1, damaged: 1, lost: 0, compensationBaht: 250 });

    await settleLoan(t.db, c.caseId, t.officer, { settlement: "paid", note: "Paid in cash", depositReturned: true }, { now: at("2026-03-16", "11:00") });
    expect((await row(c.caseId)).status).toBe("settled");
    expect(await req(c.caseId)).toMatchObject({ settlement: "paid", depositReturnedAt: at("2026-03-16", "11:00") });
    expect((await events(c.caseId)).find((e) => e.type === "compensation_settled")!.metadata).toEqual({ settlement: "paid", depositReturned: true });
  });

  it("never takes more out of service than the desk owns, and only when asked", async () => {
    const sw = await t.item("stopwatch");
    await t.db.update(equipmentItems).set({ outOfService: 0, totalQuantity: 3 }).where(eq(equipmentItems.id, sw.id));
    const c = await onLoan("stopwatch", 3);
    const [line] = await lines(c.caseId);
    await t.db.update(equipmentItems).set({ outOfService: 1 }).where(eq(equipmentItems.id, sw.id));
    await recordReturn(t.db, c.caseId, t.officer, { lines: { [line!.id]: { good: 0, damaged: 1, lost: 2 } }, depositReturned: true, compensationBaht: 0, takeOutOfService: true }, { now: FRI });
    expect(await stock("stopwatch")).toBe(3);

    await t.db.update(equipmentItems).set({ outOfService: 0 }).where(eq(equipmentItems.id, sw.id));
    const d = await onLoan("stopwatch", 1);
    const [dl] = await lines(d.caseId);
    await recordReturn(t.db, d.caseId, t.officer, { lines: { [dl!.id]: { good: 0, damaged: 0, lost: 1 } }, depositReturned: true, compensationBaht: 100 }, { now: FRI });
    expect(await stock("stopwatch")).toBe(0);
  });

  it("refuses counts that do not add up, a missing line and an amount when all is good", async () => {
    const c = await onLoan("relay-baton", 2);
    const [line] = await lines(c.caseId);
    const go = (input: Partial<Parameters<typeof recordReturn>[3]>) => recordReturn(t.db, c.caseId, t.officer, { lines: { [line!.id]: { good: 2, damaged: 0, lost: 0 } }, depositReturned: true, ...input }, { now: FRI });
    await expect(go({ lines: { [line!.id]: { good: 1, damaged: 0, lost: 0 } } })).rejects.toMatchObject({ field: "counts" });
    await expect(go({ lines: { [line!.id]: { good: 3, damaged: 0, lost: -1 } } })).rejects.toMatchObject({ field: "counts" });
    await expect(go({ lines: {} })).rejects.toMatchObject({ field: "counts" });
    await expect(go({ compensationBaht: 50 })).rejects.toMatchObject({ field: "compensation" });
    expect((await row(c.caseId)).status).toBe("on_loan");
    expect((await go({})).status).toBe("returned");
  });
});

describe("closing without a loan", () => {
  it("declines with a reason the borrower can read, and needs one", async () => {
    const c = await made("red-flag", 1);
    await expect(declineLoan(t.db, c.caseId, { reason: { th: "  ", en: "" } }, t.officer)).rejects.toBeInstanceOf(LoanInputError);
    await declineLoan(t.db, c.caseId, { reason: { en: "Needed for a university event that week." } }, t.officer, { now: NOW });
    expect((await row(c.caseId)).status).toBe("declined");
    expect((await req(c.caseId)).decidedAt).toEqual(NOW);
    expect((await events(c.caseId)).find((e) => e.type === "public_update")).toMatchObject({ bodyEn: "Needed for a university event that week.", bodyTh: null, visibility: "public" });
  });

  it("marks an approved request not collected, and cancels with a reason", async () => {
    const a = await made("red-flag", 1);
    await approveLoan(t.db, a.caseId, t.officer, {}, { now: NOW });
    await markNotCollected(t.db, a.caseId, t.officer, {}, { now: FRI });
    expect((await row(a.caseId)).status).toBe("not_collected");

    const b = await made("red-flag", 1);
    await expect(cancelByStaff(t.db, b.caseId, t.officer, { reason: {} })).rejects.toMatchObject({ field: "reason" });
    await cancelByStaff(t.db, b.caseId, t.officer, { reason: { th: "กิจกรรมถูกยกเลิก" } }, { now: NOW });
    expect((await row(b.caseId)).status).toBe("cancelled");
    const c = await made("red-flag", 1);
    await approveLoan(t.db, c.caseId, t.officer, {}, { now: NOW });
    await cancelByStaff(t.db, c.caseId, t.officer, { reason: { en: "Venue closed" } }, { now: NOW });
    expect((await row(c.caseId)).status).toBe("cancelled");
  });
});

describe("refusals", () => {
  it("refuses approval when the stock was taken since the request, and changes nothing", async () => {
    const c = await made("volleyball", 3);
    const v = await t.item("volleyball");
    await t.db.update(equipmentItems).set({ outOfService: 3 }).where(eq(equipmentItems.id, v.id));
    const attempt = approveLoan(t.db, c.caseId, t.officer, {}, { now: NOW });
    await expect(attempt).rejects.toBeInstanceOf(BorrowingError);
    await expect(attempt).rejects.toMatchObject({ code: "unavailable", detail: { shortfalls: [{ itemId: v.id, requested: 3, available: 1 }] } });
    expect((await row(c.caseId)).status).toBe("requested");
    expect((await req(c.caseId)).decidedAt).toBeNull();

    const [line] = await lines(c.caseId);
    await approveLoan(t.db, c.caseId, t.officer, { quantities: { [line!.id]: 1 } }, { now: NOW });
    expect((await row(c.caseId)).status).toBe("approved");
    await t.db.update(equipmentItems).set({ outOfService: 0 }).where(eq(equipmentItems.id, v.id));
  });

  it("only lowers quantities, to 1 or more, on lines of this request", async () => {
    const c = await made("basketball-net", 1);
    const other = await made("football-net", 1);
    const [line] = await lines(c.caseId);
    const [foreign] = await lines(other.caseId);
    for (const quantities of [{ [line!.id]: 2 }, { [line!.id]: 0 }, { [line!.id]: 1.5 }, { [foreign!.id]: 1 }]) {
      await expect(approveLoan(t.db, c.caseId, t.officer, { quantities }, { now: NOW })).rejects.toMatchObject({ field: "quantities" });
    }
    expect((await row(c.caseId)).status).toBe("requested");
  });

  it("refuses a step in the wrong status with invalid_transition", async () => {
    const requested = await made("relay-baton", 1);
    const goodLines = async (id: string) => Object.fromEntries((await lines(id)).map((l) => [l.id, { good: l.quantity, damaged: 0, lost: 0 }]));
    const handover = { checked: true, depositKind: "student_card" as const, depositCount: 1 };
    await expect(recordHandover(t.db, requested.caseId, t.officer, handover)).rejects.toMatchObject({ code: "invalid_transition" });
    await expect(recordReturn(t.db, requested.caseId, t.officer, { lines: await goodLines(requested.caseId), depositReturned: true })).rejects.toMatchObject({ code: "invalid_transition" });
    await expect(settleLoan(t.db, requested.caseId, t.officer, { settlement: "waived", depositReturned: true })).rejects.toMatchObject({ code: "invalid_transition" });
    await expect(markNotCollected(t.db, requested.caseId, t.officer)).rejects.toMatchObject({ code: "invalid_transition" });

    await approveLoan(t.db, requested.caseId, t.officer, {}, { now: NOW });
    await expect(approveLoan(t.db, requested.caseId, t.officer)).rejects.toMatchObject({ code: "invalid_transition" });
    await expect(declineLoan(t.db, requested.caseId, { reason: { en: "No" } }, t.officer)).rejects.toMatchObject({ code: "invalid_transition" });
    await expect(recordReturn(t.db, requested.caseId, t.officer, { lines: await goodLines(requested.caseId), depositReturned: true })).rejects.toMatchObject({ code: "invalid_transition" });

    await recordHandover(t.db, requested.caseId, t.officer, handover, { now: THU });
    await expect(recordHandover(t.db, requested.caseId, t.officer, handover)).rejects.toMatchObject({ code: "invalid_transition" });
    await expect(cancelByStaff(t.db, requested.caseId, t.officer, { reason: { en: "No" } })).rejects.toMatchObject({ code: "invalid_transition" });
    await recordReturn(t.db, requested.caseId, t.officer, { lines: await goodLines(requested.caseId), depositReturned: true }, { now: FRI });
    await expect(settleLoan(t.db, requested.caseId, t.officer, { settlement: "waived", depositReturned: true })).rejects.toMatchObject({ code: "invalid_transition" });
  });

  it("needs the condition ticked, a deposit kind and a count from 0 to 5", async () => {
    const c = await made("red-flag", 1);
    await approveLoan(t.db, c.caseId, t.officer, {}, { now: NOW });
    const ok = { checked: true, depositKind: "national_id_card" as const, depositCount: 2 };
    await expect(recordHandover(t.db, c.caseId, t.officer, { ...ok, checked: false })).rejects.toMatchObject({ field: "checked" });
    await expect(recordHandover(t.db, c.caseId, t.officer, { ...ok, depositCount: 6 })).rejects.toMatchObject({ field: "deposit" });
    await expect(recordHandover(t.db, c.caseId, t.officer, { ...ok, depositCount: Number.NaN })).rejects.toMatchObject({ field: "deposit" });
    await expect(recordHandover(t.db, c.caseId, t.officer, { ...ok, depositKind: "passport" as never })).rejects.toMatchObject({ field: "deposit" });
    await recordHandover(t.db, c.caseId, t.officer, { ...ok, depositCount: 0 }, { now: THU });
    expect((await row(c.caseId)).status).toBe("on_loan");
  });

  it("refuses staff without the equipment roles, and lets a unit lead work", async () => {
    const handler = await t.staff("Handler", "complaints_handler", "tusu");
    const c = await made("red-flag", 1);
    await expect(approveLoan(t.db, c.caseId, handler)).rejects.toMatchObject({ code: "forbidden" });
    await expect(declineLoan(t.db, c.caseId, { reason: { en: "No" } }, handler)).rejects.toMatchObject({ code: "forbidden" });
    await expect(readLoanFacts(t.db, c.caseId, handler)).rejects.toMatchObject({ code: "forbidden" });
    await expect(revealBorrowerDetails(t.db, c.caseId, handler, { env })).rejects.toMatchObject({ code: "forbidden" });
    await expect(listSchedule(t.db, handler, NOW)).rejects.toMatchObject({ code: "forbidden" });
    expect((await row(c.caseId)).status).toBe("requested");
    await approveLoan(t.db, c.caseId, t.lead, {}, { now: NOW });
    expect((await row(c.caseId)).status).toBe("approved");
  });

  it("reports an unknown case as not found", async () => {
    await expect(approveLoan(t.db, "00000000-0000-4000-8000-000000000000", t.officer)).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("reading", () => {
  it("shows the facts without any personal data, with free stock excluding the request", async () => {
    const c = await made("basketball-7", 2);
    const facts = await readLoanFacts(t.db, c.caseId, t.officer, { now: NOW });
    expect(facts).toMatchObject({ reference: c.reference, status: "requested", kind: "group", groupName: "Law Faculty Sports Club", overdue: false, hasDetails: true, depositCardsAsked: 1 });
    expect(facts.lines).toMatchObject([{ nameEn: "Basketball, size 7", unitEn: "ball", quantity: 2, free: 4 }]);
    const text = JSON.stringify(facts);
    expect(text).not.toContain("6501234567");
    expect(text).not.toContain("Somchai");
    expect(text).not.toContain("0812345678");
  });

  it("flags an overdue loan by the clock, never by status", async () => {
    const c = await onLoan("basketball-6", 1);
    expect((await readLoanFacts(t.db, c.caseId, t.officer, { now: at("2026-03-13", "15:00") })).overdue).toBe(false);
    const late = await readLoanFacts(t.db, c.caseId, t.officer, { now: at("2026-03-13", "17:00") });
    expect(late.overdue).toBe(true);
    expect(late.status).toBe("on_loan");
  });

  it("decrypts the student number only on request and logs each view", async () => {
    const c = await made("basketball-5", 1);
    const before = (await events(c.caseId)).filter((e) => e.type === "details_viewed").length;
    const details = await revealBorrowerDetails(t.db, c.caseId, t.officer, { now: NOW, env });
    expect(details).toEqual({ studentId: "6501234567", affiliation: null, faculty: null });
    await revealBorrowerDetails(t.db, c.caseId, t.officer, { now: NOW, env });
    const viewed = (await events(c.caseId)).filter((e) => e.type === "details_viewed");
    expect(viewed.length - before).toBe(2);
    expect(viewed[0]).toMatchObject({ visibility: "internal", actorUserId: t.officer.userId });
    const audits = await t.db.select().from(auditLog).where(and(eq(auditLog.entityId, c.caseId), eq(auditLog.action, "borrowing.view_details")));
    expect(audits.length).toBe(2);
    expect(JSON.stringify(audits)).not.toContain("6501234567");
  });
});

describe("the schedule", () => {
  it("groups open loans by what the desk has to do and when", async () => {
    const pending = await made("volleyball", 1);
    const approved = await made("table-tennis-ball", 5);
    expect(pending.caseId).not.toBe(approved.caseId);

    const ids = new Set([pending.caseId, approved.caseId]);
    const bucket = (rows: Array<{ caseId: string }>) => rows.filter((r) => ids.has(r.caseId)).map((r) => r.caseId);
    await approveLoan(t.db, approved.caseId, t.officer, {}, { now: NOW });

    const early = await listSchedule(t.db, t.officer, WED);
    expect(bucket(early.awaitingDecision)).toEqual([pending.caseId]);
    expect(bucket(early.collectionsNext7)).toEqual([approved.caseId]);
    expect(early.collectionsToday.map((r) => r.caseId)).not.toContain(approved.caseId);

    const day = await listSchedule(t.db, t.officer, at("2026-03-12", "08:00"));
    expect(bucket(day.collectionsToday)).toEqual([approved.caseId]);
    expect(day.collectionsToday[0]!.items.length).toBeGreaterThan(0);

    const missed = await listSchedule(t.db, t.officer, at("2026-03-13", "18:00"));
    expect(bucket(missed.collectionsMissed)).toEqual([approved.caseId]);
  });

  it("lists returns due today and next week, overdue loans and compensation due", async () => {
    const loan = await onLoan("substitution-board", 1);
    const damaged = await onLoan("basketball-net", 1);
    const [line] = await lines(damaged.caseId);
    await recordReturn(t.db, damaged.caseId, t.officer, { lines: { [line!.id]: { good: 0, damaged: 1, lost: 0 } }, depositReturned: false, compensationBaht: 80 }, { now: FRI });
    const mine = (rows: Array<{ caseId: string }>) => rows.filter((r) => r.caseId === loan.caseId || r.caseId === damaged.caseId).map((r) => r.caseId);

    const week = await listSchedule(t.db, t.officer, at("2026-03-12", "08:00"));
    expect(mine(week.returnsNext7)).toEqual([loan.caseId]);
    expect(mine(week.compensationDue)).toEqual([damaged.caseId]);
    expect(week.compensationDue.find((r) => r.caseId === damaged.caseId)!.compensationBaht).toBe(80);

    const today = await listSchedule(t.db, t.officer, at("2026-03-13", "09:00"));
    expect(mine(today.returnsToday)).toEqual([loan.caseId]);
    expect(mine(today.overdue)).toEqual([]);

    const late = await listSchedule(t.db, t.officer, at("2026-03-13", "17:30"));
    expect(mine(late.overdue)).toEqual([loan.caseId]);
    expect(mine(late.returnsToday)).toEqual([]);
  });
});
