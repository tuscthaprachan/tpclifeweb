/**
 * The daily run for equipment loans (see vercel.json). Three jobs:
 *
 * - a reminder to return, to loans on loan or approved whose return falls on
 *   the next desk day (or any day between, if the job missed one), once;
 * - one overdue notice per loan that is on loan past its return time;
 * - sweeping abandoned request journeys.
 *
 * A reminder or notice is claimed (its timestamp set) before the email is
 * sent, so two overlapping runs cannot both send it; the claim is given back
 * if the email did not go, and the next run tries again. Loans with no address
 * on file are left out by the query, and nothing is sent at all when email is
 * not set up, so a later run can still do it.
 */

import { and, asc, eq, exists, inArray, isNull, lte, notExists, sql } from "drizzle-orm";
import type { PiiEnv } from "@/lib/crypto/pii";
import type { AuditExecutor } from "@/lib/db/audit";
import { borrowingJourneys, borrowingRequests } from "@/lib/db/schema/borrowing";
import { caseContacts, cases } from "@/lib/db/schema/cases";
import { notifications } from "@/lib/db/schema/notifications";
import { createNotifications, serviceStaffIds } from "@/lib/notifications/create";
import { isEmailConfigured, type EmailSender } from "@/lib/email";
import { notifyBorrower } from "./notify";
import { loanOverdueSql } from "./overdue";
import { addDays, dayKeyOf, isDeskDay } from "./time";

export interface BorrowingDailyResult {
  reminded: number;
  overdue: number;
  /** Notifications to officers about loans past their return time (separate from the borrower's email). */
  notified: number;
  journeysSwept: number;
}

/** The first desk day after `today`: Friday looks ahead to Monday. */
export function nextDeskDay(today: string): string {
  let day = addDays(today, 1);
  while (!isDeskDay(day)) day = addDays(day, 1);
  return day;
}

type Opts = { sender?: EmailSender; emailConfigured?: boolean; env?: PiiEnv };

const hasBorrowerEmail = () =>
  exists(
    // Correlated to the case in the outer query.
    sql`(select 1 from ${caseContacts} as bc where bc.case_id = ${cases.id} and bc.role = 'borrower' and bc.email_enc is not null)`,
  );

async function claimAndSend(
  db: AuditExecutor,
  now: Date,
  opts: Opts,
  kind: "reminder" | "overdue",
  candidates: string[],
  column: typeof borrowingRequests.reminderSentAt | typeof borrowingRequests.overdueNotifiedAt,
): Promise<number> {
  const set = kind === "reminder" ? { reminderSentAt: now } : { overdueNotifiedAt: now };
  const release = kind === "reminder" ? { reminderSentAt: null } : { overdueNotifiedAt: null };
  let sent = 0;
  for (const caseId of candidates) {
    const claimed = await db
      .update(borrowingRequests)
      .set(set)
      .where(and(eq(borrowingRequests.caseId, caseId), isNull(column)))
      .returning({ id: borrowingRequests.caseId });
    if (claimed.length === 0) continue;
    const outcome = await notifyBorrower(db, caseId, kind, { kind: "system" }, { ...opts, now });
    if (outcome.result === "sent") sent += 1;
    else await db.update(borrowingRequests).set(release).where(eq(borrowingRequests.caseId, caseId));
  }
  return sent;
}

export async function runBorrowingDaily(db: AuditExecutor, now: Date, opts: Opts = {}): Promise<BorrowingDailyResult> {
  const result: BorrowingDailyResult = { reminded: 0, overdue: 0, notified: 0, journeysSwept: 0 };
  if (opts.emailConfigured ?? isEmailConfigured()) {
    const settings = { ...opts, emailConfigured: true };
    const today = dayKeyOf(now);
    const horizon = nextDeskDay(today);

    const loans = await db
      .select({ id: cases.id, status: cases.status, returnDueAt: borrowingRequests.returnDueAt })
      .from(cases)
      .innerJoin(borrowingRequests, eq(borrowingRequests.caseId, cases.id))
      .where(
        and(
          eq(cases.service, "borrowing"),
          inArray(cases.status, ["on_loan", "approved"]),
          isNull(cases.piiDeletedAt),
          isNull(borrowingRequests.reminderSentAt),
          hasBorrowerEmail(),
        ),
      );
    const due = loans.filter((l) => {
      const day = dayKeyOf(l.returnDueAt);
      return day > today && day <= horizon;
    });
    result.reminded = await claimAndSend(db, now, settings, "reminder", due.map((l) => l.id), borrowingRequests.reminderSentAt);

    const late = await db
      .select({ id: cases.id })
      .from(cases)
      .innerJoin(borrowingRequests, eq(borrowingRequests.caseId, cases.id))
      .where(
        and(
          eq(cases.service, "borrowing"),
          loanOverdueSql(now),
          isNull(cases.piiDeletedAt),
          isNull(borrowingRequests.overdueNotifiedAt),
          hasBorrowerEmail(),
        ),
      );
    result.overdue = await claimAndSend(db, now, settings, "overdue", late.map((l) => l.id), borrowingRequests.overdueNotifiedAt);
  }
  result.notified = await notifyOverdueToOfficers(db, now);
  const swept = await db.delete(borrowingJourneys).where(lte(borrowingJourneys.expiresAt, now)).returning({ id: borrowingJourneys.id });
  result.journeysSwept = swept.length;
  return result;
}

/** The dedupe key of the officers' notice for a loan: one per loan, however often the job runs. */
export const overdueDedupeKey = (caseId: string) => `overdue:${caseId}`;

/**
 * Tells every officer about each loan still out past its return time, once per
 * loan, whether or not the borrower can be emailed. The scan skips loans that
 * already have a notice and takes the longest overdue first, so a backlog of
 * notified loans can never crowd newer ones out of the batch.
 */
export async function notifyOverdueToOfficers(db: AuditExecutor, now: Date): Promise<number> {
  const late = await db
    .select({ id: cases.id, reference: cases.reference, returnDueAt: borrowingRequests.returnDueAt })
    .from(cases)
    .innerJoin(borrowingRequests, eq(borrowingRequests.caseId, cases.id))
    .where(
      and(
        eq(cases.service, "borrowing"),
        loanOverdueSql(now),
        isNull(cases.piiDeletedAt),
        notExists(sql`(select 1 from ${notifications} as n where n.dedupe_key = 'overdue:' || ${cases.id}::text)`),
      ),
    )
    .orderBy(asc(borrowingRequests.returnDueAt), asc(cases.id))
    .limit(500);
  if (late.length === 0) return 0;
  const officers = await serviceStaffIds(db, "borrowing");
  let added = 0;
  for (const loan of late) {
    added += await createNotifications(
      db,
      officers.map((userId) => ({
        userId,
        kind: "borrowing_overdue" as const,
        params: { reference: loan.reference, dueAt: loan.returnDueAt.toISOString() },
        href: `/admin/cases/${loan.id}`,
        entityType: "case",
        entityId: loan.id,
        dedupeKey: overdueDedupeKey(loan.id),
      })),
      now,
    );
  }
  return added;
}
