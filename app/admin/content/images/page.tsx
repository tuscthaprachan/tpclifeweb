import Image from "next/image";
import Link from "next/link";
import { inArray } from "drizzle-orm";
import { contentPlacement } from "@/app/admin/content/_list/placement";
import { queryString, ResultCount } from "@/app/admin/content/_list/parts";
import { SelectAllCheckbox } from "@/components/admin/content/BulkControls";
import { ConsoleIcon } from "@/components/admin/icons";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { Badge, ConsolePage, EmptyPanel, FilterDisclosure, PageHeader } from "@/components/admin/ui";
import { Button, NotificationBanner, Pagination, StatusTag, Timestamp } from "@/components/ui";
import { requireEditor } from "@/lib/admin/content/access";
import { isStorageConfigured } from "@/lib/admin/content/images";
import { isUuid } from "@/lib/admin/content/form-state";
import { contentPath, getContentType } from "@/lib/admin/content/types";
import { getAdminLocale } from "@/lib/admin/locale";
import { imageFileName, isMissingAlt, libraryParams, listLibrary, listUploaders, parseLibraryQuery, type LibraryRow, type RawLibraryParams } from "@/lib/admin/media/library";
import { isAuthConfigured } from "@/lib/auth";
import { publicImageUrl } from "@/lib/content/images";
import { getDb } from "@/lib/db";
import { images } from "@/lib/db/schema";
import { userNames } from "@/lib/admin/content/list";
import { a, type AdminKey } from "@/lib/i18n/admin";
import { pick, type Locale } from "@/lib/i18n/config";
import { LibraryUpload } from "./LibraryUpload";
import { usedInSummary } from "./UsageList";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getAdminLocale();
  return { title: a("typeImages", locale) };
}

type Params = RawLibraryParams & { notice?: string; bulk?: string; ok?: string; refused?: string | string[] };

const SORT_KEYS = { newest: "mlSortNewest", oldest: "mlSortOldest", name: "mlSortName", size: "mlSortSize" } as const satisfies Record<string, AdminKey>;
const WITHIN_KEYS = { "7d": "mlWithin7", "30d": "mlWithin30", "90d": "mlWithin90" } as const satisfies Record<string, AdminKey>;
const SELECT = "min-h-[var(--target-min)] rounded-control border border-line-strong bg-surface px-[var(--space-2)]";
const CELL =
  "flex items-baseline justify-between gap-[var(--space-4)] px-[var(--space-3)] py-[var(--space-1)] text-ink-900 " +
  "before:max-w-[45%] before:shrink-0 before:font-semibold before:text-ink-600 before:content-[attr(data-label)] " +
  "sm:table-cell sm:border-t sm:border-line sm:py-[var(--space-2)] sm:before:content-none";
const CHECKBOX = "h-[1.25rem] w-[1.25rem] shrink-0 accent-[var(--colour-action)]";

function displayName(row: LibraryRow["image"], locale: Locale): string {
  if (row.isDecorative) return a("imageDecorative", locale);
  return pick({ th: row.altTh, en: row.altEn }, locale) || row.altTh || row.altEn || a("imageNoAlt", locale);
}

function Thumb({ storageKey, className, locale }: { storageKey: string; className: string; locale: Locale }) {
  const url = publicImageUrl(storageKey);
  return url ? (
    <Image src={url} alt="" width={320} height={200} unoptimized className={`bg-surface-sunk object-cover ${className}`} />
  ) : (
    <span className={`flex items-center justify-center bg-surface-sunk text-sm text-ink-600 ${className}`}>{a("mediaNoPreview", locale)}</span>
  );
}

function UseBadge({ count, locale }: { count: number; locale: Locale }) {
  return count > 0 ? <Badge>{a("mlUsedIn", locale, { count })}</Badge> : <StatusTag tone="neutral" label={a("mlNotUsed", locale)} />;
}

export default async function ImagesLibraryPage({ searchParams }: { searchParams: Promise<Params> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  await requireEditor();
  const raw = await searchParams;
  const query = parseLibraryQuery(raw);
  const db = getDb();
  const def = getContentType("images")!;
  const base = contentPath(def);

  const [library, uploaderIds] = await Promise.all([listLibrary(db, query), listUploaders(db)]);
  const refusedIds = (Array.isArray(raw.refused) ? raw.refused : raw.refused ? raw.refused.split(",") : []).filter(isUuid).slice(0, 100);
  const [names, refused] = await Promise.all([
    userNames(db, [...uploaderIds, ...library.rows.map((r) => r.image.createdBy)]),
    refusedIds.length ? db.select().from(images).where(inArray(images.id, refusedIds)) : Promise.resolve([]),
  ]);

  const { rows, total } = library;
  const storageConfigured = isStorageConfigured();
  const place = contentPlacement(def);
  const label = a(def.labelKey, locale);
  const href = (over: Partial<Record<keyof typeof query, unknown>> = {}) => `${base}${queryString(libraryParams(query, over))}`;
  const filtered = Boolean(query.q || query.missingAlt || query.unused || query.by || query.within);
  const back = queryString(libraryParams(query)).slice(1);
  const upload = storageConfigured ? (
    <Button href={`${base}/new`} icon={<ConsoleIcon name="upload" />}>
      {a("mediaUploadNew", locale)}
    </Button>
  ) : undefined;
  const okCount = Number.parseInt(raw.ok ?? "0", 10) || 0;

  return (
    <ConsolePage width="wide">
      <PageHeader title={label} icon={place.icon} description={a("mediaIntro", locale)} actions={upload} />
      {raw.notice === "deleted" ? (
        <NotificationBanner variant="success" title={a("mediaDeletedFile", locale)}>
          {a("listDeletedNote", locale)}
        </NotificationBanner>
      ) : null}
      {raw.bulk === "edit" ? <NotificationBanner variant="success" title={a("formSavedUpdated", locale)}>
          {a("mlBulkEditDone", locale, { ok: okCount })}
        </NotificationBanner> : null}
      {raw.bulk === "delete" ? (
        <NotificationBanner variant={refused.length ? "warning" : "success"} title={a("mlBulkDeleteDone", locale, { ok: okCount, refused: refused.length })}>
          {refused.length ? (
            <>
              <p className="m-0">{a("mlBulkRefusedTitle", locale)}</p>
              <ul className="m-0 pl-[var(--space-5)]">
                {refused.map((row) => (
                  <li key={row.id}>
                    <Link href={contentPath(def, row.id)}>{displayName(row, locale)}</Link>
                    <span className="text-ink-600"> ({imageFileName(row.storageKey)}): {a("mlReasonInUse", locale, { where: usedInSummary(library.usage.get(row.id) ?? [], locale) })}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </NotificationBanner>
      ) : null}
      {raw.bulk === "none" ? <NotificationBanner variant="info" title={a("clBulkFailedTitle", locale)}>
          {a("mlBulkNone", locale)}
        </NotificationBanner> : null}
      {!storageConfigured ? (
        <NotificationBanner variant="info" title={a("storageNotConfiguredTitle", locale)}>
          {a("errStorageNotConfigured", locale)}
        </NotificationBanner>
      ) : (
        <LibraryUpload locale={locale} />
      )}

      <FilterDisclosure label={a("clFilters", locale)} defaultOpen={filtered}>
      <form method="get" action={base} role="search" aria-label={a("mlSearchLabel", locale)} className="flex flex-wrap items-end gap-[var(--space-3)]">
        {query.view === "table" ? <input type="hidden" name="view" value="table" /> : null}
        <div className="flex min-w-[14rem] flex-1 flex-col gap-[var(--space-1)]">
          <label htmlFor="ml-q" className="text-sm font-medium">
            {a("mlSearchLabel", locale)}
          </label>
          <input id="ml-q" type="search" name="q" defaultValue={query.q} autoComplete="off" className={SELECT} />
        </div>
        <div className="flex flex-col gap-[var(--space-1)]">
          <label htmlFor="ml-alt" className="text-sm font-medium">
            {a("mlFilterAlt", locale)}
          </label>
          <select id="ml-alt" name="alt" defaultValue={query.missingAlt ? "missing" : ""} className={SELECT}>
            <option value="">{a("mlAltAny", locale)}</option>
            <option value="missing">{a("mlAltMissing", locale)}</option>
          </select>
        </div>
        <div className="flex flex-col gap-[var(--space-1)]">
          <label htmlFor="ml-unused" className="text-sm font-medium">
            {a("mlFilterUse", locale)}
          </label>
          <select id="ml-unused" name="unused" defaultValue={query.unused ? "1" : ""} className={SELECT}>
            <option value="">{a("mlUseAny", locale)}</option>
            <option value="1">{a("mlUseUnused", locale)}</option>
          </select>
        </div>
        <div className="flex flex-col gap-[var(--space-1)]">
          <label htmlFor="ml-by" className="text-sm font-medium">
            {a("mlFilterBy", locale)}
          </label>
          <select id="ml-by" name="by" defaultValue={query.by ?? ""} className={SELECT}>
            <option value="">{a("mlByAny", locale)}</option>
            {uploaderIds.map((id) => (
              <option key={id} value={id}>
                {names.get(id) ?? id}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-[var(--space-1)]">
          <label htmlFor="ml-within" className="text-sm font-medium">
            {a("mlFilterWithin", locale)}
          </label>
          <select id="ml-within" name="within" defaultValue={query.within ?? ""} className={SELECT}>
            <option value="">{a("mlWithinAny", locale)}</option>
            {(Object.keys(WITHIN_KEYS) as (keyof typeof WITHIN_KEYS)[]).map((key) => (
              <option key={key} value={key}>
                {a(WITHIN_KEYS[key], locale)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-[var(--space-1)]">
          <label htmlFor="ml-sort" className="text-sm font-medium">
            {a("mlSortLabel", locale)}
          </label>
          <select id="ml-sort" name="sort" defaultValue={query.sort} className={SELECT}>
            {(Object.keys(SORT_KEYS) as (keyof typeof SORT_KEYS)[]).map((key) => (
              <option key={key} value={key}>
                {a(SORT_KEYS[key], locale)}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" icon={<ConsoleIcon name="filter" />}>
          {a("mlApply", locale)}
        </Button>
        {filtered ? (
          <Button href={href({ q: undefined, missingAlt: false, unused: false, by: undefined, within: undefined, page: 1 })} variant="quiet">
            {a("mlClear", locale)}
          </Button>
        ) : null}
      </form>
      </FilterDisclosure>

      <nav aria-label={a("mlViewLabel", locale)} className="flex flex-wrap items-center gap-[var(--space-2)]">
        <ul className="m-0 flex list-none gap-[var(--space-2)] p-0">
          {(["grid", "table"] as const).map((view) => (
            <li key={view}>
              <Link href={href({ view, page: 1 })} aria-current={query.view === view ? "true" : undefined} className="console-chip">
                <ConsoleIcon name={view === "grid" ? "viewGrid" : "viewTable"} size={16} />
                <span>{a(view === "grid" ? "mlViewGrid" : "mlViewTable", locale)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {rows.length === 0 ? (
        filtered ? (
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
          <ResultCount text={a("mlSummary", locale, { total, missing: library.missingTotal, unused: library.unusedTotal })} />
          <form method="get" className="flex flex-col gap-[var(--space-3)]">
            <input type="hidden" name="back" value={back} />
            <fieldset className="m-0 flex flex-wrap items-center gap-[var(--space-3)] border-0 p-0">
              <legend className="visually-hidden">{a("mlBulkLabel", locale)}</legend>
              <SelectAllCheckbox locale={locale} />
              <Button type="submit" formAction={`${base}/bulk/edit`} variant="secondary" icon={<ConsoleIcon name="edit" />}>
                {a("mlBulkEdit", locale)}
              </Button>
              <Button type="submit" formAction={`${base}/bulk/delete`} variant="secondary" icon={<ConsoleIcon name="delete" />}>
                {a("mlBulkDelete", locale)}
              </Button>
              <span className="text-sm text-ink-600">{a("mlBulkHint", locale)}</span>
            </fieldset>

            {query.view === "grid" ? (
              <ul aria-label={a("mlGridCaption", locale, { shown: rows.length, total })} className="m-0 grid list-none gap-[var(--space-3)] p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {rows.map(({ image, uses }) => {
                  const name = displayName(image, locale);
                  return (
                    <li key={image.id} className="console-card flex flex-col overflow-hidden">
                      <Thumb storageKey={image.storageKey} className="h-40 w-full" locale={locale} />
                      <div className="flex flex-1 flex-col items-start gap-[var(--space-2)] p-[var(--space-3)]">
                        <label className="inline-flex min-h-[var(--target-min)] items-center gap-[var(--space-2)]">
                          <input type="checkbox" name="id" value={image.id} className={CHECKBOX} />
                          <span className="visually-hidden">{a("mlSelectPicture", locale, { name })}</span>
                          <Link href={contentPath(def, image.id)} className="font-medium">
                            {name}
                          </Link>
                        </label>
                        <div className="flex flex-wrap items-center gap-[var(--space-2)]">
                          <UseBadge count={uses.length} locale={locale} />
                          {isMissingAlt(image) ? <StatusTag tone="warning" label={a("mediaNeedsDescription", locale)} /> : null}
                        </div>
                        <p className="m-0 text-sm text-ink-600">
                          <Timestamp value={image.createdAt} locale={locale} format="date" />
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <table className="block w-full border-collapse text-left sm:table">
                <caption className="visually-hidden">{a("mlGridCaption", locale, { shown: rows.length, total })}</caption>
                <thead className="hidden sm:table-header-group">
                  <tr>
                    {(["", "mlColPicture", "mlColName", "mlColSize", "mlColUsed", "mlColBy", "mlColAdded"] as const).map((key, i) => (
                      <th key={i} scope="col" className="border-b border-line-strong px-[var(--space-3)] py-[var(--space-2)] font-semibold text-ink-900">
                        {key ? a(key, locale) : <span className="visually-hidden">{a("mlBulkLabel", locale)}</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="block sm:table-row-group">
                  {rows.map(({ image, uses }) => {
                    const name = displayName(image, locale);
                    return (
                      <tr key={image.id} className="block border-b border-line py-[var(--space-2)] sm:table-row sm:border-b-0 sm:py-0">
                        <td className={CELL}>
                          <label className="inline-flex min-h-[var(--target-min)] items-center">
                            <input type="checkbox" name="id" value={image.id} className={CHECKBOX} />
                            <span className="visually-hidden">{a("mlSelectPicture", locale, { name })}</span>
                          </label>
                        </td>
                        <td className={CELL}>
                          <Thumb storageKey={image.storageKey} className="h-14 w-20 rounded-control" locale={locale} />
                        </td>
                        <th scope="row" className="block px-[var(--space-3)] py-[var(--space-1)] text-left font-normal sm:table-cell sm:border-t sm:border-line sm:py-[var(--space-2)]">
                          <Link href={contentPath(def, image.id)} className="font-medium">
                            {name}
                          </Link>
                          <span className="block break-all text-sm text-ink-600">{imageFileName(image.storageKey)}</span>
                          {isMissingAlt(image) ? <StatusTag tone="warning" label={a("mediaNeedsDescription", locale)} /> : null}
                        </th>
                        <td data-label={a("mlColSize", locale)} className={CELL}>
                          {image.width && image.height ? a("mlPixels", locale, { width: image.width, height: image.height }) : a("mlUnknownSize", locale)}
                        </td>
                        <td data-label={a("mlColUsed", locale)} className={CELL}>
                          <UseBadge count={uses.length} locale={locale} />
                        </td>
                        <td data-label={a("mlColBy", locale)} className={CELL}>
                          {(image.createdBy && names.get(image.createdBy)) || a("mlUnknownPerson", locale)}
                        </td>
                        <td data-label={a("mlColAdded", locale)} className={CELL}>
                          <Timestamp value={image.createdAt} locale={locale} format="datetime" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </form>
          <Pagination currentPage={query.page} totalPages={library.totalPages} buildHref={(p) => href({ page: p })} locale={locale} />
        </>
      )}
    </ConsolePage>
  );
}
