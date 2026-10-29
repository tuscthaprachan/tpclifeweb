import Link from "next/link";
import { contentPlacement } from "@/app/admin/content/_list/placement";
import { PublishState, ResultCount, RowAction } from "@/app/admin/content/_list/parts";
import { ConsoleIcon } from "@/components/admin/icons";
import { Card, ConsolePage, EmptyPanel, PageHeader, SearchField, Toolbar } from "@/components/admin/ui";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { kindLabel } from "@/components/domain/lostfound/kindLabel";
import { statusLabel } from "@/components/domain/lostfound/statusLabel";
import { Button, DataTable, NotificationBanner, Timestamp, type DataTableColumn } from "@/components/ui";
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
    <Link href={contentPath(def, row.id)} className="font-medium">
      {rowTitle(row.title, locale)}
    </Link>
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
            cell: (row: LostFoundListRow) => <PublishState published={row.status === "published"} locale={locale} />,
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
        <RowAction href={contentPath(def, row.id)} icon="edit" name={row.reference}>
          {a("edit", locale)}
        </RowAction>
      ),
    },
  ];

  const place = contentPlacement(def);
  const add = (
    <Button href={`${contentPath(def)}/new`} icon={<ConsoleIcon name="add" />}>
      {a("listAdd", locale, { item: a(def.oneKey, locale) })}
    </Button>
  );

  return (
    <ConsolePage width="wide">
      <PageHeader title={a(def.labelKey, locale)} icon={place.icon} description={a("lfIntro", locale)} actions={add} />
      {notice === "deleted" ? (
        <NotificationBanner variant="success" title={a("listDeleted", locale)}>
          {a("listDeletedNote", locale)}
        </NotificationBanner>
      ) : null}

      <Card title={a("lfPendingTitle", locale)} icon="draft" description={a("lfPendingNote", locale)} padded={pending.length === 0}>
        {pending.length === 0 ? (
          <p className="m-0 flex items-center gap-[var(--space-2)] text-ink-600">
            <ConsoleIcon name="check" />
            {a("lfPendingNone", locale)}
          </p>
        ) : (
          <DataTable columns={columns(false)} rows={pending} getRowKey={(r) => r.id} caption={a("lfPendingTitle", locale)} />
        )}
      </Card>

      <Card title={a("lfAllTitle", locale)} icon={place.icon} padded={false}>
        <div className="flex flex-col gap-[var(--space-3)] p-[var(--space-3)]">
          <Toolbar search={<SearchField label={a("ccSearchLabel", locale, { label: a("lfAllTitle", locale).toLowerCase() })} submitLabel={a("ccSearchSubmit", locale)} defaultValue={q} />} />
          {rows.length === 0 ? (
            q ? (
              <EmptyPanel
                icon="search"
                title={a("listNoMatches", locale)}
                action={
                  <Button href={contentPath(def)} variant="secondary">
                    {a("ccClearFilters", locale)}
                  </Button>
                }
              >
                {a("ccNoMatchesHint", locale)}
              </EmptyPanel>
            ) : (
              <EmptyPanel icon={place.icon} title={a("lfListEmpty", locale)} action={add} />
            )
          ) : (
            <>
              <ResultCount text={a("ccResultCount", locale, { total: rows.length })} />
              <DataTable columns={columns(true)} rows={rows} getRowKey={(r) => r.id} caption={a("listCaption", locale, { shown: rows.length, total: rows.length, label: a(def.labelKey, locale) })} />
            </>
          )}
        </div>
      </Card>
    </ConsolePage>
  );
}
