import Form from "next/form";
import Link from "next/link";
import { ConsoleIcon } from "@/components/admin/icons";
import { Button, NotificationBanner, Pagination, Timestamp } from "@/components/ui";
import { ConsolePage, EmptyPanel, FilterChips, FilterDisclosure, PageHeader, SearchField, Toolbar } from "@/components/admin/ui";
import { BulkBar, SelectAllCheckbox } from "@/components/admin/content/BulkControls";
import { ContentTable, type ContentTableColumn } from "@/components/admin/content/ContentTable";
import { RowMenu } from "@/components/admin/content/RowMenu";
import { StatusBadge, STATUS_BADGES } from "@/components/admin/content/StatusBadge";
import { scheduleState } from "@/lib/admin/content/schedule";
import { contentPlacement } from "@/app/admin/content/_list/placement";
import { bulkContentAction } from "@/app/admin/content/bulk/actions";
import { queryString, ResultCount, RowAction } from "@/app/admin/content/_list/parts";
import type { BulkFailure } from "@/lib/admin/content/bulk";
import { contentPath, type ContentTypeDef } from "@/lib/admin/content/types";
import { LIST_PAGE_SIZE, type ContentListRow, type StatusCounts } from "@/lib/admin/content/list";
import type { ListExtras } from "@/lib/admin/content/list-extras";
import { activeFilters, listHref, listParams, nextSort, withoutFilter, type ListQuery, type ListWithin, type SortKey } from "@/lib/admin/content/list-query";
import { a, type AdminKey } from "@/lib/i18n/admin";
import { localePath, pick, type Locale } from "@/lib/i18n/config";

const listStatus = (row: ContentListRow): string => {
  const state = scheduleState({ status: row.status, publishAt: row.publishAt, unpublishAt: row.unpublishAt });
  return state === "live" ? "published" : state;
};

export interface BulkReport {
  action: "publish" | "unpublish" | "delete";
  ok: number;
  failed: (BulkFailure & { title: string })[];
}

interface ContentListProps {
  def: ContentTypeDef;
  locale: Locale;
  rows: ContentListRow[];
  /** Rows matching the filters, which can be more than `rows` holds. */
  total: number;
  /** The parsed `?q=&status=&sort=&dir=&by=&within=&facet=&page=`. */
  query: ListQuery;
  /** Rows per status for the chips; leave out for a type with no status. */
  counts?: StatusCounts;
  /** Staff who have edited this type, for the "edited by" filter. */
  editors?: { id: string; name: string }[];
  /** The type's date column and facet, from `listExtras`. */
  extras?: ListExtras;
  /** Show the checkboxes and the bulk action bar. */
  bulk?: boolean;
  /** What the last bulk action did, for the notice. */
  bulkReport?: BulkReport;
  /** Show "Add new". Defaults to true. */
  canAdd?: boolean;
  /** From `?notice=`; "deleted" shows a confirmation. */
  notice?: string;
}

/** A row's title in the staff member's language, falling back to the other language, then "Untitled". */
export function rowTitle(title: { th: string; en: string }, locale: Locale): string {
  return pick(title, locale) || title.th || title.en || a("untitled", locale);
}

const WITHIN_KEYS: Record<ListWithin, AdminKey> = { "7d": "clWithin7", "30d": "clWithin30" };
const REASON_KEYS = {
  missingTh: "clReasonMissingTh",
  missingEn: "clReasonMissingEn",
  missingBoth: "clReasonMissingBoth",
  notFound: "clReasonNotFound",
  inUse: "clReasonInUse",
  error: "clReasonError",
} as const satisfies Record<BulkFailure["reason"], AdminKey>;
const SUMMARY_KEYS = { publish: "clBulkSummaryPublish", unpublish: "clBulkSummaryUnpublish", delete: "clBulkSummaryDelete" } as const satisfies Record<BulkReport["action"], AdminKey>;

const SELECT = "min-h-[var(--target-min)] rounded-control border border-line-strong bg-surface px-[var(--space-3)] py-[var(--space-2)]";

/**
 * The list page of a content type: header with the Add button, search, status
 * chips and filters (all plain GET links and forms), removable filter chips,
 * a sortable table with bulk actions, CSV export and real pagination. A
 * server component; the only client code is the select-all box and the bulk bar.
 */
export function ContentList({ def, locale, rows, total, query, counts, editors = [], extras = {}, bulk = false, bulkReport, canAdd = true, notice }: ContentListProps) {
  const label = a(def.labelKey, locale);
  const place = contentPlacement(def);
  const base = contentPath(def);
  const hasStatus = Boolean(def.columns.status);
  const { q, status } = query;
  const active = activeFilters(query);
  const filtered = active.length > 0;
  const addLabel = a("listAdd", locale, { item: a(def.oneKey, locale) });
  const add = <Button href={`${base}/new`} icon={<ConsoleIcon name="add" />}>{addLabel}</Button>;
  const exportHref = `/admin/content/export/${def.segment}${queryString({ q, status, by: query.by, within: query.within, facet: query.facet, sort: query.sort, dir: query.dir })}`;
  const back = listParams(query);
  const hrefTo = (overrides: Partial<ListQuery>) => listHref(base, query, overrides);
  const sortHref = (key: SortKey) => hrefTo(nextSort(query, key));
  const facet = extras.facet;
  const editorName = editors.find((e) => e.id === query.by)?.name ?? query.by;

  const liveHref = (row: ContentListRow) => (def.viewPath && row.slug && listStatus(row) === "published" ? localePath(locale, `${def.viewPath}/${row.slug}`) : null);

  const columns: ContentTableColumn<ContentListRow>[] = [
    ...(bulk
      ? [
          {
            id: "select",
            header: a("clBulkActions", locale),
            headerHidden: true,
            mobile: "select",
            cell: (row: ContentListRow) => (
              <label className="inline-flex min-h-[var(--target-min)] items-center">
                <input type="checkbox" name="id" value={row.id} className="h-[1.25rem] w-[1.25rem] accent-[var(--colour-action)]" />
                <span className="visually-hidden">{a("clSelectRow", locale, { name: rowTitle(row.title, locale) })}</span>
              </label>
            ),
          } satisfies ContentTableColumn<ContentListRow>,
        ]
      : []),
    {
      id: "title",
      header: a("listTitle", locale),
      rowHeader: true,
      mobile: "wide",
      sort: def.columns.title ? { key: "title", href: sortHref("title") } : undefined,
      cell: (row) => (
        <Link href={contentPath(def, row.id)} className="inline-flex min-h-[var(--target-min)] items-center font-medium sm:min-h-0">
          {rowTitle(row.title, locale)}
        </Link>
      ),
    },
    ...(hasStatus
      ? [
          {
            id: "status",
            header: a("listStatus", locale),
            mobile: "sub",
            sort: { key: "status", href: sortHref("status") },
            cell: (row: ContentListRow) => <StatusBadge status={listStatus(row)} locale={locale} />,
          } satisfies ContentTableColumn<ContentListRow>,
        ]
      : []),
    {
      id: "updated",
      header: a("listUpdated", locale),
      mobile: extras.date ? "hidden" : "note",
      sort: { key: "updated", href: sortHref("updated") },
      cell: (row) => (
        <span className="flex flex-wrap gap-x-[var(--space-2)] sm:flex-col">
          <Timestamp value={row.updatedAt} locale={locale} format="datetime" />
          {row.updatedByName ? <span className="text-sm text-ink-600">{a("ccBy", locale, { name: row.updatedByName })}</span> : null}
        </span>
      ),
    },
    {
      id: "actions",
      header: a("listActions", locale),
      align: "end",
      mobile: "action",
      cell: (row) => {
        const name = rowTitle(row.title, locale);
        const live = liveHref(row);
        return (
          <span className="inline-flex flex-wrap items-center justify-end gap-x-[var(--space-3)] gap-y-[var(--space-1)]">
            <RowAction href={contentPath(def, row.id)} icon="edit" name={name}>
              {a("edit", locale)}
            </RowAction>
            <RowMenu
              locale={locale}
              name={name}
              items={[
                { href: contentPath(def, row.id), icon: "edit", label: a("edit", locale) },
                ...(live ? [{ href: live, icon: "viewLive" as const, label: a("ccViewLive", locale), external: true }] : []),
                ...(bulk
                  ? [{ href: `/admin/content/bulk/${def.segment}${queryString({ id: row.id, back })}`, icon: "delete" as const, label: a("clBulkDelete", locale) }]
                  : []),
              ]}
            />
          </span>
        );
      },
    },
  ];
  if (extras.date) {
    const dateColumn: ContentTableColumn<ContentListRow> = {
      id: "date",
      header: a(extras.date.labelKey, locale),
      mobile: "note",
      sort: { key: "date", href: sortHref("date") },
      cell: (row) => (row.date ? <Timestamp value={row.date} locale={locale} format="date" /> : <span className="text-ink-600">-</span>),
    };
    columns.splice(columns.findIndex((c) => c.id === "updated"), 0, dateColumn);
  }

  const sortOptions: { key: SortKey; label: string }[] = columns.filter((c) => c.sort).map((c) => ({ key: c.sort!.key, label: c.header }));
  const totalPages = Math.ceil(total / LIST_PAGE_SIZE);
  const chips = counts
    ? [
        { id: "all", label: a("ccFilterAll", locale), href: hrefTo({ status: undefined }), count: counts.all },
        { id: "published", label: a("statusPublished", locale), href: hrefTo({ status: "published" }), count: counts.published },
        { id: "draft", label: a("statusDraft", locale), href: hrefTo({ status: "draft" }), count: counts.draft },
        ...(["scheduled", "expired"] as const)
          .filter((state) => counts[state] > 0 || status === state)
          .map((state) => ({ id: state, label: a(STATUS_BADGES[state]!.labelKey, locale), href: hrefTo({ status: state }), count: counts[state] })),
      ]
    : [];

  const chipItems: { id: string; text: string; href: string }[] = active.map((filter) => {
    const value =
      filter === "q"
        ? a("clChipSearch", locale, { value: q ?? "" })
        : filter === "status"
          ? a("clChipStatus", locale, { value: a(STATUS_BADGES[status === "published" ? "published" : status!]!.labelKey, locale) })
          : filter === "by"
            ? a("clChipBy", locale, { value: editorName ?? "" })
            : filter === "within"
              ? a("clChipWithin", locale, { value: a(WITHIN_KEYS[query.within!], locale) })
              : a("clChipFacet", locale, {
                  label: facet ? a(facet.labelKey, locale) : "",
                  value: facet ? a(facet.options.find((o) => o.value === query.facet)?.labelKey ?? "clFilterFacetAny", locale) : "",
                });
    return { id: filter, text: value, href: listHref(base, withoutFilter(query, filter)) };
  });

  const hiddenKeep = (omit: string[] = []): Record<string, string> => {
    const keep: Record<string, string | undefined> = { q, status, by: query.by, within: query.within, facet: query.facet, ...(listParams({ sort: query.sort, dir: query.dir }) ? { sort: query.sort, dir: query.dir } : {}) };
    return Object.fromEntries(Object.entries(keep).filter(([k, v]) => v && !omit.includes(k))) as Record<string, string>;
  };

  const showFilters = editors.length > 0 || facet;

  return (
    <ConsolePage width="wide">
      <PageHeader title={label} icon={place.icon} description={a(def.descriptionKey, locale)} actions={canAdd ? add : undefined} />
      {notice === "deleted" ? (
        <NotificationBanner variant="success" title={a("listDeleted", locale)}>
          {a("listDeletedNote", locale)}
        </NotificationBanner>
      ) : null}
      {bulkReport ? (
        <NotificationBanner
          variant={bulkReport.failed.length === 0 ? "success" : bulkReport.ok === 0 ? "warning" : "warning"}
          title={a(bulkReport.failed.length === 0 ? "clBulkDoneTitle" : bulkReport.ok === 0 ? "clBulkFailedTitle" : "clBulkPartialTitle", locale)}
        >
          <p className="m-0">{a(SUMMARY_KEYS[bulkReport.action], locale, { ok: bulkReport.ok, failed: bulkReport.failed.length })}</p>
          {bulkReport.failed.length > 0 ? (
            <ul className="m-0 mt-[var(--space-2)] flex flex-col gap-[var(--space-1)] pl-[var(--space-5)]">
              {bulkReport.failed.map((f) => (
                <li key={f.id}>{a("clBulkFailureItem", locale, { title: f.title, reason: a(REASON_KEYS[f.reason], locale) })}</li>
              ))}
            </ul>
          ) : null}
        </NotificationBanner>
      ) : null}
      {notice === "bulkNone" ? (
        <NotificationBanner variant="warning" title={a("clBulkNone", locale)}>
          {a("ccNoMatchesHint", locale)}
        </NotificationBanner>
      ) : null}
      <Toolbar
        search={<SearchField label={a("ccSearchLabel", locale, { label: label.toLowerCase() })} submitLabel={a("ccSearchSubmit", locale)} defaultValue={q} hidden={hiddenKeep(["q"])} />}
        filters={hasStatus && counts ? <FilterChips label={a("ccFilterStatus", locale)} options={chips} current={status ?? "all"} /> : undefined}
        actions={
          def.columns.title ? (
            <Button href={exportHref} variant="secondary" icon={<ConsoleIcon name="download" />} download>
              {a("clExport", locale)}
              <span className="visually-hidden">. {a("clExportNote", locale)}</span>
            </Button>
          ) : undefined
        }
      />
      {showFilters ? (
        <FilterDisclosure label={a("clFilters", locale)} defaultOpen={Boolean(query.by || query.within || query.facet)}>
        <Form action="" className="flex flex-wrap items-end gap-[var(--space-3)]">
          {Object.entries(hiddenKeep(["by", "within", "facet"])).map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={value} />
          ))}
          {editors.length > 0 ? (
            <div className="flex flex-col gap-[var(--space-1)]">
              <label htmlFor="list-by" className="text-sm font-medium">
                {a("clFilterBy", locale)}
              </label>
              <select id="list-by" name="by" defaultValue={query.by ?? ""} className={SELECT}>
                <option value="">{a("clFilterByAny", locale)}</option>
                {editors.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="flex flex-col gap-[var(--space-1)]">
            <label htmlFor="list-within" className="text-sm font-medium">
              {a("clFilterWithin", locale)}
            </label>
            <select id="list-within" name="within" defaultValue={query.within ?? ""} className={SELECT}>
              <option value="">{a("clWithinAny", locale)}</option>
              <option value="7d">{a("clWithin7", locale)}</option>
              <option value="30d">{a("clWithin30", locale)}</option>
            </select>
          </div>
          {facet ? (
            <div className="flex flex-col gap-[var(--space-1)]">
              <label htmlFor="list-facet" className="text-sm font-medium">
                {a(facet.labelKey, locale)}
              </label>
              <select id="list-facet" name="facet" defaultValue={query.facet ?? ""} className={SELECT}>
                <option value="">{a("clFilterFacetAny", locale)}</option>
                {facet.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {a(o.labelKey, locale)}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <Button type="submit" variant="secondary" icon={<ConsoleIcon name="filter" />}>
            {a("clApplyFilters", locale)}
          </Button>
        </Form>
        </FilterDisclosure>
      ) : null}
      {filtered ? (
        <nav aria-label={a("clActiveFilters", locale)}>
          <ul className="m-0 flex list-none flex-wrap items-center gap-[var(--space-2)] p-0">
            {chipItems.map((chip) => (
              <li key={chip.id}>
                <Link href={chip.href} className="console-chip">
                  <span>{chip.text}</span>
                  <ConsoleIcon name="close" size={14} />
                  <span className="visually-hidden">{a("clRemoveFilter", locale, { filter: chip.text })}</span>
                </Link>
              </li>
            ))}
            <li>
              <Link href={listHref(base, { ...query, q: undefined, status: undefined, by: undefined, within: undefined, facet: undefined })} className="inline-flex min-h-[var(--target-min)] items-center">
                {a("ccClearFilters", locale)}
              </Link>
            </li>
          </ul>
        </nav>
      ) : null}

      {rows.length === 0 ? (
        filtered ? (
          <EmptyPanel
            icon="search"
            title={a("listNoMatches", locale)}
            action={
              <Button href={listHref(base, { ...query, q: undefined, status: undefined, by: undefined, within: undefined, facet: undefined })} variant="secondary">
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
          <nav aria-label={a("clSortBy", locale, { column: "" }).trim()} className="sm:hidden">
            <ul className="m-0 flex list-none flex-wrap gap-[var(--space-2)] p-0">
              {sortOptions.map((option) => (
                <li key={option.key}>
                  <Link href={sortHref(option.key)} aria-current={query.sort === option.key ? "true" : undefined} className="console-chip">
                    {query.sort === option.key ? <ConsoleIcon name={query.dir === "asc" ? "moveUp" : "moveDown"} size={14} /> : null}
                    <span>{option.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          {bulk ? (
            <form action={bulkContentAction} className="flex flex-col gap-[var(--space-3)]">
              <input type="hidden" name="segment" value={def.segment} />
              <input type="hidden" name="back" value={back} />
              <SelectAllCheckbox locale={locale} />
              <ContentTable columns={columns} rows={rows} getRowKey={(r) => r.id} caption={a("listCaption", locale, { shown: rows.length, total, label })} sort={{ key: query.sort, dir: query.dir }} locale={locale} />
              <BulkBar locale={locale} canChangeStatus={hasStatus} />
            </form>
          ) : (
            <ContentTable columns={columns} rows={rows} getRowKey={(r) => r.id} caption={a("listCaption", locale, { shown: rows.length, total, label })} sort={{ key: query.sort, dir: query.dir }} locale={locale} />
          )}
          <Pagination currentPage={query.page} totalPages={totalPages} buildHref={(p) => hrefTo({ page: p })} locale={locale} />
        </>
      )}
    </ConsolePage>
  );
}
