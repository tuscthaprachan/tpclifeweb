import { inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { bulkDeleteAction } from "@/app/admin/content/bulk/actions";
import { contentPlacement } from "@/app/admin/content/_list/placement";
import { rowTitle } from "@/components/admin/content/ContentList";
import { ConsoleIcon } from "@/components/admin/icons";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { ConsolePage, PageHeader } from "@/components/admin/ui";
import { Button } from "@/components/ui";
import { requireEditor } from "@/lib/admin/content/access";
import { parseIds, supportsBulk } from "@/lib/admin/content/bulk";
import { sanitiseBack } from "@/lib/admin/content/list-query";
import { contentPath, getContentType } from "@/lib/admin/content/types";
import { getAdminLocale } from "@/lib/admin/locale";
import { isAuthConfigured } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { a } from "@/lib/i18n/admin";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getAdminLocale();
  return { title: a("clConfirmTitle", locale, { count: "" }).trim() };
}

type Params = { id?: string | string[]; back?: string };

/** Asks before deleting the selected items. A plain page and form, so it works without JavaScript. */
export default async function BulkDeletePage({ params, searchParams }: { params: Promise<{ segment: string }>; searchParams: Promise<Params> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  await requireEditor();
  const { segment } = await params;
  const def = getContentType(segment);
  if (!def || !supportsBulk(def)) notFound();
  const query = await searchParams;
  const ids = parseIds(Array.isArray(query.id) ? query.id : query.id ? [query.id] : []);
  const back = sanitiseBack(query.back);
  const backHref = `${contentPath(def)}${back ? `?${back}` : ""}`;
  const title = def.columns.title!;
  const rows = ids.length
    ? await getDb().select({ id: def.columns.id, th: title[0], en: title[1] }).from(def.table).where(inArray(def.columns.id, ids))
    : [];
  const place = contentPlacement(def);

  return (
    <ConsolePage width="narrow">
      <PageHeader title={a("clConfirmTitle", locale, { count: rows.length })} icon={place.icon} description={a(def.labelKey, locale)} />
      {rows.length === 0 ? (
        <>
          <p className="m-0">{a("clConfirmEmpty", locale)}</p>
          <div>
            <Button href={backHref} variant="secondary" icon={<ConsoleIcon name="back" />}>
              {a("clConfirmCancel", locale)}
            </Button>
          </div>
        </>
      ) : (
        <form action={bulkDeleteAction} className="flex flex-col gap-[var(--space-4)]">
          <input type="hidden" name="segment" value={def.segment} />
          <input type="hidden" name="back" value={back} />
          {rows.map((row) => (
            <input key={row.id as string} type="hidden" name="id" value={row.id as string} />
          ))}
          <p className="m-0">{a("clConfirmBody", locale)}</p>
          <ul className="m-0 flex flex-col gap-[var(--space-1)] pl-[var(--space-5)]">
            {rows.map((row) => (
              <li key={row.id as string}>{rowTitle({ th: String(row.th ?? ""), en: String(row.en ?? "") }, locale)}</li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-[var(--space-3)]">
            <Button type="submit" variant="destructive" icon={<ConsoleIcon name="delete" />}>
              {a("clConfirmDelete", locale, { count: rows.length })}
            </Button>
            <Button href={backHref} variant="secondary">
              {a("clConfirmCancel", locale)}
            </Button>
          </div>
        </form>
      )}
    </ConsolePage>
  );
}
