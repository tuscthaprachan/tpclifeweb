/** Loan overdue: the TS and SQL forms agree at the boundary, and the status lists follow the loan machine. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { CANCELLABLE_STATUSES, HOLDING_STATUSES, OPEN_LOAN_STATUSES } from "@/lib/borrowing/constants";
import { isLoanOverdue, loanHoldEnd, loanHoldEndSql, loanOverdueSql } from "@/lib/borrowing/overdue";
import { allowedTransitions, getMachine } from "@/lib/cases/services";
import { queryOne } from "@/lib/performance/sql";
import { createTestDb } from "../db/harness";

const DUE = new Date("2026-03-13T09:00:00Z");
const instants = [
  ["1 ms before due", new Date(DUE.getTime() - 1)],
  ["exactly due", DUE],
  ["1 ms after due", new Date(DUE.getTime() + 1)],
] as const;
const MACHINE = getMachine("borrowing", "loan")!;

describe("isLoanOverdue", () => {
  it("is false before and at the return time, true strictly after, and only while on loan", () => {
    expect(isLoanOverdue({ status: "on_loan", returnDueAt: DUE }, new Date(DUE.getTime() - 1))).toBe(false);
    expect(isLoanOverdue({ status: "on_loan", returnDueAt: DUE }, DUE)).toBe(false);
    expect(isLoanOverdue({ status: "on_loan", returnDueAt: DUE }, new Date(DUE.getTime() + 1))).toBe(true);
    for (const status of ["requested", "approved", "returned", "compensation_due"]) {
      expect(isLoanOverdue({ status, returnDueAt: DUE }, new Date(DUE.getTime() + 1))).toBe(false);
    }
  });

  it("holds until the return time, then until now while still out", () => {
    const later = new Date(DUE.getTime() + 5);
    expect(loanHoldEnd({ status: "on_loan", returnDueAt: DUE }, DUE)).toEqual(DUE);
    expect(loanHoldEnd({ status: "on_loan", returnDueAt: DUE }, later)).toEqual(later);
    expect(loanHoldEnd({ status: "approved", returnDueAt: DUE }, later)).toEqual(DUE);
  });
});

describe("TS and SQL forms agree", () => {
  let db: Awaited<ReturnType<typeof createTestDb>>["db"];
  let close: () => Promise<void>;
  beforeAll(async () => {
    const t = await createTestDb();
    db = t.db;
    close = () => t.client.close();
  }, 60_000);
  afterAll(() => close());

  for (const [label, now] of instants) {
    for (const status of ["on_loan", "approved"]) {
      it(`${status}, ${label}`, async () => {
        const cols = { status: sql`${status}::text`, returnDueAt: sql`${DUE.toISOString()}::timestamptz` };
        const row = await queryOne<{ overdue: boolean; hold_end: Date | string }>(db, sql`select ${loanOverdueSql(now, cols)} as overdue, ${loanHoldEndSql(now, cols)} as hold_end`);
        expect(row.overdue).toBe(isLoanOverdue({ status, returnDueAt: DUE }, now));
        expect(new Date(row.hold_end!).getTime()).toBe(loanHoldEnd({ status, returnDueAt: DUE }, now).getTime());
      });
    }
  }
});

describe("status lists follow the loan machine", () => {
  it("cancellable is every status the borrower may cancel from", () => {
    expect([...CANCELLABLE_STATUSES]).toEqual(["requested", "approved"]);
    for (const status of Object.keys(MACHINE.statuses)) {
      expect(CANCELLABLE_STATUSES.includes(status), status).toBe(allowedTransitions("borrowing", "loan", status, "public").includes("cancelled"));
    }
  });

  it("open is every non-terminal status, and holding is open before the return", () => {
    expect([...OPEN_LOAN_STATUSES].sort()).toEqual(["approved", "compensation_due", "on_loan", "requested"]);
    for (const status of HOLDING_STATUSES) expect(OPEN_LOAN_STATUSES).toContain(status);
    expect([...HOLDING_STATUSES]).toEqual(["requested", "approved", "on_loan"]);
    for (const status of CANCELLABLE_STATUSES) expect(HOLDING_STATUSES as readonly string[]).toContain(status);
  });
});
