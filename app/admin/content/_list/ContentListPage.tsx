import { ContentList } from "@/components/admin/content/ContentList";
import { countByStatus, listContentRows, LIST_PAGE_SIZE, parseListStatus } from "@/lib/admin/content/list";
import { getAdminLocale } from "@/lib/admin/locale";
import { getDb } from "@/lib/db";
import { contentTypeBySegment } from "./placement";
import { parsePage } from "./parts";

export type ContentListSearchParams = { q?: string; status?: string; page?: string; notice?: string };

/** Loads and renders a content type's list from the page's search params. The page itself keeps the auth checks. */
export async function ContentListPage({ segment, searchParams }: { segment: string; searchParams: Promise<ContentListSearchParams> }) {
  const locale = await getAdminLocale();
  const { q, status: statusParam, page: pageParam, notice } = await searchParams;
  const def = contentTypeBySegment(segment);
  const status = def.columns.status ? parseListStatus(statusParam) : undefined;
  const page = parsePage(pageParam);
  const db = getDb();
  const [{ rows, total }, counts] = await Promise.all([
    listContentRows(db, def, { q, status, page, limit: LIST_PAGE_SIZE, withEditor: true }),
    def.columns.status ? countByStatus(db, def, q) : undefined,
  ]);
  return <ContentList def={def} locale={locale} rows={rows} total={total} q={q} status={status} counts={counts} page={page} notice={notice} />;
}
