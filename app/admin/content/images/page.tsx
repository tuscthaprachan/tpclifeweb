import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import Image from "next/image";
import { AdminPage } from "@/components/admin/AdminPage";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { Button, DataTable, EmptyState, Heading, NotificationBanner, StatusTag, Timestamp, type DataTableColumn } from "@/components/ui";
import { requireEditor } from "@/lib/admin/content/access";
import { isStorageConfigured } from "@/lib/admin/content/images";
import { LIST_LIMIT } from "@/lib/admin/content/list";
import { contentPath, getContentType } from "@/lib/admin/content/types";
import { getAdminLocale } from "@/lib/admin/locale";
import { isAuthConfigured } from "@/lib/auth";
import { publicImageUrl } from "@/lib/content/images";
import { getDb } from "@/lib/db";
import { images, type ImageRow } from "@/lib/db/schema";
import { a } from "@/lib/i18n/admin";
import { pick } from "@/lib/i18n/config";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getAdminLocale();
  return { title: a("typeImages", locale) };
}

const escapeLike = (q: string) => q.replace(/[\\%_]/g, (c) => `\\${c}`);

export default async function ImagesListPage({ searchParams }: { searchParams: Promise<{ q?: string; notice?: string; missing?: string }> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  await requireEditor();
  const { q, notice, missing } = await searchParams;
  const def = getContentType("images")!;
  const db = getDb();
  const term = q?.trim();
  const like = term ? `%${escapeLike(term)}%` : undefined;

  const where = and(
    like ? or(ilike(images.altTh, like), ilike(images.altEn, like), ilike(images.captionTh, like), ilike(images.captionEn, like)) : undefined,
    missing === "1" ? and(eq(images.isDecorative, false), sql`(${images.altTh} = '' or ${images.altEn} = '')`) : undefined,
  );
  const [rows, [{ total } = { total: 0 }]] = await Promise.all([
    db.select().from(images).where(where).orderBy(desc(images.createdAt)).limit(LIST_LIMIT),
    db.select({ total: count() }).from(images).where(where),
  ]);
  const storageConfigured = isStorageConfigured();

  const label = a(def.labelKey, locale);
  const columns: DataTableColumn<ImageRow>[] = [
    {
      id: "picture",
      header: a("mediaColPicture", locale),
      cell: (row) => {
        const url = publicImageUrl(row.storageKey);
        return url ? (
          <Image src={url} alt="" width={64} height={64} unoptimized className="size-16 rounded-control bg-surface-sunk object-cover" />
        ) : (
          <span className="inline-flex size-16 items-center justify-center rounded-control bg-surface-sunk text-xs text-ink-600">{a("mediaNoPreview", locale)}</span>
        );
      },
    },
    {
      id: "description",
      header: a("mediaColDescription", locale),
      cell: (row) => {
        const text = row.isDecorative ? a("imageDecorative", locale) : pick({ th: row.altTh, en: row.altEn }, locale) || row.altTh || row.altEn;
        return (
          <span className="flex flex-col items-start gap-[var(--space-1)]">
            <a href={contentPath(def, row.id)} className="font-medium">
              {text || a("imageNoAlt", locale)}
            </a>
            {!row.isDecorative && (!row.altTh.trim() || !row.altEn.trim()) ? <StatusTag tone="warning" label={a("mediaNeedsDescription", locale)} /> : null}
          </span>
        );
      },
    },
    { id: "added", header: a("mediaColAdded", locale), cell: (row) => <Timestamp value={row.createdAt} locale={locale} format="datetime" /> },
    {
      id: "edit",
      header: a("listActions", locale),
      align: "end",
      cell: (row) => (
        <a href={contentPath(def, row.id)}>
          {a("edit", locale)}
          <span className="visually-hidden"> {pick({ th: row.altTh, en: row.altEn }, locale)}</span>
        </a>
      ),
    },
  ];

  return (
    <AdminPage width="content">
      <div>
        <Heading level={1}>{label}</Heading>
        <p className="mt-[var(--space-2)] text-ink-600">{a("mediaIntro", locale)}</p>
      </div>
      {notice === "deleted" ? (
        <NotificationBanner variant="success" title={a("mediaDeletedFile", locale)}>
          {a("listDeletedNote", locale)}
        </NotificationBanner>
      ) : null}
      {!storageConfigured ? (
        <NotificationBanner variant="info" title={a("storageNotConfiguredTitle", locale)}>
          {a("errStorageNotConfigured", locale)}
        </NotificationBanner>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-[var(--space-4)]">
        <form method="get" role="search" className="flex flex-wrap items-end gap-[var(--space-2)]">
          {missing === "1" ? <input type="hidden" name="missing" value="1" /> : null}
          <div className="flex flex-col gap-[var(--space-1)]">
            <label htmlFor="content-filter" className="text-base font-medium">
              {a("listFilter", locale)}
            </label>
            <input
              id="content-filter"
              type="search"
              name="q"
              defaultValue={q}
              autoComplete="off"
              className="min-h-[var(--target-min)] rounded-control border border-line-strong bg-surface px-[var(--space-3)] py-[var(--space-2)]"
            />
          </div>
          <Button type="submit" variant="secondary">
            {a("listFilterApply", locale)}
          </Button>
          {term || missing === "1" ? (
            <Button href={contentPath(def)} variant="quiet">
              {a("listFilterClear", locale)}
            </Button>
          ) : null}
        </form>
        <div className="flex flex-wrap gap-[var(--space-2)]">
          <Button href={missing === "1" ? contentPath(def) : `${contentPath(def)}?missing=1`} variant="secondary">
            {missing === "1" ? a("mediaShowAll", locale) : a("mediaShowMissing", locale)}
          </Button>
          {storageConfigured ? <Button href={`${contentPath(def)}/new`}>{a("mediaUploadNew", locale)}</Button> : null}
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState illustration={false} title={term || missing === "1" ? a("listNoMatches", locale) : a("mediaListEmpty", locale)} />
      ) : (
        <>
          <DataTable columns={columns} rows={rows} getRowKey={(r) => r.id} caption={a("listCaption", locale, { shown: rows.length, total, label })} />
          {total > rows.length ? <p className="m-0 text-sm text-ink-600">{a("listTruncated", locale, { shown: rows.length, total })}</p> : null}
        </>
      )}
    </AdminPage>
  );
}
