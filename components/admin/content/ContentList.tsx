import { Button, DataTable, NotificationBanner, EmptyState, StatusTag, Timestamp, type DataTableColumn } from "@/components/ui";
import { contentPath, type ContentTypeDef } from "@/lib/admin/content/types";
import type { ContentListRow } from "@/lib/admin/content/list";
import { a } from "@/lib/i18n/admin";
import { pick, type Locale } from "@/lib/i18n/config";

interface ContentListProps {
  def: ContentTypeDef;
  locale: Locale;
  rows: ContentListRow[];
  /** Rows matching the filter, which can be more than `rows` holds. */
  total: number;
  /** The current filter text, from `?q=`. */
  q?: string;
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
 * The list page of a content type: a text filter (a plain GET form), the
 * rows with status and last edit, and an Add button. A server component.
 */
export function ContentList({ def, locale, rows, total, q, canAdd = true, notice }: ContentListProps) {
  const label = a(def.labelKey, locale);
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
    ...(def.columns.status
      ? [
          {
            id: "status",
            header: a("listStatus", locale),
            cell: (row: ContentListRow) => (
              <StatusTag
                tone={row.status === "published" ? "success" : "neutral"}
                label={a(row.status === "published" ? "statusPublished" : "statusDraft", locale)}
              />
            ),
          },
        ]
      : []),
    { id: "updated", header: a("listUpdated", locale), cell: (row) => <Timestamp value={row.updatedAt} locale={locale} format="datetime" /> },
    {
      id: "edit",
      header: a("listActions", locale),
      align: "end",
      cell: (row) => (
        <a href={contentPath(def, row.id)}>
          {a("edit", locale)}
          <span className="visually-hidden"> {rowTitle(row.title, locale)}</span>
        </a>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      {notice === "deleted" ? (
        <NotificationBanner variant="success" title={a("listDeleted", locale)}>
          {a("listDeletedNote", locale)}
        </NotificationBanner>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-[var(--space-4)]">
        <form method="get" role="search" className="flex flex-wrap items-end gap-[var(--space-2)]">
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
          {q ? (
            <Button href={contentPath(def)} variant="quiet">
              {a("listFilterClear", locale)}
            </Button>
          ) : null}
        </form>
        {canAdd ? <Button href={`${contentPath(def)}/new`}>{a("listAdd", locale, { item: a(def.oneKey, locale) })}</Button> : null}
      </div>

      {rows.length === 0 ? (
        <EmptyState illustration={false} title={q ? a("listNoMatches", locale) : a("listEmpty", locale, { label: label.toLowerCase() })} />
      ) : (
        <>
          <DataTable columns={columns} rows={rows} getRowKey={(r) => r.id} caption={a("listCaption", locale, { shown: rows.length, total, label })} />
          {total > rows.length ? <p className="m-0 text-sm text-ink-600">{a("listTruncated", locale, { shown: rows.length, total })}</p> : null}
        </>
      )}
    </div>
  );
}
