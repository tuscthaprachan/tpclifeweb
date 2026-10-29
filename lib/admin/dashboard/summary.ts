import "server-only";

import { and, count, desc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { countContentTypes } from "@/lib/admin/content/list";
import { CONTENT_TYPES, type ContentTypeDef } from "@/lib/admin/content/types";
import { accessibleServices } from "@/lib/cases/access";
import { listCases } from "@/lib/cases/engine";
import { caseVisibleTo } from "@/lib/cases/restrictions";
import type { StaffActor } from "@/lib/cases/types";
import { complaintEscalated } from "@/lib/complaints/overdue";
import type { AuditExecutor } from "@/lib/db/audit";
import { cases } from "@/lib/db/schema/cases";
import { complaintCases } from "@/lib/db/schema/complaints";
import type { ContentStatus } from "@/lib/db/schema/content/enums";
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
  liveAlerts: number;
}

export async function loadEditorCounts(db: AuditExecutor, now = new Date()): Promise<EditorCounts> {
  const counts = await countContentTypes(db, CONTENT_TYPES.filter((d) => d.available && d.columns.status));
  let drafts = 0;
  for (const c of counts.values()) drafts += c.total - c.published;
  const [alerts] = await db
    .select({ n: count() })
    .from(serviceAlerts)
    .where(and(eq(serviceAlerts.status, "published"), lte(serviceAlerts.startsAt, now), or(isNull(serviceAlerts.endsAt), gte(serviceAlerts.endsAt, now))));
  return { drafts, liveAlerts: alerts?.n ?? 0 };
}

export interface RecentItem {
  key: string;
  typeKey: string;
  id: string;
  title: { th: string; en: string };
  status: ContentStatus | null;
  updatedAt: Date;
}

/** The most recently updated rows across all collection types: the newest few of each, merged. */
export async function loadRecentContent(db: AuditExecutor, limit = 8): Promise<RecentItem[]> {
  const defs = CONTENT_TYPES.filter((d): d is ContentTypeDef & { columns: { title: [never, never] } } => d.available && d.kind === "collection" && d.columns.title !== null);
  const perType = await Promise.all(
    defs.map(async (def) => {
      const { id, title, status, updatedAt } = def.columns;
      const rows = await db
        .select({ id, titleTh: title![0], titleEn: title![1], status: status ?? sql<null>`null`, updatedAt })
        .from(def.table)
        .where(def.where)
        .orderBy(desc(updatedAt))
        .limit(limit);
      return rows.map(
        (r): RecentItem => ({
          key: `${def.key}:${r.id as string}`,
          typeKey: def.key,
          id: r.id as string,
          title: { th: String(r.titleTh ?? ""), en: String(r.titleEn ?? "") },
          status: (r.status as ContentStatus | null) ?? null,
          updatedAt: new Date(r.updatedAt as Date),
        }),
      );
    }),
  );
  return perType.flat().sort((x, y) => y.updatedAt.getTime() - x.updatedAt.getTime()).slice(0, limit);
}

