import { inArray } from "drizzle-orm";
import { ContentList, rowTitle, type BulkReport } from "@/components/admin/content/ContentList";
import { parseBulkResult, supportsBulk } from "@/lib/admin/content/bulk";
import { countByStatus, listContentRows, listEditors, LIST_PAGE_SIZE } from "@/lib/admin/content/list";
import { listExtras, sortableKeys } from "@/lib/admin/content/list-extras";
import { parseListQuery } from "@/lib/admin/content/list-query";
import { getAdminLocale } from "@/lib/admin/locale";
import { getDb } from "@/lib/db";
import { contentTypeBySegment } from "./placement";

export type ContentListSearchParams = {
  q?: string;
  status?: string;
  sort?: string;
  dir?: string;
  by?: string;
  within?: string;
  facet?: string;
  page?: string;
  notice?: string;
  bulk?: string;
  ok?: string;
  fail?: string | string[];
};

/** Loads and renders a content type's list from the page's search params. The page itself keeps the auth checks. */
export async function ContentListPage({ segment, searchParams }: { segment: string; searchParams: Promise<ContentListSearchParams> }) {
  const locale = await getAdminLocale();
  const params = await searchParams;
  const def = contentTypeBySegment(segment);
  const extras = listExtras(def);
  const query = parseListQuery(params, {
    sortable: sortableKeys(def),
    hasStatus: Boolean(def.columns.status),
    facetValues: extras.facet?.options.map((o) => o.value),
  });
  const db = getDb();
  const bulkResult = parseBulkResult(params);
  const [{ rows, total }, counts, editors, failedRows] = await Promise.all([
    listContentRows(db, def, { ...query, locale, limit: LIST_PAGE_SIZE, withEditor: true }),
    def.columns.status ? countByStatus(db, def, query) : undefined,
    listEditors(db, def),
    bulkResult && bulkResult.failed.length > 0 && bulkResult.action !== "delete" ? namesOf(def, bulkResult.failed.map((f) => f.id)) : undefined,
  ]);

  const bulkReport: BulkReport | undefined = bulkResult
    ? {
        action: bulkResult.action,
        ok: bulkResult.ok,
        failed: bulkResult.failed.map((f) => ({ ...f, title: failedRows?.get(f.id) ? rowTitle(failedRows.get(f.id)!, locale) : f.id })),
      }
    : undefined;

  return (
    <ContentList
      def={def}
      locale={locale}
      rows={rows}
      total={total}
      query={query}
      counts={counts}
      editors={editors}
      extras={extras}
      bulk={supportsBulk(def)}
      bulkReport={bulkReport}
      notice={params.notice ?? (params.bulk === "none" ? "bulkNone" : undefined)}
    />
  );
}

async function namesOf(def: ReturnType<typeof contentTypeBySegment>, ids: string[]): Promise<Map<string, { th: string; en: string }>> {
  const title = def.columns.title;
  if (!title) return new Map();
  const found = await getDb().select({ id: def.columns.id, th: title[0], en: title[1] }).from(def.table).where(inArray(def.columns.id, ids));
  return new Map(found.map((r) => [r.id as string, { th: String(r.th ?? ""), en: String(r.en ?? "") }]));
}
