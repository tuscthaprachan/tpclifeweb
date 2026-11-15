/**
 * When a loan is overdue and, while it is, how long it still holds stock. A
 * loan is overdue only while it is `on_loan` and its return time is strictly
 * before now. Overdue is never a status. The TS and SQL forms below must agree
 * (tests/unit/borrowing/overdue.test.ts checks the boundary instants).
 */

import { sql, type SQL, type SQLWrapper } from "drizzle-orm";
import { isPastDue } from "@/lib/cases/due";
import { borrowingRequests } from "@/lib/db/schema/borrowing";
import { cases } from "@/lib/db/schema/cases";

export interface LoanTimes {
  status: string;
  returnDueAt: Date;
}

/** True while a loan is out and past its return time. */
export function isLoanOverdue(row: LoanTimes, now: Date): boolean {
  return row.status === "on_loan" && isPastDue(row.returnDueAt, now);
}

/** Until when a loan holds its stock: its return time, or now once it is overdue and still out. */
export function loanHoldEnd(row: LoanTimes, now: Date): Date {
  return isLoanOverdue(row, now) ? now : row.returnDueAt;
}

interface LoanColumns {
  status: SQLWrapper;
  returnDueAt: SQLWrapper;
}

const COLUMNS: LoanColumns = { status: cases.status, returnDueAt: borrowingRequests.returnDueAt };

/** The SQL form of `isLoanOverdue`. The query must join `cases` and `borrowing_requests`, or pass its own columns. */
export function loanOverdueSql(now: Date, cols: LoanColumns = COLUMNS): SQL<boolean> {
  return sql<boolean>`(${cols.status} = 'on_loan' and ${cols.returnDueAt} < ${now.toISOString()}::timestamptz)`;
}

/** The SQL form of `loanHoldEnd`. */
export function loanHoldEndSql(now: Date, cols: LoanColumns = COLUMNS): SQL<Date> {
  return sql<Date>`(case when ${loanOverdueSql(now, cols)} then ${now.toISOString()}::timestamptz else ${cols.returnDueAt} end)`;
}
