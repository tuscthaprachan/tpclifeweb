import { inArray } from "drizzle-orm";
import { bulkDeleteImagesAction } from "@/app/admin/content/images/actions";
import { UsageList } from "@/app/admin/content/images/UsageList";
import { contentPlacement } from "@/app/admin/content/_list/placement";
import { ConsoleIcon } from "@/components/admin/icons";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { ConsolePage, PageHeader } from "@/components/admin/ui";
import { Button } from "@/components/ui";
import { requireEditor } from "@/lib/admin/content/access";
import { getContentType } from "@/lib/admin/content/types";
import { getAdminLocale } from "@/lib/admin/locale";
import { parseImageIds } from "@/lib/admin/media/bulk";
import { imageFileName } from "@/lib/admin/media/library";
import { scanImageUsage } from "@/lib/admin/media/usage";
import { isAuthConfigured } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { images } from "@/lib/db/schema";
import { a } from "@/lib/i18n/admin";
import { pick } from "@/lib/i18n/config";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getAdminLocale();
  return { title: a("mlDeleteTitle", locale) };
}

const toList = (value: string | string[] | undefined) => (Array.isArray(value) ? value : value ? [value] : []);

/** Asks before deleting the selected pictures, and says why any that are still used will be kept. A plain page and form, so it works without JavaScript. */
export default async function BulkDeleteImagesPage({ searchParams }: { searchParams: Promise<{ id?: string | string[] }> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  await requireEditor();
  const ids = parseImageIds(toList((await searchParams).id));
  const db = getDb();
  const [rows, usage] = await Promise.all([ids.length ? db.select().from(images).where(inArray(images.id, ids)) : Promise.resolve([]), scanImageUsage(db)]);
  const deletable = rows.filter((r) => !usage.get(r.id)?.length);
  const blocked = rows.filter((r) => usage.get(r.id)?.length);
  const place = contentPlacement(getContentType("images")!);
  const name = (row: (typeof rows)[number]) => pick({ th: row.altTh, en: row.altEn }, locale) || row.altTh || row.altEn || imageFileName(row.storageKey);

  return (
    <ConsolePage width="narrow">
      <PageHeader title={a("mlDeleteTitle", locale)} icon={place.icon} />
      {rows.length === 0 ? <p className="m-0">{a("mlEditEmpty", locale)}</p> : null}
      {blocked.length > 0 ? (
        <section className="flex flex-col gap-[var(--space-2)]">
          <p className="m-0 font-medium">{a("mlDeleteRefusedIntro", locale)}</p>
          <ul className="m-0 flex list-none flex-col gap-[var(--space-3)] p-0">
            {blocked.map((row) => (
              <li key={row.id}>
                <span className="font-medium">{name(row)}</span>
                <span className="text-ink-600"> ({imageFileName(row.storageKey)})</span>
                <UsageList uses={usage.get(row.id)!} locale={locale} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {deletable.length > 0 ? (
        <form action={bulkDeleteImagesAction} className="flex flex-col gap-[var(--space-4)]">
          {deletable.map((row) => (
            <input key={row.id} type="hidden" name="id" value={row.id} />
          ))}
          <p className="m-0">{a("mlDeleteBody", locale)}</p>
          <ul className="m-0 flex flex-col gap-[var(--space-1)] pl-[var(--space-5)]">
            {deletable.map((row) => (
              <li key={row.id}>
                {name(row)} <span className="text-ink-600">({imageFileName(row.storageKey)})</span>
              </li>
            ))}
          </ul>
          <div>
            <Button type="submit" variant="destructive" icon={<ConsoleIcon name="delete" />}>
              {a("mlDeleteButton", locale, { count: deletable.length })}
            </Button>
          </div>
        </form>
      ) : rows.length > 0 ? (
        <p className="m-0">{a("mlDeleteNothing", locale)}</p>
      ) : null}
      <div>
        <Button href="/admin/content/images" variant="secondary" icon={<ConsoleIcon name="back" />}>
          {a("mlBackToLibrary", locale)}
        </Button>
      </div>
    </ConsolePage>
  );
}
