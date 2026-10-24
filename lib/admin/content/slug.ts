import { and, eq, ne, type SQL } from "drizzle-orm";
import type { AnyPgColumn, AnyPgTable } from "drizzle-orm/pg-core";
import type { AuditExecutor } from "@/lib/db/audit";

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const SLUG_MAX = 80;

/** "Fresher's Week 2026!" to "freshers-week-2026". Thai and other non-Latin text drops out, so suggest from the English title. */
export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, "");
}

/**
 * True when another row already uses `slug`. Pass `excludeId` when editing so
 * a row does not clash with itself, and `where` for slugs unique only within
 * a group (for example content pages, unique per kind). The unique constraint
 * is still the backstop: `saveContent` throws `ContentConflictError` on a race.
 */
export async function isSlugTaken(
  db: AuditExecutor,
  options: { table: AnyPgTable; slugColumn: AnyPgColumn; idColumn: AnyPgColumn; slug: string; excludeId?: string; where?: SQL },
): Promise<boolean> {
  const { table, slugColumn, idColumn, slug, excludeId, where } = options;
  const conditions = [eq(slugColumn, slug), excludeId ? ne(idColumn, excludeId) : undefined, where].filter((c): c is SQL => Boolean(c));
  const rows = await db.select({ id: idColumn }).from(table).where(and(...conditions)).limit(1);
  return rows.length > 0;
}
