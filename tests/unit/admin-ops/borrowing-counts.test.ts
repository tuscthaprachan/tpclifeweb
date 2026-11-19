import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { loadBorrowingCounts } from "@/lib/admin/dashboard/summary";
import * as schema from "@/lib/db/schema";
import { at, setupBorrowing, type Ctx } from "../borrowing/helpers";

let t: Ctx;

const DAYS = ["2026-03-12", "2026-03-13", "2026-03-16", "2026-03-17", "2026-03-18", "2026-03-19", "2026-03-20", "2026-03-23", "2026-03-24"];
let next = 0;

async function loan(status: string, returnDueAt?: Date) {
  const day = DAYS[next++]!;
  const made = await t.request({ collectAt: at(day, "10:00"), returnDueAt: at(day, "16:00") });
  await t.db.update(schema.cases).set({ status }).where(eq(schema.cases.id, made.caseId));
  if (returnDueAt) await t.db.update(schema.borrowingRequests).set({ collectAt: new Date(returnDueAt.getTime() - 7 * 24 * 3_600_000), returnDueAt }).where(eq(schema.borrowingRequests.caseId, made.caseId));
  return made.caseId;
}

beforeAll(async () => {
  t = await setupBorrowing();
});

describe("borrowing counts for the dashboard", () => {
  it("counts requests waiting, loans due later today and loans past their return time", async () => {
    const now = at("2026-03-13", "12:00");
    await loan("requested");
    await loan("requested");
    await loan("approved");
    await loan("on_loan", at("2026-03-13", "16:00"));
    await loan("on_loan", at("2026-03-13", "09:00"));
    await loan("on_loan", at("2026-03-12", "16:00"));
    await loan("on_loan", at("2026-03-14", "16:00"));
    await loan("returned", at("2026-03-10", "16:00"));
    expect(await loadBorrowingCounts(t.db, now)).toEqual({ pending: 2, collectToday: 0, dueToday: 1, overdue: 2 });
  });

  it("counts approved requests to be collected today", async () => {
    const now = at("2026-03-13", "12:00");
    const id = await loan("approved");
    await t.db.update(schema.borrowingRequests).set({ collectAt: at("2026-03-13", "15:00") }).where(eq(schema.borrowingRequests.caseId, id));
    expect((await loadBorrowingCounts(t.db, now)).collectToday).toBe(1);
  });
});
