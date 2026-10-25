import { AdminPage } from "@/components/admin/AdminPage";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { kindLabel } from "@/components/domain/lostfound/kindLabel";
import { statusLabel } from "@/components/domain/lostfound/statusLabel";
import { Button, DataTable, EmptyState, Heading, NotificationBanner, StatusTag, Timestamp, type DataTableColumn } from "@/components/ui";
import { rowTitle } from "@/components/admin/content/ContentList";
import { requireEditor } from "@/lib/admin/content/access";
import { contentPath, getContentType } from "@/lib/admin/content/types";
import { getAdminLocale } from "@/lib/admin/locale";
import { isAuthConfigured } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { a } from "@/lib/i18n/admin";
import { listLostFound, listPendingReports, type LostFoundListRow } from "./list";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getAdminLocale();
  return { title: a("typeLostFound", locale) };
}

export default async function LostFoundListPage({ searchParams }: { searchParams: Promise<{ q?: string; notice?: string }> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  await requireEditor();
  const { q, notice } = await searchParams;
  const def = getContentType("lost-and-found")!;
  const db = getDb();
  const [pending, rows] = await Promise.all([listPendingReports(db), listLostFound(db, q)]);

  const link = (row: LostFoundListRow) => (
    <a href={contentPath(def, row.id)} className="font-medium">
      {rowTitle(row.title, locale)}
    </a>
  );
  const columns = (withStatus: boolean): DataTableColumn<LostFoundListRow>[] => [
    { id: "reference", header: a("lfColReference", locale), cell: (row) => row.reference },
    { id: "kind", header: a("lfColKind", locale), cell: (row) => kindLabel(row.kind, locale) },
    { id: "item", header: a("lfColItem", locale), cell: link },
    ...(withStatus
      ? [
          {
            id: "status",
            header: a("listStatus", locale),
            cell: (row: LostFoundListRow) => (
              <StatusTag tone={row.status === "published" ? "success" : "neutral"} label={a(row.status === "published" ? "statusPublished" : "statusDraft", locale)} />
            ),
          },
          { id: "progress", header: a("lfColProgress", locale), cell: (row: LostFoundListRow) => statusLabel(row.registerStatus, locale) },
          { id: "updated", header: a("listUpdated", locale), cell: (row: LostFoundListRow) => <Timestamp value={row.updatedAt} locale={locale} format="datetime" /> },
        ]
      : [{ id: "received", header: a("lfColReceived", locale), cell: (row: LostFoundListRow) => <Timestamp value={row.createdAt} locale={locale} format="datetime" /> }]),
    {
      id: "edit",
      header: a("listActions", locale),
      align: "end",
      cell: (row) => (
        <a href={contentPath(def, row.id)}>
          {a("edit", locale)}
          <span className="visually-hidden"> {row.reference}</span>
        </a>
      ),
    },
  ];

  return (
    <AdminPage width="content">
      <div>
        <Heading level={1}>{a(def.labelKey, locale)}</Heading>
        <p className="mt-[var(--space-2)] text-ink-600">{a("lfIntro", locale)}</p>
      </div>
      {notice === "deleted" ? (
        <NotificationBanner variant="success" title={a("listDeleted", locale)}>
          {a("listDeletedNote", locale)}
        </NotificationBanner>
      ) : null}

      <section aria-labelledby="lf-pending" className="flex flex-col gap-[var(--space-3)]">
        <Heading level={2} id="lf-pending">
          {a("lfPendingTitle", locale)}
        </Heading>
        <p className="m-0 text-ink-600">{a("lfPendingNote", locale)}</p>
        {pending.length === 0 ? (
          <EmptyState illustration={false} title={a("lfPendingNone", locale)} />
        ) : (
          <DataTable columns={columns(false)} rows={pending} getRowKey={(r) => r.id} caption={a("lfPendingTitle", locale)} />
        )}
      </section>

      <section aria-labelledby="lf-all" className="flex flex-col gap-[var(--space-3)]">
        <Heading level={2} id="lf-all">
          {a("lfAllTitle", locale)}
        </Heading>
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
          <Button href={`${contentPath(def)}/new`}>{a("listAdd", locale, { item: a(def.oneKey, locale) })}</Button>
        </div>
        {rows.length === 0 ? (
          <EmptyState illustration={false} title={q ? a("listNoMatches", locale) : a("lfListEmpty", locale)} />
        ) : (
          <DataTable columns={columns(true)} rows={rows} getRowKey={(r) => r.id} caption={a("listCaption", locale, { shown: rows.length, total: rows.length, label: a(def.labelKey, locale) })} />
        )}
      </section>
    </AdminPage>
  );
}
