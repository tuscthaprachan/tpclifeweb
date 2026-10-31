import { and, asc, count, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { ConsoleIcon } from "@/components/admin/icons";
import { Button, DataTable, NotificationBanner, Pagination, type DataTableColumn } from "@/components/ui";
import { ConsolePage, EmptyPanel, FilterChips, PageHeader, SearchField, Toolbar } from "@/components/admin/ui";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { PublishState, queryString, ResultCount, RowAction, parsePage } from "@/app/admin/content/_list/parts";
import { LIST_PAGE_SIZE, parseListStatus } from "@/lib/admin/content/list";
import { contentPlacement, contentTypeBySegment } from "@/app/admin/content/_list/placement";
import { documentTypeLabel } from "@/components/domain/open-data/documents";
import { getAdminLocale } from "@/lib/admin/locale";
import { requireOpenDataEditor } from "@/lib/admin/open-data/access";
import { OPEN_DATA_PATHS } from "@/lib/admin/open-data/paths";
import { isAuthConfigured } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { openDataDocuments } from "@/lib/db/schema/content/open-data";
import { a } from "@/lib/i18n/admin";
import { OpenDataTabs, OwnerChips, ownerLabel, parseOwner } from "./parts";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getAdminLocale();
  return { title: a("typeOpenData", locale) };
}

type Search = { q?: string; owner?: string; status?: string; page?: string; notice?: string };
const escapeLike = (q: string) => q.replace(/[\\%_]/g, (c) => `\\${c}`);

interface Row {
  id: string;
  number: string;
  owner: string;
  type: string;
  titleTh: string;
  titleEn: string;
  status: "draft" | "published";
  hasFile: boolean;
}

export default async function OpenDataDocumentsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  const { owners } = await requireOpenDataEditor();
  const { q, owner: ownerParam, status: statusParam, page: pageParam, notice } = await searchParams;
  const def = contentTypeBySegment("open-data");
  const place = contentPlacement(def);
  const owner = parseOwner(ownerParam, owners);
  const status = parseListStatus(statusParam);
  const page = parsePage(pageParam);
  const term = q?.trim();

  const where = and(
    owner ? eq(openDataDocuments.owner, owner) : inArray(openDataDocuments.owner, owners),
    term
      ? or(
          ilike(openDataDocuments.titleTh, `%${escapeLike(term)}%`),
          ilike(openDataDocuments.titleEn, `%${escapeLike(term)}%`),
          ilike(openDataDocuments.number, `${escapeLike(term)}%`),
          ilike(openDataDocuments.reference, `%${escapeLike(term)}%`),
        )
      : undefined,
    status ? (status === "published" ? eq(openDataDocuments.status, "published") : sql`${openDataDocuments.status} <> 'published'`) : undefined,
  );
  const db = getDb();
  const [rows, [totalRow]] = await Promise.all([
    db
      .select({
        id: openDataDocuments.id,
        number: openDataDocuments.number,
        owner: openDataDocuments.owner,
        type: openDataDocuments.type,
        titleTh: openDataDocuments.titleTh,
        titleEn: openDataDocuments.titleEn,
        status: openDataDocuments.status,
        hasFile: sql<boolean>`${openDataDocuments.fileKey} is not null`,
      })
      .from(openDataDocuments)
      .where(where)
      .orderBy(asc(openDataDocuments.owner), asc(openDataDocuments.number))
      .limit(LIST_PAGE_SIZE)
      .offset((page - 1) * LIST_PAGE_SIZE) as Promise<Row[]>,
    db.select({ total: count() }).from(openDataDocuments).where(where),
  ]);
  const total = totalRow?.total ?? 0;
  const params = { q: term, owner, status };
  const hrefFor = (next: { status?: string; page?: number }) =>
    `${OPEN_DATA_PATHS.documents}${queryString({ q: term, owner, status: next.status, page: next.page && next.page > 1 ? next.page : undefined })}`;
  const add = (
    <Button href={`${OPEN_DATA_PATHS.documents}/new`} icon={<ConsoleIcon name="add" />}>
      {a("listAdd", locale, { item: a("typeOpenDataOne", locale) })}
    </Button>
  );
  const title = (row: Row) => (locale === "th" ? row.titleTh || row.titleEn : row.titleEn || row.titleTh) || a("untitled", locale);

  const columns: DataTableColumn<Row>[] = [
    { id: "number", header: a("odmColNumber", locale), cell: (row) => row.number },
    { id: "title", header: a("listTitle", locale), cell: (row) => <a href={`${OPEN_DATA_PATHS.documents}/${row.id}`} className="font-medium">{title(row)}</a> },
    ...(owners.length > 1 ? [{ id: "owner", header: a("fieldOwner", locale), cell: (row: Row) => ownerLabel(row.owner, locale) }] : []),
    { id: "type", header: a("odmFieldType", locale), cell: (row) => documentTypeLabel(row.type, locale) },
    { id: "file", header: a("odmColFile", locale), cell: (row) => a(row.hasFile ? "odmFileStored" : "odmFileNone", locale) },
    { id: "status", header: a("listStatus", locale), cell: (row) => <PublishState published={row.status === "published"} locale={locale} /> },
    {
      id: "edit",
      header: a("listActions", locale),
      align: "end",
      cell: (row) => (
        <RowAction href={`${OPEN_DATA_PATHS.documents}/${row.id}`} icon="edit" name={title(row)}>
          {a("edit", locale)}
        </RowAction>
      ),
    },
  ];

  return (
    <ConsolePage width="wide">
      <PageHeader title={a("typeOpenData", locale)} icon={place.icon} description={a("typeOpenDataDesc", locale)} actions={add} tabs={<OpenDataTabs locale={locale} current="documents" />} />
      {notice === "deleted" ? <NotificationBanner variant="success" title={a("listDeleted", locale)}>{a("listDeletedNote", locale)}</NotificationBanner> : null}
      <Toolbar
        search={<SearchField label={a("ccSearchLabel", locale, { label: a("odmTabDocuments", locale).toLowerCase() })} submitLabel={a("ccSearchSubmit", locale)} defaultValue={q} hidden={{ ...(owner ? { owner } : {}), ...(status ? { status } : {}) }} />}
        filters={
          <div className="flex flex-wrap gap-[var(--space-3)]">
            <OwnerChips locale={locale} owners={owners} current={owner} base={OPEN_DATA_PATHS.documents} params={params} />
            <FilterChips
              label={a("ccFilterStatus", locale)}
              current={status ?? "all"}
              options={[
                { id: "all", label: a("ccFilterAll", locale), href: hrefFor({}) },
                { id: "published", label: a("statusPublished", locale), href: hrefFor({ status: "published" }) },
                { id: "draft", label: a("statusDraft", locale), href: hrefFor({ status: "draft" }) },
              ]}
            />
          </div>
        }
      />
      {rows.length === 0 ? (
        <EmptyPanel icon={place.icon} title={a("listNoMatches", locale)} action={<Button href={OPEN_DATA_PATHS.documents} variant="secondary">{a("ccClearFilters", locale)}</Button>}>
          {a("ccNoMatchesHint", locale)}
        </EmptyPanel>
      ) : (
        <>
          <ResultCount text={a("ccResultCount", locale, { total })} />
          <DataTable columns={columns} rows={rows} getRowKey={(r) => r.id} caption={a("listCaption", locale, { shown: rows.length, total, label: a("typeOpenData", locale) })} />
          <Pagination currentPage={page} totalPages={Math.ceil(total / LIST_PAGE_SIZE)} buildHref={(p) => hrefFor({ status, page: p })} locale={locale} />
        </>
      )}
    </ConsolePage>
  );
}
