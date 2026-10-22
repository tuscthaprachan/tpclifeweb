/**
 * Shared helpers for the content seeds. Every seed is idempotent: rows are
 * upserted by their natural key (slug, stall number, reference) inside one
 * transaction, and child rows are replaced wholesale for the parent.
 *
 * Re-running a seed overwrites the seeded fields of rows it owns. That is the
 * point of a seed; it is not meant to be run against a database whose editors
 * have since changed those rows (use the admin console for that).
 *
 * No `server-only` import: this runs under tsx and PGlite.
 */

import { getTableColumns, sql, type SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import type { AuditExecutor } from "../audit";
import { portableTextToDoc } from "../../rich-text/convert";
import type { RichTextDoc } from "../../rich-text/types";

export type SeedDb = AuditExecutor;

/** Mirrors the slug the Studio generated: lower case, ASCII, hyphenated. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Convert a Portable Text block array (as authored in the old seeds) to a ProseMirror document. */
export function rich(blocks: readonly unknown[]): RichTextDoc {
  return portableTextToDoc(blocks);
}

/**
 * `set` for `onConflictDoUpdate`: every column of `table` takes the incoming
 * (`excluded`) value, except the ones named in `keep`. `updatedAt` is bumped.
 * Identity and provenance columns are always kept.
 */
export function excludedSet<T extends PgTable>(table: T, keep: readonly string[] = []): Record<string, SQL> {
  const always = new Set(["id", "createdAt", "createdBy", "publishedAt", ...keep]);
  const set: Record<string, SQL> = {};
  for (const [key, column] of Object.entries(getTableColumns(table))) {
    if (always.has(key)) continue;
    set[key] = key === "updatedAt" ? sql`now()` : sql.raw(`excluded."${column.name}"`);
  }
  return set;
}

/** Columns every seeded content row carries: published, stamped now. */
export function published() {
  return { status: "published" as const, publishedAt: new Date() };
}

/** `{ th, en }` to the pair of columns; used when a source has a LocaleString. */
export interface Bi {
  th: string;
  en: string;
}
