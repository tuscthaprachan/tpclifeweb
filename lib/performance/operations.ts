/**
 * Operational counts for the staff dashboard (/admin/performance): how much is
 * open, how much is late and where the work sits. These are live counts of
 * cases, not published figures, so there is no small-number rule, but they
 * respect the complaint category restrictions: `caseVisibleTo` leaves out a
 * restricted complaint unless the person looking is named on its category, so
 * a count never tells an administrator that a sensitive complaint exists.
 */

import { and, count, eq, isNull, sql } from "drizzle-orm";
import type { AuditExecutor } from "@/lib/db/audit";
import { caseVisibleTo } from "@/lib/cases/restrictions";
import { cases, type CaseService } from "@/lib/db/schema/cases";
import { complaintCases } from "@/lib/db/schema/complaints";
import { organisations } from "@/lib/db/schema/organisations";
import { complaintEscalated, complaintOverdue } from "@/lib/complaints/overdue";

export interface OpenByStatus {
  service: CaseService;
  kind: string;
  status: string;
  n: number;
}

export interface DeskRow {
  /** Null for cases no desk holds yet. */
  organisationId: number | null;
  slug: string | null;
  nameTh: string | null;
  nameEn: string | null;
  /** Open lost and found cases held at this desk (`owning_organisation_id`). */
  held: number;
  /** Open cases, any service, last worked on by this desk (`acting_organisation_id`). */
  lastHandled: number;
}

export interface Operations {
  openByStatus: OpenByStatus[];
  complaints: {
    open: number;
    /** Open and not acknowledged by the acknowledge date. */
    acknowledgeOverdue: number;
    /** Open and past the resolve date. */
    resolveOverdue: number;
    /** Open and missing either date. */
    overdue: number;
    /** Open and flagged by the daily job. */
    escalated: number;
  };
  desks: DeskRow[];
}

export async function getOperations(db: AuditExecutor, userId: string, now: Date): Promise<Operations> {
  const at = now.toISOString();
  const visible = caseVisibleTo(userId);
  const open = and(isNull(cases.closedAt), visible);

  const openByStatus = await db
    .select({ service: cases.service, kind: cases.kind, status: cases.status, n: sql<number>`count(*)::int` })
    .from(cases)
    .where(open)
    .groupBy(cases.service, cases.kind, cases.status);

  const [c] = await db
    .select({
      open: sql<number>`count(*)::int`,
      acknowledgeOverdue: sql<number>`(count(*) filter (where ${complaintCases.acknowledgedAt} is null and ${complaintCases.acknowledgeDueAt} < ${at}::timestamptz))::int`,
      resolveOverdue: sql<number>`(count(*) filter (where ${complaintCases.resolveDueAt} < ${at}::timestamptz))::int`,
      overdue: sql<number>`(count(*) filter (where ${complaintOverdue(now)}))::int`,
      escalated: sql<number>`(count(*) filter (where ${complaintEscalated()}))::int`,
    })
    .from(complaintCases)
    .innerJoin(cases, eq(cases.id, complaintCases.caseId))
    .where(open);

  const held = await db
    .select({ id: cases.owningOrganisationId, n: count() })
    .from(cases)
    .where(and(open, eq(cases.service, "lost_found")))
    .groupBy(cases.owningOrganisationId);
  const handled = await db
    .select({ id: cases.actingOrganisationId, n: count() })
    .from(cases)
    .where(open)
    .groupBy(cases.actingOrganisationId);
  const orgs = await db.select({ id: organisations.id, slug: organisations.slug, nameTh: organisations.nameTh, nameEn: organisations.nameEn }).from(organisations).orderBy(organisations.id);

  const heldBy = new Map(held.map((r) => [r.id, Number(r.n)]));
  const handledBy = new Map(handled.map((r) => [r.id, Number(r.n)]));
  const desks: DeskRow[] = [
    ...orgs.map((o) => ({ organisationId: o.id, slug: o.slug, nameTh: o.nameTh, nameEn: o.nameEn, held: heldBy.get(o.id) ?? 0, lastHandled: handledBy.get(o.id) ?? 0 })),
    { organisationId: null, slug: null, nameTh: null, nameEn: null, held: heldBy.get(null) ?? 0, lastHandled: handledBy.get(null) ?? 0 },
  ];

  return {
    openByStatus: openByStatus.map((r) => ({ ...r, n: Number(r.n) })),
    complaints: {
      open: Number(c?.open ?? 0),
      acknowledgeOverdue: Number(c?.acknowledgeOverdue ?? 0),
      resolveOverdue: Number(c?.resolveOverdue ?? 0),
      overdue: Number(c?.overdue ?? 0),
      escalated: Number(c?.escalated ?? 0),
    },
    desks,
  };
}
