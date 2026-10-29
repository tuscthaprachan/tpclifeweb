import { ConsoleIcon } from "@/components/admin/icons";
import { Button, DataTable, NotificationBanner, Pagination, Timestamp, type DataTableColumn } from "@/components/ui";
import { ConsolePage, EmptyPanel, FilterChips, PageHeader, SearchField, Toolbar } from "@/components/admin/ui";
import { contentPlacement } from "@/app/admin/content/_list/placement";
import { PublishState, queryString, ResultCount, RowAction } from "@/app/admin/content/_list/parts";
import { contentPath, type ContentTypeDef } from "@/lib/admin/content/types";
import { LIST_PAGE_SIZE, type ContentListRow, type ListStatus } from "@/lib/admin/content/list";
import { a } from "@/lib/i18n/admin";
import { localePath, pick, type Locale } from "@/lib/i18n/config";

interface ContentListProps {
  def: ContentTypeDef;
  locale: Locale;
  rows: ContentListRow[];
  /** Rows matching the filters, which can be more than `rows` holds. */
  total: number;
  /** The current filter text, from `?q=`. */
  q?: string;
  /** From `?status=`; undefined is "all". */
  status?: ListStatus;
  /** Rows per status for the chips; leave out for a type with no status. */
  counts?: { all: number; published: number; draft: number };
  /** The current page, from `?page=`. */
  page?: number;
  /** Show "Add new". Defaults to true. */
  canAdd?: boolean;
  /** From `?notice=`; "deleted" shows a confirmation. */
  notice?: string;
}

/** A row's title in the staff member's language, falling back to the other language, then "Untitled". */
export function rowTitle(title: { th: string; en: string }, locale: Locale): string {
  return pick(title, locale) || title.th || title.en || a("untitled", locale);
}

/**
 * The list page of a content type: header with the Add button, a search and
 * status filter toolbar (plain GET links and forms), a compact table with
 * status, last edit and row actions, and real pagination. A server component.
 */
export function ContentList({ def, locale, rows, total, q, status, counts, page = 1, canAdd = true, notice }: ContentListProps) {
  const label = a(def.labelKey, locale);
  const place = contentPlacement(def);
  const base = contentPath(def);
  const hasStatus = Boolean(def.columns.status);
  const filtered = Boolean(q) || Boolean(status);
  const hrefFor = (next: { status?: ListStatus; page?: number }) => `${base}${queryString({ q, status: next.status, page: next.page && next.page > 1 ? next.page : undefined })}`;
  const addHref = `${base}/new`;
  const addLabel = a("listAdd", locale, { item: a(def.oneKey, locale) });
  const add = <Button href={addHref} icon={<ConsoleIcon name="add" />}>{addLabel}</Button>;

  const columns: DataTableColumn<ContentListRow>[] = [
    {
      id: "title",
      header: a("listTitle", locale),
      cell: (row) => (
        <a href={contentPath(def, row.id)} className="font-medium">
          {rowTitle(row.title, locale)}
        </a>
      ),
    },
    ...(hasStatus
      ? [{ id: "status", header: a("listStatus", locale), cell: (row: ContentListRow) => <PublishState published={row.status === "published"} locale={locale} /> }]
      : []),
    {
      id: "updated",
      header: a("listUpdated", locale),
      cell: (row) => (
        <span className="flex flex-col">
          <Timestamp value={row.updatedAt} locale={locale} format="datetime" />
          {row.updatedByName ? <span className="text-sm text-ink-600">{a("ccBy", locale, { name: row.updatedByName })}</span> : null}
        </span>
      ),
    },
    {
      id: "edit",
      header: a("listActions", locale),
      align: "end",
      cell: (row) => {
        const name = rowTitle(row.title, locale);
        const live = def.viewPath && row.slug && row.status === "published" ? localePath(locale, `${def.viewPath}/${row.slug}`) : null;
        return (
          <span className="inline-flex flex-wrap justify-end gap-x-[var(--space-3)]">
            <RowAction href={contentPath(def, row.id)} icon="edit" name={name}>
              {a("edit", locale)}
            </RowAction>
            {live ? (
              <RowAction href={live} icon="viewLive" name={name} external>
                {a("ccViewLive", locale)}
              </RowAction>
            ) : null}
          </span>
        );
      },
    },
  ];

  const totalPages = Math.ceil(total / LIST_PAGE_SIZE);
  const chips = counts
    ? [
        { id: "all", label: a("ccFilterAll", locale), href: hrefFor({}), count: counts.all },
        { id: "published", label: a("statusPublished", locale), href: hrefFor({ status: "published" }), count: counts.published },
        { id: "draft", label: a("statusDraft", locale), href: hrefFor({ status: "draft" }), count: counts.draft },
      ]
    : [];

  return (
    <ConsolePage width="wide">
      <PageHeader title={label} icon={place.icon} description={a(def.descriptionKey, locale)} actions={canAdd ? add : undefined} />
      {notice === "deleted" ? (
        <NotificationBanner variant="success" title={a("listDeleted", locale)}>
          {a("listDeletedNote", locale)}
        </NotificationBanner>
      ) : null}
      <Toolbar
        search={
          <SearchField
            label={a("ccSearchLabel", locale, { label: label.toLowerCase() })}
            submitLabel={a("ccSearchSubmit", locale)}
            defaultValue={q}
            hidden={status ? { status } : undefined}
          />
        }
        filters={hasStatus && counts ? <FilterChips label={a("ccFilterStatus", locale)} options={chips} current={status ?? "all"} /> : undefined}
      />

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
          <EmptyPanel icon={place.icon} title={a("listEmpty", locale, { label: label.toLowerCase() })} action={canAdd ? add : undefined}>
            {a("ccEmptyHint", locale)}
          </EmptyPanel>
        )
      ) : (
        <>
          <ResultCount text={a("ccResultCount", locale, { total })} />
          <DataTable columns={columns} rows={rows} getRowKey={(r) => r.id} caption={a("listCaption", locale, { shown: rows.length, total, label })} />
          <Pagination currentPage={page} totalPages={totalPages} buildHref={(p) => hrefFor({ status, page: p })} locale={locale} />
        </>
      )}
    </ConsolePage>
  );
}
