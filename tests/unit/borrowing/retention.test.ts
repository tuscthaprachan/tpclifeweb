/** One year after a loan closes the student number and affiliation go with the contacts. */
import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { borrowingRequests, caseContacts, caseEvents, cases } from "@/lib/db/schema";
import { purgeExpiredPii } from "@/lib/cases";
import { purgeBorrowingPii } from "@/lib/borrowing/retention";
import { approveLoan, readLoanFacts, recordHandover, recordReturn, revealBorrowerDetails } from "@/lib/borrowing/workflow";
import { at, env, NOW, setupBorrowing, type Ctx } from "./helpers";

let t: Ctx;
beforeAll(async () => {
  t = await setupBorrowing();
});

const req = async (id: string) => (await t.db.select().from(borrowingRequests).where(eq(borrowingRequests.caseId, id)))[0]!;

async function closedLoan(over: Parameters<Ctx["request"]>[0] = {}) {
  const c = await t.request(over);
  await approveLoan(t.db, c.caseId, t.officer, {}, { now: NOW });
  await recordHandover(t.db, c.caseId, t.officer, { checked: true, depositKind: "student_card", depositCount: 1 }, { now: at("2026-03-12") });
  const lines = await t.db.query.borrowingLines.findMany({ where: (l, { eq: same }) => same(l.caseId, c.caseId) });
  const counts = Object.fromEntries(lines.map((l) => [l.id, { good: l.quantity, damaged: 0, lost: 0 }]));
  await recordReturn(t.db, c.caseId, t.officer, { lines: counts, depositReturned: true }, { now: at("2026-03-13", "15:00") });
  return c;
}

describe("borrowing retention", () => {
  it("clears the student number and affiliation with the contacts, and keeps the loan facts", async () => {
    const student = await closedLoan();
    const outsider = await closedLoan({ studentId: null, affiliation: "Chulalongkorn University" });
    expect((await req(student.caseId)).studentIdEnc).not.toBeNull();
    expect((await req(outsider.caseId)).affiliationEnc).not.toBeNull();
    expect((await t.db.select().from(cases).where(eq(cases.id, student.caseId)))[0]!.piiDeleteAfter).not.toBeNull();

    expect((await purgeExpiredPii(t.db, at("2026-12-01"))).purged).toBe(0);
    expect((await req(student.caseId)).studentIdEnc).not.toBeNull();

    const result = await purgeExpiredPii(t.db, at("2027-03-15"));
    expect(result.purged).toBe(2);
    for (const c of [student, outsider]) {
      expect(await req(c.caseId)).toMatchObject({ studentIdEnc: null, affiliationEnc: null, eventName: "Freshers football match", depositKind: "student_card" });
      expect((await t.db.select().from(caseContacts).where(eq(caseContacts.caseId, c.caseId))).length).toBe(0);
      expect((await t.db.select().from(cases).where(eq(cases.id, c.caseId)))[0]!.piiDeletedAt).not.toBeNull();
    }

    const facts = await readLoanFacts(t.db, student.caseId, t.officer, { now: at("2027-03-15") });
    expect(facts).toMatchObject({ status: "returned", hasDetails: false, eventName: "Freshers football match" });
  });

  it("shows nothing and logs nothing for details that are gone", async () => {
    const c = await closedLoan();
    await purgeExpiredPii(t.db, at("2027-03-15"));
    const before = (await t.db.select().from(caseEvents).where(eq(caseEvents.caseId, c.caseId))).filter((e) => e.type === "details_viewed").length;
    expect(await revealBorrowerDetails(t.db, c.caseId, t.officer, { env })).toBeNull();
    const after = (await t.db.select().from(caseEvents).where(eq(caseEvents.caseId, c.caseId))).filter((e) => e.type === "details_viewed").length;
    expect(after).toBe(before);
  });

  it("purgeBorrowingPii reports how many requests it cleared", async () => {
    const c = await t.request();
    expect(await t.db.transaction((tx) => purgeBorrowingPii(tx, c.caseId))).toEqual({ requests: 1 });
    expect((await req(c.caseId)).studentIdEnc).toBeNull();
    expect(await t.db.transaction((tx) => purgeBorrowingPii(tx, "00000000-0000-4000-8000-000000000000"))).toEqual({ requests: 0 });
  });
});
