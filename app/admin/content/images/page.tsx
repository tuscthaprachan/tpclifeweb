import Link from "next/link";
import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import Image from "next/image";
import { contentPlacement } from "@/app/admin/content/_list/placement";
import { parsePage, queryString, ResultCount, RowAction } from "@/app/admin/content/_list/parts";
import { ConsoleIcon } from "@/components/admin/icons";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { ConsolePage, EmptyPanel, FilterChips, PageHeader, SearchField, Toolbar } from "@/components/admin/ui";
import { Button, NotificationBanner, Pagination, StatusTag, Timestamp } from "@/components/ui";
import { requireEditor } from "@/lib/admin/content/access";
import { isStorageConfigured } from "@/lib/admin/content/images";
import { contentPath, getContentType } from "@/lib/admin/content/types";
import { getAdminLocale } from "@/lib/admin/locale";
import { isAuthConfigured } from "@/lib/auth";
import { publicImageUrl } from "@/lib/content/images";
import { getDb } from "@/lib/db";
import { images } from "@/lib/db/schema";
import { a } from "@/lib/i18n/admin";
import { pick } from "@/lib/i18n/config";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getAdminLocale();
  return { title: a("typeImages", locale) };
}

const escapeLike = (q: string) => q.replace(/[\\%_]/g, (c) => `\\${c}`);

const IMAGE_PAGE_SIZE = 24;

export default async function ImagesListPage({ searchParams }: { searchParams: Promise<{ q?: string; notice?: string; missing?: string; page?: string }> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  await requireEditor();
  const { q, notice, missing, page: pageParam } = await searchParams;
  const def = getContentType("images")!;
  const db = getDb();
  const term = q?.trim();
  const like = term ? `%${escapeLike(term)}%` : undefined;
  const onlyMissing = missing === "1";
  const page = parsePage(pageParam);

  const needsDescription = and(eq(images.isDecorative, false), sql`(${images.altTh} = '' or ${images.altEn} = '')`);
  const search = like ? or(ilike(images.altTh, like), ilike(images.altEn, like), ilike(images.captionTh, like), ilike(images.captionEn, like)) : undefined;
  const where = and(search, onlyMissing ? needsDescription : undefined);
  const [rows, [{ total } = { total: 0 }], [{ missingTotal } = { missingTotal: 0 }], [{ allTotal } = { allTotal: 0 }]] = await Promise.all([
    db.select().from(images).where(where).orderBy(desc(images.createdAt)).limit(IMAGE_PAGE_SIZE).offset((page - 1) * IMAGE_PAGE_SIZE),
    db.select({ total: count() }).from(images).where(where),
    db.select({ missingTotal: count() }).from(images).where(and(search, needsDescription)),
    db.select({ allTotal: count() }).from(images).where(search),
  ]);
  const storageConfigured = isStorageConfigured();
  const place = contentPlacement(def);
  const label = a(def.labelKey, locale);
  const base = contentPath(def);
  const hrefFor = (nextMissing: boolean, p = 1) => `${base}${queryString({ q: term, missing: nextMissing ? "1" : undefined, page: p > 1 ? p : undefined })}`;
  const upload = storageConfigured ? (
    <Button href={`${base}/new`} icon={<ConsoleIcon name="upload" />}>
      {a("mediaUploadNew", locale)}
    </Button>
  ) : undefined;

  return (
    <ConsolePage width="wide">
      <PageHeader title={label} icon={place.icon} description={a("mediaIntro", locale)} actions={upload} />
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
      <Toolbar
        search={<SearchField label={a("ccSearchLabel", locale, { label: label.toLowerCase() })} submitLabel={a("ccSearchSubmit", locale)} defaultValue={term} hidden={onlyMissing ? { missing: "1" } : undefined} />}
        filters={
          <FilterChips
            label={a("ccFilterImages", locale)}
            current={onlyMissing ? "missing" : "all"}
            options={[
              { id: "all", label: a("ccFilterAll", locale), href: hrefFor(false), count: allTotal },
              { id: "missing", label: a("ccNeedsDescription", locale), href: hrefFor(true), count: missingTotal },
            ]}
          />
        }
      />

      {rows.length === 0 ? (
        term || onlyMissing ? (
          <EmptyPanel
            icon="search"
            title={a("listNoMatches", locale)}
            action={
              <Button href={base} variant="secondary">
                {a("ccClearFilters", locale)}
              </Button>
            }
          >
            {a("ccNoMatchesHint", locale)}
          </EmptyPanel>
        ) : (
          <EmptyPanel icon={place.icon} title={a("mediaListEmpty", locale)} action={upload}>
            {a("ccEmptyHint", locale)}
          </EmptyPanel>
        )
      ) : (
        <>
          <ResultCount text={a("ccResultCount", locale, { total })} />
          <ul aria-label={a("listCaption", locale, { shown: rows.length, total, label })} className="m-0 grid list-none gap-[var(--space-3)] p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rows.map((row) => {
              const url = publicImageUrl(row.storageKey);
              const text = row.isDecorative ? a("imageDecorative", locale) : pick({ th: row.altTh, en: row.altEn }, locale) || row.altTh || row.altEn;
              return (
                <li key={row.id} className="console-card flex flex-col overflow-hidden">
                  {url ? (
                    <Image src={url} alt="" width={320} height={200} unoptimized className="h-40 w-full bg-surface-sunk object-cover" />
                  ) : (
                    <span className="flex h-40 w-full items-center justify-center bg-surface-sunk text-sm text-ink-600">{a("mediaNoPreview", locale)}</span>
                  )}
                  <div className="flex flex-1 flex-col items-start gap-[var(--space-2)] p-[var(--space-3)]">
                    <Link href={contentPath(def, row.id)} className="font-medium">
                      {text || a("imageNoAlt", locale)}
                    </Link>
                    {!row.isDecorative && (!row.altTh.trim() || !row.altEn.trim()) ? <StatusTag tone="warning" label={a("mediaNeedsDescription", locale)} /> : null}
                    <p className="m-0 text-sm text-ink-600">
                      {a("mediaColAdded", locale)}: <Timestamp value={row.createdAt} locale={locale} format="datetime" />
                    </p>
                    <RowAction href={contentPath(def, row.id)} icon="edit" name={pick({ th: row.altTh, en: row.altEn }, locale)}>
                      {a("edit", locale)}
                    </RowAction>
                  </div>
                </li>
              );
            })}
          </ul>
          <Pagination currentPage={page} totalPages={Math.ceil(total / IMAGE_PAGE_SIZE)} buildHref={(p) => hrefFor(onlyMissing, p)} locale={locale} />
        </>
      )}
    </ConsolePage>
  );
}
