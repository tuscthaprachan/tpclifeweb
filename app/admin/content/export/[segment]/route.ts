import { notFound } from "next/navigation";
import { contentActor, requireEditor } from "@/lib/admin/content/access";
import { buildContentCsv } from "@/lib/admin/content/export";
import { parseListQuery, type RawListParams } from "@/lib/admin/content/list-query";
import { listExtras } from "@/lib/admin/content/list-extras";
import { getContentType } from "@/lib/admin/content/types";
import { getAdminLocale } from "@/lib/admin/locale";
import { isAuthConfigured } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { withAudit } from "@/lib/db/audit";
import { getTableName } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** The current filtered list as a CSV for Excel. Editors only; each export is audited as `content.export`. */
export async function GET(request: Request, { params }: { params: Promise<{ segment: string }> }): Promise<Response> {
  if (!isAuthConfigured()) notFound();
  const staff = await requireEditor();
  const { segment } = await params;
  const def = getContentType(segment);
  if (!def || def.kind !== "collection" || !def.columns.title) notFound();

  const url = new URL(request.url);
  const raw: RawListParams = Object.fromEntries(["q", "status", "sort", "dir", "by", "within", "facet"].map((k) => [k, url.searchParams.get(k) ?? undefined]));
  const query = parseListQuery(raw, { hasStatus: Boolean(def.columns.status), facetValues: listExtras(def).facet?.options.map((o) => o.value) });
  const locale = await getAdminLocale();
  const db = getDb();
  const { csv, count, filename } = await buildContentCsv(db, def, query, locale);

  await withAudit(db, await contentActor(staff).then((c) => c.context), async (_tx, audit) => {
    await audit({
      action: "content.export",
      entityType: getTableName(def.table),
      entityId: def.segment,
      after: { count, filters: { q: query.q, status: query.status, by: query.by, within: query.within, facet: query.facet }, sort: query.sort, dir: query.dir },
    });
  });

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
