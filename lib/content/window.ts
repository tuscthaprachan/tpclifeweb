import { and, eq, gt, isNull, lte, or, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { serviceAlerts } from "@/lib/db/schema";

interface WindowColumns {
  status: AnyPgColumn;
  publishAt: AnyPgColumn;
  unpublishAt: AnyPgColumn;
}

/**
 * The public visibility rule for scheduled content: status published, and
 * `publish_at` null or reached, and `unpublish_at` null or still ahead. Every
 * public read of a type with a window goes through this, so a scheduled item
 * never appears early and an expired one never lingers in a fresh read. It is
 * the SQL twin of `liveState(row, now) === "live"` (`./live-state`); service
 * alerts pass their `startsAt` and `endsAt` as the window.
 */
export function liveWindow(t: WindowColumns, now: Date = new Date()): SQL {
  return and(
    eq(t.status, "published"),
    or(isNull(t.publishAt), lte(t.publishAt, now)),
    or(isNull(t.unpublishAt), gt(t.unpublishAt, now)),
  ) as SQL;
}

/**
 * The SQL twin of `liveState`: `'draft' | 'scheduled' | 'live' | 'expired'`
 * for each row. A type with no window leaves the two window columns out.
 */
export function liveStateSql(t: { status: AnyPgColumn; publishAt?: AnyPgColumn; unpublishAt?: AnyPgColumn }, now: Date = new Date()): SQL<string> {
  const ended = t.unpublishAt ? sql`${t.unpublishAt} is not null and ${t.unpublishAt} <= ${now}` : sql`false`;
  const ahead = t.publishAt ? sql`${t.publishAt} is not null and ${t.publishAt} > ${now}` : sql`false`;
  return sql<string>`(case when ${t.status} <> 'published' then 'draft' when ${ended} then 'expired' when ${ahead} then 'scheduled' else 'live' end)`;
}

/** The publication window of service alerts: `startsAt` is the start, `endsAt` the exclusive end. */
export const alertWindow = (now: Date) =>
  liveWindow({ status: serviceAlerts.status, publishAt: serviceAlerts.startsAt, unpublishAt: serviceAlerts.endsAt }, now);
