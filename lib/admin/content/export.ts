import "server-only";

import type { AuditExecutor } from "@/lib/db/audit";
import { SITE_URL } from "@/lib/site-url";
import { localePath, type Locale } from "@/lib/i18n/config";
import { toCsv, safeCell } from "./csv";
import { EXPORT_LIMIT, listContentRows } from "./list";
import type { ListQuery } from "./list-query";
import { viewPathOf, type ContentTypeDef } from "./types";

export const EXPORT_HEADER = ["id", "title_th", "title_en", "slug", "status", "updated_at", "updated_by", "public_url"] as const;

/** One CSV line's cells for a row. The public address is given only for published rows of a type with a public page. */
export function exportCells(
  def: Pick<ContentTypeDef, "viewPath" | "viewPathFor">,
  row: { id: string; title: { th: string; en: string }; status: string | null; updatedAt: Date; updatedByName?: string; slug?: string; section?: string },
  locale: Locale,
  origin: string = SITE_URL,
): string[] {
  const path = row.status === "published" ? viewPathOf(def, row) : null;
  const live = path ? `${origin}${localePath(locale, path)}` : "";
  return [
    row.id,
    safeCell(row.title.th),
    safeCell(row.title.en),
    safeCell(row.slug ?? ""),
    row.status ?? "",
    row.updatedAt.toISOString(),
    safeCell(row.updatedByName ?? ""),
    live,
  ];
}

/** Every row matching the filters (up to `EXPORT_LIMIT`) as a CSV, in the list's sort order. */
export async function buildContentCsv(
  db: AuditExecutor,
  def: ContentTypeDef,
  query: Pick<ListQuery, "q" | "status" | "by" | "within" | "facet" | "sort" | "dir">,
  locale: Locale,
): Promise<{ csv: string; count: number; filename: string }> {
  const { rows } = await listContentRows(db, def, { ...query, limit: EXPORT_LIMIT, page: 1, locale, withEditor: true });
  const stamp = new Date().toISOString().slice(0, 10);
  return { csv: toCsv(EXPORT_HEADER, rows.map((row) => exportCells(def, row, locale))), count: rows.length, filename: `${def.segment}-${stamp}.csv` };
}
