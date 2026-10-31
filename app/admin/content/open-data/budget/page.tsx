import { and, asc, count, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { ConsoleIcon } from "@/components/admin/icons";
import { Button, DataTable, NotificationBanner, Pagination, type DataTableColumn } from "@/components/ui";
import { ConsolePage, EmptyPanel, FilterChips, SearchField, Toolbar } from "@/components/admin/ui";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { RowAction, parsePage, queryString, ResultCount } from "@/app/admin/content/_list/parts";
import { getAdminLocale } from "@/lib/admin/locale";
import { requireOpenDataEditor } from "@/lib/admin/open-data/access";
import { OPEN_DATA_PATHS } from "@/lib/admin/open-data/paths";
import { isAuthConfigured } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { openDataBudgetLines } from "@/lib/db/schema/content/open-data";
import { formatMoney } from "@/components/domain/open-data/money";
import { a } from "@/lib/i18n/admin";
import { OpenDataHeader, OwnerChips, ownerLabel, parseOwner } from "../parts";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 50;
const escapeLike = (q: string) => q.replace(/[\\%_]/g, (c) => `\\${c}`);

export async function generateMetadata() {
  const locale = await getAdminLocale();
  return { title: a("odmTabBudget", locale) };
}

export default async function OpenDataBudgetPage({ searchParams }: { searchParams: Promise<{ q?: string; owner?: string; year?: string; page?: string; notice?: string }> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  const { owners } = await requireOpenDataEditor();
  const { q, owner: ownerParam, year: yearParam, page: pageParam, notice } = await searchParams;
  const owner = parseOwner(ownerParam, owners);
  const year = /^\d{4}$/.test(yearParam ?? "") ? Number.parseInt(yearParam!, 10) : undefined;
  const page = parsePage(pageParam);
  const term = q?.trim();
  const db = getDb();
  const scope = owner ? eq(openDataBudgetLines.owner, owner) : inArray(openDataBudgetLines.owner, owners);
  const where = and(
    scope,
    year ? eq(openDataBudgetLines.fiscalYear, year) : undefined,
    term
      ? or(
          ilike(openDataBudgetLines.organisation, `%${escapeLike(term)}%`),
          ilike(openDataBudgetLines.project, `%${escapeLike(term)}%`),
          ilike(openDataBudgetLines.category, `%${escapeLike(term)}%`),
        )
      : undefined,
  );
  const [rows, [totalRow], years] = await Promise.all([
    db
      .select()
      .from(openDataBudgetLines)
      .where(where)
      .orderBy(asc(openDataBudgetLines.owner), desc(openDataBudgetLines.fiscalYear), asc(openDataBudgetLines.view), asc(openDataBudgetLines.position))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(openDataBudgetLines).where(where),
    db.selectDistinct({ year: openDataBudgetLines.fiscalYear }).from(openDataBudgetLines).where(scope).orderBy(desc(openDataBudgetLines.fiscalYear)),
  ]);
  const total = totalRow?.total ?? 0;
  type Row = (typeof rows)[number];
  const hrefFor = (next: { year?: number; page?: number }) => `${OPEN_DATA_PATHS.budget}${queryString({ q: term, owner, year: next.year, page: next.page && next.page > 1 ? next.page : undefined })}`;
  const add = (
    <Button href={`${OPEN_DATA_PATHS.budget}/new`} icon={<ConsoleIcon name="add" />}>
      {a("listAdd", locale, { item: a("odmBudgetLineOne", locale) })}
    </Button>
  );
  const name = (row: Row) => `${row.fiscalYear} ${row.organisation}`;
  const columns: DataTableColumn<Row>[] = [
    { id: "year", header: a("odmFieldFiscalYear", locale), cell: (row) => row.fiscalYear },
    ...(owners.length > 1 ? [{ id: "owner", header: a("fieldOwner", locale), cell: (row: Row) => ownerLabel(row.owner, locale) }] : []),
    { id: "view", header: a("odmFieldView", locale), cell: (row) => a(row.view === "organisation" ? "odmViewOrganisation" : row.view === "project" ? "odmViewProject" : "odmViewCategory", locale) },
    { id: "organisation", header: a("odmFieldOrganisation", locale), cell: (row) => <a href={`${OPEN_DATA_PATHS.budget}/${row.id}`} className="font-medium">{row.organisation}</a> },
    { id: "project", header: a("odmFieldProject", locale), cell: (row) => row.project },
    { id: "category", header: a("odmFieldCategory", locale), cell: (row) => row.category },
    { id: "amount", header: a("odmFieldAmount", locale), align: "end", cell: (row) => formatMoney(row.amount, locale) },
    {
      id: "edit",
      header: a("listActions", locale),
      align: "end",
      cell: (row) => (
        <RowAction href={`${OPEN_DATA_PATHS.budget}/${row.id}`} icon="edit" name={name(row)}>
          {a("edit", locale)}
        </RowAction>
      ),
    },
  ];

  return (
    <ConsolePage width="wide">
      <OpenDataHeader
        locale={locale}
        section="budget"
        title={a("odmTabBudget", locale)}
        description={a("odmBudgetDesc", locale)}
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
        search={
          <SearchField
            label={a("ccSearchLabel", locale, { label: a("odmTabBudget", locale).toLowerCase() })}
            submitLabel={a("ccSearchSubmit", locale)}
            defaultValue={q}
            hidden={{ ...(owner ? { owner } : {}), ...(year ? { year: String(year) } : {}) }}
          />
        }
        filters={
          <div className="flex flex-wrap gap-[var(--space-3)]">
            <OwnerChips locale={locale} owners={owners} current={owner} base={OPEN_DATA_PATHS.budget} params={{ q: term, year: year ? String(year) : undefined }} />
            {years.length > 0 ? (
              <FilterChips
                label={a("odmFilterYear", locale)}
                current={year ? String(year) : "all"}
                options={[{ id: "all", label: a("ccFilterAll", locale), href: hrefFor({}) }, ...years.map((y) => ({ id: String(y.year), label: String(y.year), href: hrefFor({ year: y.year }) }))]}
              />
            ) : null}
          </div>
        }
      />
      {rows.length === 0 ? (
        <EmptyPanel icon="info" title={a("listNoMatches", locale)} action={add}>
          {a("ccNoMatchesHint", locale)}
        </EmptyPanel>
      ) : (
        <>
          <ResultCount text={a("ccResultCount", locale, { total })} />
          <DataTable columns={columns} rows={rows} getRowKey={(r) => r.id} caption={a("listCaption", locale, { shown: rows.length, total, label: a("odmTabBudget", locale) })} />
          <Pagination currentPage={page} totalPages={Math.ceil(total / PAGE_SIZE)} buildHref={(p) => hrefFor({ year, page: p })} locale={locale} />
        </>
      )}
    </ConsolePage>
  );
}
