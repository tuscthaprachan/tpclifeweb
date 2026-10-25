/**
 * "Overdue" as one SQL condition, shared by the inbox filter and its row tags.
 * A complaint is overdue while it is open and has missed a target: it has not
 * been acknowledged by the acknowledge date, or it is past the resolve date.
 * Written against `complaint_cases` and `cases`, so the query must join both
 * (the inbox left-joins `complaint_cases`; a lost and found row has no match
 * and is never overdue).
 */

import { sql, type SQL } from "drizzle-orm";
import { cases } from "@/lib/db/schema/cases";
import { complaintCases } from "@/lib/db/schema/complaints";

export function complaintOverdue(now: Date): SQL<boolean> {
  const at = now.toISOString();
  return sql<boolean>`(${complaintCases.caseId} is not null and ${cases.closedAt} is null and ((${complaintCases.acknowledgedAt} is null and ${complaintCases.acknowledgeDueAt} < ${at}::timestamptz) or ${complaintCases.resolveDueAt} < ${at}::timestamptz))`;
}

export function complaintEscalated(): SQL<boolean> {
  return sql<boolean>`(${complaintCases.escalatedAt} is not null and ${cases.closedAt} is null)`;
}
