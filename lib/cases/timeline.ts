/**
 * The public side of a case: what the person sees on the tracking page.
 * Only events stored as `public` are read, and only the columns that are
 * written for the public (never `body`, the actor or the metadata). Events
 * tagged with a claim id are for that claim's own tracking view and never
 * appear here. Status
 * titles come from the service's state machine, so they are bilingual and
 * consistent with the staff console.
 */

import { asc, and, eq, sql } from "drizzle-orm";
import type { AuditExecutor } from "@/lib/db/audit";
import { caseEvents, cases, type CaseService } from "@/lib/db/schema/cases";
import type { Locale, LocaleString } from "@/lib/i18n/config";
import { getStatusDef, publicStatusLabel } from "./services";
import { CaseError } from "./types";

/** A message written by staff in Thai, English or both. */
export interface PublicBody {
  th: string | null;
  en: string | null;
}

export interface PublicTimelineEntry {
  id: string;
  at: Date;
  type: string;
  title: LocaleString;
  /** A message written by staff, if any. */
  body: PublicBody | null;
}

/** The reader's language, else the other, with the language the text is in (for the `lang` attribute). Null when there is no text. */
export function localisedBody(body: PublicBody | null | undefined, locale: Locale): { text: string; lang: Locale } | null {
  if (!body) return null;
  const other: Locale = locale === "th" ? "en" : "th";
  for (const lang of [locale, other]) {
    const text = body[lang]?.trim();
    if (text) return { text, lang };
  }
  return null;
}

const CREATED_TITLE: LocaleString = { th: "รับเรื่องแล้ว", en: "Report received" };
const UPDATE_TITLE: LocaleString = { th: "ข้อความจากเจ้าหน้าที่", en: "Message from staff" };

/** Public events for a case that are not about one claim, oldest first. */
export async function publicTimeline(db: AuditExecutor, caseId: string): Promise<PublicTimelineEntry[]> {
  const [row] = await db.select({ service: cases.service, kind: cases.kind }).from(cases).where(eq(cases.id, caseId));
  if (!row) throw new CaseError("not_found", "Case not found.");
  const events = await db
    .select({
      id: caseEvents.id,
      type: caseEvents.type,
      toStatus: caseEvents.toStatus,
      bodyTh: caseEvents.bodyTh,
      bodyEn: caseEvents.bodyEn,
      createdAt: caseEvents.createdAt,
    })
    .from(caseEvents)
    .where(and(eq(caseEvents.caseId, caseId), eq(caseEvents.visibility, "public"), sql`${caseEvents.metadata} ->> 'claimId' is null`))
    .orderBy(asc(caseEvents.createdAt), asc(caseEvents.id));

  const entries: PublicTimelineEntry[] = [];
  for (const e of events) {
    const body = e.bodyTh || e.bodyEn ? { th: e.bodyTh, en: e.bodyEn } : null;
    let title: LocaleString | null = null;
    if (e.type === "created") title = CREATED_TITLE;
    else if (e.type === "public_update") title = UPDATE_TITLE;
    else if (e.type === "status_changed" && e.toStatus) title = getStatusDef(row.service, row.kind, e.toStatus)?.publicLabel ?? null;
    if (title) entries.push({ id: e.id, at: e.createdAt, type: e.type, title, body });
  }
  return entries;
}

export interface PublicCaseView {
  reference: string;
  service: CaseService;
  kind: string;
  status: string;
  statusLabel: LocaleString;
  createdAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
  timeline: PublicTimelineEntry[];
}

/** Everything a tracking page shows for a case already resolved with `resolveTrackingLink`. */
export async function publicCaseView(db: AuditExecutor, caseId: string): Promise<PublicCaseView> {
  const [row] = await db.select().from(cases).where(eq(cases.id, caseId));
  if (!row) throw new CaseError("not_found", "Case not found.");
  return {
    reference: row.reference,
    service: row.service,
    kind: row.kind,
    status: row.status,
    statusLabel: publicStatusLabel(row.service, row.kind, row.status),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    closedAt: row.closedAt,
    timeline: await publicTimeline(db, caseId),
  };
}
