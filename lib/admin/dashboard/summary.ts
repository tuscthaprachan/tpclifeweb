import "server-only";

import { and, count, desc, eq, getTableColumns, inArray, isNull, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { alertWindow } from "@/lib/content/window";
import { countContentTypes } from "@/lib/admin/content/list";
import { CONTENT_TYPES } from "@/lib/admin/content/types";
import { isListedContentType } from "@/lib/admin/nav";
import { accessibleServices } from "@/lib/cases/access";
import { loanOverdueSql } from "@/lib/borrowing/overdue";
import { addDays, dayKeyOf, dayStart } from "@/lib/borrowing/time";
import { listCases } from "@/lib/cases/engine";
import { caseVisibleTo } from "@/lib/cases/restrictions";
import type { ActiveRole } from "@/lib/auth/roles";
import type { StaffActor } from "@/lib/cases/types";
import { complaintEscalated } from "@/lib/complaints/overdue";
import type { AuditExecutor } from "@/lib/db/audit";
import { borrowingRequests } from "@/lib/db/schema/borrowing";
import { cases, type CaseService } from "@/lib/db/schema/cases";
import { complaintCases } from "@/lib/db/schema/complaints";
import { serviceAlerts } from "@/lib/db/schema";

export interface CaseCounts {
  open: number;
  overdue: number;
  escalated: number;
  unassigned: number;
  mine: number;
  /** Whether the person works complaints, the only service with targets. */
  complaints: boolean;
}

/** Inbox counts, through the same `listCases` the inbox uses so visibility and access match exactly. */
export async function loadCaseCounts(db: AuditExecutor, actor: StaffActor): Promise<CaseCounts> {
  const services = accessibleServices(actor.roles);
  const complaints = services.includes("complaint");
  const total = async (filters: Parameters<typeof listCases>[2]) => (await listCases(db, actor, { ...filters, pageSize: 1 })).total;
  const escalated = async () => {
    if (!complaints) return 0;
    const [row] = await db
      .select({ n: count() })
      .from(cases)
      .innerJoin(complaintCases, eq(complaintCases.caseId, cases.id))
      .where(and(eq(cases.service, "complaint"), caseVisibleTo(actor.userId), complaintEscalated()));
    return row?.n ?? 0;
  };
  const [open, overdue, unassigned, mine, esc] = await Promise.all([
    total({ openOnly: true }),
    complaints ? total({ overdue: true }) : 0,
    total({ openOnly: true, assignee: "unassigned" }),
    total({ openOnly: true, assignee: "me" }),
    escalated(),
  ]);
  return { open, overdue, escalated: esc, unassigned, mine, complaints };
}

export interface EditorCounts {
  drafts: number;
  /** Published items whose end date has passed, across every type with a window. */
  expired: number;
  liveAlerts: number;
}

export async function loadEditorCounts(db: AuditExecutor, now = new Date()): Promise<EditorCounts> {
  const counts = await countContentTypes(db, CONTENT_TYPES.filter((d) => isListedContentType(d) && d.columns.status));
  let drafts = 0;
  let expired = 0;
  for (const c of counts.values()) {
    drafts += c.total - c.published;
    expired += c.expired;
  }
  const [alerts] = await db
    .select({ n: count() })
    .from(serviceAlerts)
    .where(alertWindow(now));
  return { drafts, expired, liveAlerts: alerts?.n ?? 0 };
}

export interface BorrowingCounts {
  /** Requests waiting for a decision. */
  pending: number;
  /** Approved and due to be collected today (Bangkok time). */
  collectToday: number;
  /** On loan and due back later today (Bangkok time). */
  dueToday: number;
  /** On loan and past the return time. */
  overdue: number;
}

export async function loadBorrowingCounts(db: AuditExecutor, now = new Date()): Promise<BorrowingCounts> {
  const today = dayStart(dayKeyOf(now));
  const tomorrow = dayStart(addDays(dayKeyOf(now), 1));
  const [row] = await db
    .select({
      pending: sql<number>`count(*) filter (where ${cases.status} = 'requested')::int`,
      collectToday: sql<number>`count(*) filter (where ${cases.status} = 'approved' and ${borrowingRequests.collectAt} >= ${today} and ${borrowingRequests.collectAt} < ${tomorrow})::int`,
      dueToday: sql<number>`count(*) filter (where ${cases.status} = 'on_loan' and not ${loanOverdueSql(now)} and ${borrowingRequests.returnDueAt} < ${tomorrow})::int`,
      overdue: sql<number>`count(*) filter (where ${loanOverdueSql(now)})::int`,
    })
    .from(cases)
    .innerJoin(borrowingRequests, eq(borrowingRequests.caseId, cases.id))
    .where(eq(cases.service, "borrowing"));
  return { pending: row?.pending ?? 0, collectToday: row?.collectToday ?? 0, dueToday: row?.dueToday ?? 0, overdue: row?.overdue ?? 0 };
}

export interface MyCases {
  service: CaseService;
  open: number;
}

/** Open cases assigned to the person, by service, limited to services their roles cover and cases they may see. */
export async function loadMyCases(db: AuditExecutor, userId: string, roles: readonly ActiveRole[]): Promise<MyCases[]> {
  const services = accessibleServices(roles);
  if (services.length === 0) return [];
  const rows = await db
    .select({ service: cases.service, open: count() })
    .from(cases)
    .where(and(eq(cases.assignedTo, userId), isNull(cases.closedAt), inArray(cases.service, services), caseVisibleTo(userId)))
    .groupBy(cases.service);
  return services.map((service) => ({ service, open: rows.find((r) => r.service === service)?.open ?? 0 }));
}

export interface MyDraft {
  key: string;
  typeKey: string;
  id: string;
  title: { th: string; en: string };
  updatedAt: Date;
}

/** Unpublished content whose last edit was by this person, newest first. */
export async function loadMyDrafts(db: AuditExecutor, userId: string, limit = 5): Promise<MyDraft[]> {
  const defs = CONTENT_TYPES.filter((d) => isListedContentType(d) && d.kind === "collection" && d.columns.title !== null && d.columns.status !== null);
  const perType = await Promise.all(
    defs.map(async (def) => {
      const updatedBy = (getTableColumns(def.table) as Record<string, AnyPgColumn>).updatedBy;
      if (!updatedBy) return [];
      const { id, title, status, updatedAt } = def.columns;
      const rows = await db
        .select({ id, titleTh: title![0], titleEn: title![1], updatedAt })
        .from(def.table)
        .where(and(def.where, eq(updatedBy, userId), sql`${status!} <> 'published'`))
        .orderBy(desc(updatedAt))
        .limit(limit);
      return rows.map((r): MyDraft => ({ key: `${def.key}:${r.id as string}`, typeKey: def.key, id: r.id as string, title: { th: String(r.titleTh ?? ""), en: String(r.titleEn ?? "") }, updatedAt: new Date(r.updatedAt as Date) }));
    }),
  );
  return perType.flat().sort((x, y) => y.updatedAt.getTime() - x.updatedAt.getTime()).slice(0, limit);
}
