import Image from "next/image";
import { inArray } from "drizzle-orm";
import { bulkAltAction } from "@/app/admin/content/images/actions";
import { contentPlacement } from "@/app/admin/content/_list/placement";
import { ConsoleIcon } from "@/components/admin/icons";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { ConsolePage, PageHeader } from "@/components/admin/ui";
import { Button, NotificationBanner, TextInput } from "@/components/ui";
import { requireEditor } from "@/lib/admin/content/access";
import { getContentType } from "@/lib/admin/content/types";
import { getAdminLocale } from "@/lib/admin/locale";
import { parseImageIds } from "@/lib/admin/media/bulk";
import { imageFileName } from "@/lib/admin/media/library";
import { isAuthConfigured } from "@/lib/auth";
import { publicImageUrl } from "@/lib/content/images";
import { getDb } from "@/lib/db";
import { images } from "@/lib/db/schema";
import { a } from "@/lib/i18n/admin";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getAdminLocale();
  return { title: a("mlBulkEdit", locale) };
}

const toList = (value: string | string[] | undefined) => (Array.isArray(value) ? value : value ? [value] : []);

/** One form listing the selected pictures with Thai and English description fields. A plain page and form, so it works without JavaScript. */
export default async function BulkEditImagesPage({ searchParams }: { searchParams: Promise<{ id?: string | string[]; saved?: string }> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  await requireEditor();
  const query = await searchParams;
  const ids = parseImageIds(toList(query.id));
  const rows = ids.length ? await getDb().select().from(images).where(inArray(images.id, ids)) : [];
  const place = contentPlacement(getContentType("images")!);
  const saved = query.saved !== undefined;
  const back = (
    <Button href="/admin/content/images" variant="secondary" icon={<ConsoleIcon name="back" />}>
      {a("mlBackToLibrary", locale)}
    </Button>
  );

  return (
    <ConsolePage width="wide">
      <PageHeader title={a("mlEditTitle", locale, { count: rows.length })} icon={place.icon} description={a("mlEditIntro", locale)} />
      {saved ? (
        <NotificationBanner variant="warning" title={a("mlEditIncompleteTitle", locale)}>
          {a("mlEditIncomplete", locale, { ok: Number.parseInt(query.saved ?? "0", 10) || 0 })}
        </NotificationBanner>
      ) : null}
      {rows.length === 0 ? (
        <>
          <p className="m-0">{a("mlEditEmpty", locale)}</p>
          <div>{back}</div>
        </>
      ) : (
        <form action={bulkAltAction} className="flex flex-col gap-[var(--space-5)]">
          <ul className="m-0 flex list-none flex-col gap-[var(--space-5)] p-0">
            {rows.map((row) => {
              const url = publicImageUrl(row.storageKey);
              return (
                <li key={row.id} className="console-card flex flex-col gap-[var(--space-3)] p-[var(--space-4)] md:flex-row">
                  <input type="hidden" name="id" value={row.id} />
                  <div className="flex shrink-0 flex-col gap-[var(--space-1)]">
                    {url ? <Image src={url} alt="" width={160} height={120} unoptimized className="h-28 w-40 rounded-control bg-surface-sunk object-cover" /> : null}
                    <span className="break-all text-sm text-ink-600">{imageFileName(row.storageKey)}</span>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-[var(--space-3)]">
                    <div className="grid gap-[var(--space-3)] md:grid-cols-2">
                      <TextInput id={`alt-th-${row.id}`} name={`altTh_${row.id}`} lang="th" label={a("imageAltTh", locale)} defaultValue={row.altTh} maxLength={300} autoComplete="off" />
                      <TextInput id={`alt-en-${row.id}`} name={`altEn_${row.id}`} lang="en" label={a("imageAltEn", locale)} defaultValue={row.altEn} maxLength={300} autoComplete="off" />
                    </div>
                    <label className="flex items-center gap-[var(--space-2)]">
                      <input type="checkbox" name={`decorative_${row.id}`} defaultChecked={row.isDecorative} className="size-5" />
                      {a("imageDecorativeLabel", locale)}
                    </label>
                    {saved ? <p className="m-0 text-sm font-medium text-error">{a("mlEditRowIncomplete", locale)}</p> : null}
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap gap-[var(--space-3)]">
            <Button type="submit" icon={<ConsoleIcon name="save" />}>
              {a("mlEditSave", locale)}
            </Button>
            {back}
          </div>
        </form>
      )}
    </ConsolePage>
  );
}
