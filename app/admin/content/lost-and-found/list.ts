import { and, desc, eq, ilike, or } from "drizzle-orm";
import type { AuditExecutor } from "@/lib/db/audit";
import { lostFoundItems } from "@/lib/db/schema";
import type { ContentStatus } from "@/lib/db/schema/content/enums";

/** One row of the lost and found list. Only public columns are read; the private ones are never selected here. */
export interface LostFoundListRow {
  id: string;
  reference: string;
  kind: "lost" | "found";
  title: { th: string; en: string };
  status: ContentStatus;
  registerStatus: "open" | "matched" | "returned" | "unclaimed" | "withdrawn";
  submittedByStudent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const escapeLike = (q: string) => q.replace(/[\\%_]/g, (c) => `\\${c}`);

const columns = {
  id: lostFoundItems.id,
  reference: lostFoundItems.reference,
  kind: lostFoundItems.kind,
  titleTh: lostFoundItems.titleTh,
  titleEn: lostFoundItems.titleEn,
  status: lostFoundItems.status,
  registerStatus: lostFoundItems.registerStatus,
  submittedByStudent: lostFoundItems.submittedByStudent,
  createdAt: lostFoundItems.createdAt,
  updatedAt: lostFoundItems.updatedAt,
};

const toRow = (r: { titleTh: string; titleEn: string } & Omit<LostFoundListRow, "title">): LostFoundListRow => {
  const { titleTh, titleEn, ...rest } = r;
  return { ...rest, title: { th: titleTh, en: titleEn } };
};

/** Reports sent in through the website that no one has published yet, oldest first so none waits unseen. */
export async function listPendingReports(db: AuditExecutor): Promise<LostFoundListRow[]> {
  const rows = await db
    .select(columns)
    .from(lostFoundItems)
    .where(and(eq(lostFoundItems.status, "draft"), eq(lostFoundItems.submittedByStudent, true)))
    .orderBy(lostFoundItems.createdAt)
    .limit(200);
  return rows.map(toRow);
}

/** Every listing, newest edit first, optionally filtered by reference or text in either title. */
export async function listLostFound(db: AuditExecutor, q?: string, limit = 200): Promise<LostFoundListRow[]> {
  const term = q?.trim();
  const like = term ? `%${escapeLike(term)}%` : undefined;
  const rows = await db
    .select(columns)
    .from(lostFoundItems)
    .where(like ? or(ilike(lostFoundItems.titleTh, like), ilike(lostFoundItems.titleEn, like), ilike(lostFoundItems.reference, like)) : undefined)
    .orderBy(desc(lostFoundItems.updatedAt))
    .limit(limit);
  return rows.map(toRow);
}
