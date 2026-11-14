/**
 * The due date shown in the inbox and used to sort by it. A complaint's is the
 * date it must be acknowledged by until it has been, then the date it must be
 * resolved by; a loan's is its return time while it is out. Other cases have
 * none, and a closed case has none. `caseDueAt` is the SQL for it (the query
 * must left-join `complaint_cases` and `borrowing_requests`); `dueState` turns
 * a date into the indicator.
 */

import { sql, type SQL } from "drizzle-orm";
import { addWorkingDays } from "@/lib/complaints/working-days";
import { cases } from "@/lib/db/schema/cases";
import { borrowingRequests } from "@/lib/db/schema/borrowing";
import { complaintCases } from "@/lib/db/schema/complaints";

export type DueState = "overdue" | "soon" | "on_time";

export function caseDueAt(): SQL<Date | null> {
  return sql<Date | null>`(case
    when ${complaintCases.caseId} is not null and ${cases.closedAt} is null then (case when ${complaintCases.acknowledgedAt} is null then ${complaintCases.acknowledgeDueAt} else ${complaintCases.resolveDueAt} end)
    when ${borrowingRequests.caseId} is not null and ${cases.status} = 'on_loan' then ${borrowingRequests.returnDueAt}
    else null end)`;
}

/** Past it is overdue; by the end of the next working day is due soon; otherwise on time. No date, no state. */
export function dueState(dueAt: Date | null | undefined, now: Date): DueState | null {
  if (!dueAt) return null;
  if (dueAt.getTime() < now.getTime()) return "overdue";
  return dueAt.getTime() <= addWorkingDays(now, 1).getTime() ? "soon" : "on_time";
}
