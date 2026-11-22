import { and, eq, getTableName, gt, inArray, isNotNull, lte, or } from "drizzle-orm";
import type { AnyPgColumn, AnyPgTable } from "drizzle-orm/pg-core";
import { withAudit, type AuditExecutor } from "@/lib/db/audit";
import { auditLog, contentPages, events, faqs, forms, newsPosts, policies } from "@/lib/db/schema";
import { revalidateFor, type ContentEntityType } from "@/lib/content/revalidate";

/**
 * The daily publishing job. Public reads already apply each item's window by
 * the clock; this records in the audit log when a scheduled item went live or
 * came down, and expires the caches so the change shows without waiting for
 * their time limit. Each transition is recorded once.
 */

interface Scheduled {
  table: AnyPgTable & { id: AnyPgColumn; status: AnyPgColumn; publishAt: AnyPgColumn; unpublishAt: AnyPgColumn; slug: AnyPgColumn };
  entityType: (row: Record<string, unknown>) => ContentEntityType;
}

const SCHEDULED: Scheduled[] = [
  { table: newsPosts as unknown as Scheduled["table"], entityType: () => "newsPost" },
  { table: events as unknown as Scheduled["table"], entityType: () => "event" },
  { table: policies as unknown as Scheduled["table"], entityType: () => "policy" },
  { table: contentPages as unknown as Scheduled["table"], entityType: () => "topicPage" },
  { table: faqs as unknown as Scheduled["table"], entityType: () => "faq" },
  { table: forms as unknown as Scheduled["table"], entityType: () => "form" },
];

/** A transition older than this is not looked for, so a long outage does not flood the log. */
export const LOOKBACK_MS = 14 * 24 * 60 * 60 * 1000;

export interface SweepResult {
  wentLive: number;
  cameDown: number;
}

export async function runPublishingSweep(db: AuditExecutor, now: Date = new Date()): Promise<SweepResult> {
  const since = new Date(now.getTime() - LOOKBACK_MS);
  const result: SweepResult = { wentLive: 0, cameDown: 0 };
  const touched = new Map<string, { entityType: ContentEntityType; slugs: Set<string> }>();

  for (const { table, entityType } of SCHEDULED) {
    const name = getTableName(table);
    const rows = (await db
      .select()
      .from(table)
      .where(
        and(
          eq(table.status, "published"),
          or(
            and(isNotNull(table.publishAt), lte(table.publishAt, now), gt(table.publishAt, since)),
            and(isNotNull(table.unpublishAt), lte(table.unpublishAt, now), gt(table.unpublishAt, since)),
          ),
        ),
      )) as Record<string, unknown>[];
    if (rows.length === 0) continue;

    const done = await db
      .select({ entityId: auditLog.entityId, action: auditLog.action, after: auditLog.after })
      .from(auditLog)
      .where(
        and(
          eq(auditLog.entityType, name),
          inArray(
            auditLog.entityId,
            rows.map((r) => String(r.id)),
          ),
          inArray(auditLog.action, [`${name}.scheduled_live`, `${name}.scheduled_down`]),
        ),
      );
    const recorded = (id: string, action: string, at: Date) =>
      done.some((d) => d.entityId === id && d.action === action && (d.after as { at?: string } | null)?.at === at.toISOString());

    for (const row of rows) {
      const id = String(row.id);
      const transitions: { action: string; at: Date }[] = [];
      const publishAt = row.publishAt as Date | null;
      const unpublishAt = row.unpublishAt as Date | null;
      const wentLive = publishAt && publishAt <= now && publishAt > since && !(unpublishAt && unpublishAt <= publishAt);
      const cameDown = unpublishAt && unpublishAt <= now && unpublishAt > since;
      if (wentLive && !recorded(id, `${name}.scheduled_live`, publishAt)) transitions.push({ action: `${name}.scheduled_live`, at: publishAt });
      if (cameDown && !recorded(id, `${name}.scheduled_down`, unpublishAt)) transitions.push({ action: `${name}.scheduled_down`, at: unpublishAt });
      if (transitions.length === 0) continue;

      await withAudit(db, {}, async (_tx, audit) => {
        for (const t of transitions) {
          await audit({ action: t.action, entityType: name, entityId: id, after: { at: t.at.toISOString(), slug: row.slug ?? null } });
        }
      });
      for (const t of transitions) {
        if (t.action.endsWith("scheduled_live")) result.wentLive++;
        else result.cameDown++;
      }
      const type = entityType(row);
      const entry = touched.get(type) ?? { entityType: type, slugs: new Set<string>() };
      if (typeof row.slug === "string") entry.slugs.add(row.slug);
      touched.set(type, entry);
    }
  }

  for (const { entityType, slugs } of touched.values()) {
    if (slugs.size === 0) revalidateFor(entityType);
    for (const slug of slugs) revalidateFor(entityType, slug);
  }
  return result;
}

