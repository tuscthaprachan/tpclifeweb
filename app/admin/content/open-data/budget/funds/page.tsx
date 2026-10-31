import { and, asc, count, eq, ilike, inArray, or } from "drizzle-orm";
import { ConsoleIcon } from "@/components/admin/icons";
import { Button, DataTable, NotificationBanner, Pagination, type DataTableColumn } from "@/components/ui";
import { ConsolePage, EmptyPanel, SearchField, Toolbar } from "@/components/admin/ui";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { RowAction, parsePage, queryString, ResultCount } from "@/app/admin/content/_list/parts";
import { getAdminLocale } from "@/lib/admin/locale";
import { requireOpenDataEditor } from "@/lib/admin/open-data/access";
import { OPEN_DATA_PATHS } from "@/lib/admin/open-data/paths";
import { isAuthConfigured } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { openDataFunds } from "@/lib/db/schema/content/open-data";
import { a } from "@/lib/i18n/admin";
import { OpenDataHeader, OwnerChips, ownerLabel, parseOwner } from "../../parts";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 50;
const escapeLike = (q: string) => q.replace(/[\\%_]/g, (c) => `\\${c}`);

export async function generateMetadata() {
  const locale = await getAdminLocale();
  return { title: a("odmTabFunds", locale) };
}

export default async function OpenDataFundsPage({ searchParams }: { searchParams: Promise<{ q?: string; owner?: string; page?: string; notice?: string }> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  const { owners } = await requireOpenDataEditor();
  const { q, owner: ownerParam, page: pageParam, notice } = await searchParams;
  const owner = parseOwner(ownerParam, owners);
  const page = parsePage(pageParam);
  const term = q?.trim();
  const where = and(
    owner ? eq(openDataFunds.owner, owner) : inArray(openDataFunds.owner, owners),
    term ? or(ilike(openDataFunds.name, `%${escapeLike(term)}%`), ilike(openDataFunds.code, `${escapeLike(term)}%`), ilike(openDataFunds.type, `%${escapeLike(term)}%`)) : undefined,
  );
  const db = getDb();
  const [rows, [totalRow]] = await Promise.all([
    db.select().from(openDataFunds).where(where).orderBy(asc(openDataFunds.owner), asc(openDataFunds.number)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(openDataFunds).where(where),
  ]);
  const total = totalRow?.total ?? 0;
  type Row = (typeof rows)[number];
  const hrefFor = (p: number) => `${OPEN_DATA_PATHS.funds}${queryString({ q: term, owner, page: p > 1 ? p : undefined })}`;
  const add = (
    <Button href={`${OPEN_DATA_PATHS.funds}/new`} icon={<ConsoleIcon name="add" />}>
      {a("listAdd", locale, { item: a("odmFundOne", locale) })}
    </Button>
  );
  const columns: DataTableColumn<Row>[] = [
    { id: "number", header: a("odmFieldFundNumber", locale), cell: (row) => row.number },
    { id: "code", header: a("odmFieldFundCode", locale), cell: (row) => row.code },
    { id: "name", header: a("odmFieldFundName", locale), cell: (row) => <a href={`${OPEN_DATA_PATHS.funds}/${row.id}`} className="font-medium">{row.name}</a> },
    { id: "type", header: a("odmFieldFundType", locale), cell: (row) => row.type },
    ...(owners.length > 1 ? [{ id: "owner", header: a("fieldOwner", locale), cell: (row: Row) => ownerLabel(row.owner, locale) }] : []),
    {
      id: "edit",
      header: a("listActions", locale),
      align: "end",
      cell: (row) => (
        <RowAction href={`${OPEN_DATA_PATHS.funds}/${row.id}`} icon="edit" name={row.name}>
          {a("edit", locale)}
        </RowAction>
      ),
    },
  ];

  return (
    <ConsolePage width="wide">
      <OpenDataHeader
        locale={locale}
        section="funds"
        title={a("odmTabFunds", locale)}
        description={a("odmFundsDesc", locale)}
        actions={
          <>
            <Button href={OPEN_DATA_PATHS.import} variant="secondary" icon={<ConsoleIcon name="upload" />}>
              {a("odmTabImport", locale)}
            </Button>
            {add}
          </>
        }
      />
      {notice === "deleted" ? (
        <NotificationBanner variant="success" title={a("listDeleted", locale)}>
          {a("listDeletedNote", locale)}
        </NotificationBanner>
      ) : null}
      <Toolbar
        search={<SearchField label={a("ccSearchLabel", locale, { label: a("odmTabFunds", locale).toLowerCase() })} submitLabel={a("ccSearchSubmit", locale)} defaultValue={q} hidden={owner ? { owner } : undefined} />}
        filters={<OwnerChips locale={locale} owners={owners} current={owner} base={OPEN_DATA_PATHS.funds} params={{ q: term }} />}
      />
      {rows.length === 0 ? (
        <EmptyPanel icon="info" title={a("listNoMatches", locale)} action={add}>
          {a("ccNoMatchesHint", locale)}
        </EmptyPanel>
      ) : (
        <>
          <ResultCount text={a("ccResultCount", locale, { total })} />
          <DataTable columns={columns} rows={rows} getRowKey={(r) => r.id} caption={a("listCaption", locale, { shown: rows.length, total, label: a("odmTabFunds", locale) })} />
          <Pagination currentPage={page} totalPages={Math.ceil(total / PAGE_SIZE)} buildHref={hrefFor} locale={locale} />
        </>
      )}
    </ConsolePage>
  );
}
