/**
 * When a complaint has missed a target. It is overdue while it is open and has
 * not been acknowledged by the acknowledge date, or is past the resolve date;
 * "past" is strictly before now (`isPastDue`), so a target is met at the very
 * instant it falls due. `complaintClock` is the one TS derivation, and the SQL
 * builders below are its query form, shared by the inbox filter, its row tags
 * and the daily escalation job. They are written against `complaint_cases` and
 * `cases`, so a query must join both (the inbox left-joins `complaint_cases`;
 * a lost and found row has no match and is never overdue).
 */

import { sql, type SQL } from "drizzle-orm";
import { isPastDue } from "@/lib/cases/due";
import { cases } from "@/lib/db/schema/cases";
import { complaintCases } from "@/lib/db/schema/complaints";

/** Why a complaint was flagged: it missed the acknowledge target, or (later, and final) the resolve target. */
export type EscalationReason = "acknowledge" | "resolve";

/** Narrows the stored `escalated_reason` text to the union; anything unknown reads as not escalated. */
export function toEscalationReason(value: string | null | undefined): EscalationReason | null {
  return value === "acknowledge" || value === "resolve" ? value : null;
}

export interface ClockRow {
  acknowledgedAt: Date | null;
  acknowledgeDueAt: Date;
  resolveDueAt: Date;
  closedAt: Date | null;
  escalatedReason: string | null;
}

export interface ComplaintClock {
  acknowledgeMissed: boolean;
  resolveMissed: boolean;
  /** Open and has missed either target. */
  overdue: boolean;
  /** The date the inbox shows: the acknowledge date until acknowledged, then the resolve date. */
  dueAt: Date;
  /** The reason to record now, or null when it is closed, on time, or already flagged for that reason or a later one. */
  escalation: EscalationReason | null;
}

/** The acknowledge and resolve targets of a complaint at `now`, and what escalation (if any) is newly due. */
export function complaintClock(row: ClockRow, now: Date): ComplaintClock {
  const open = row.closedAt === null;
  const acknowledgeMissed = open && row.acknowledgedAt === null && isPastDue(row.acknowledgeDueAt, now);
  const resolveMissed = open && isPastDue(row.resolveDueAt, now);
  const flagged = toEscalationReason(row.escalatedReason);
  const escalation: EscalationReason | null = resolveMissed && flagged !== "resolve" ? "resolve" : acknowledgeMissed && flagged === null ? "acknowledge" : null;
  return {
    acknowledgeMissed,
    resolveMissed,
    overdue: acknowledgeMissed || resolveMissed,
    dueAt: row.acknowledgedAt === null ? row.acknowledgeDueAt : row.resolveDueAt,
    escalation,
  };
}

/** SQL form of `acknowledgeMissed` before the open check: not acknowledged and past the acknowledge date. */
export function acknowledgeMissedSql(now: Date): SQL<boolean> {
  return sql<boolean>`(${complaintCases.acknowledgedAt} is null and ${complaintCases.acknowledgeDueAt} < ${now.toISOString()}::timestamptz)`;
}

/** SQL form of `resolveMissed` before the open check: past the resolve date. */
export function resolveMissedSql(now: Date): SQL<boolean> {
  return sql<boolean>`(${complaintCases.resolveDueAt} < ${now.toISOString()}::timestamptz)`;
}

export function complaintOverdue(now: Date): SQL<boolean> {
  return sql<boolean>`(${complaintCases.caseId} is not null and ${cases.closedAt} is null and (${acknowledgeMissedSql(now)} or ${resolveMissedSql(now)}))`;
}

export function complaintEscalated(): SQL<boolean> {
  return sql<boolean>`(${complaintCases.escalatedAt} is not null and ${cases.closedAt} is null)`;
}
