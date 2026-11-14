import { and, eq, gt, isNull, lte, or, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

/**
 * The public visibility rule for scheduled content: status published, and
 * `publish_at` null or reached, and `unpublish_at` null or still ahead. Every
 * public read of a type with a window goes through this, so a scheduled item
 * never appears early and an expired one never lingers in a fresh read.
 */
export function liveWindow(
  t: { status: AnyPgColumn; publishAt: AnyPgColumn; unpublishAt: AnyPgColumn },
  now: Date = new Date(),
): SQL {
  return and(
    eq(t.status, "published"),
    or(isNull(t.publishAt), lte(t.publishAt, now)),
    or(isNull(t.unpublishAt), gt(t.unpublishAt, now)),
  ) as SQL;
}
