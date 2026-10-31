import { and, count, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { ConsoleIcon } from "@/components/admin/icons";
import { Button, DataTable, Pagination, type DataTableColumn } from "@/components/ui";
import { ConsolePage, EmptyPanel, SearchField, Toolbar } from "@/components/admin/ui";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { RowAction, parsePage, queryString, ResultCount } from "@/app/admin/content/_list/parts";
import { LIST_PAGE_SIZE } from "@/lib/admin/content/list";
import { getAdminLocale } from "@/lib/admin/locale";
import { requireOpenDataEditor } from "@/lib/admin/open-data/access";
import { OPEN_DATA_PATHS } from "@/lib/admin/open-data/paths";
import { isAuthConfigured } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { openDataDecisions, openDataMeetings } from "@/lib/db/schema/content/open-data";
import { a } from "@/lib/i18n/admin";
import { formatDate } from "@/lib/i18n/format";
import { OpenDataHeader, OwnerChips, ownerLabel, parseOwner } from "../parts";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getAdminLocale();
  return { title: a("odmTabMeetings", locale) };
}

const escapeLike = (q: string) => q.replace(/[\\%_]/g, (c) => `\\${c}`);

export default async function OpenDataMeetingsPage({ searchParams }: { searchParams: Promise<{ q?: string; owner?: string; page?: string }> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  const { owners } = await requireOpenDataEditor();
  const { q, owner: ownerParam, page: pageParam } = await searchParams;
  const owner = parseOwner(ownerParam, owners);
  const page = parsePage(pageParam);
  const term = q?.trim();
  const where = and(
    owner ? eq(openDataMeetings.owner, owner) : inArray(openDataMeetings.owner, owners),
    term ? or(ilike(openDataMeetings.titleTh, `%${escapeLike(term)}%`), ilike(openDataMeetings.slug, `%${escapeLike(term)}%`), ilike(openDataMeetings.place, `%${escapeLike(term)}%`)) : undefined,
  );
  const db = getDb();
  const [rows, [totalRow]] = await Promise.all([
    db
      .select({
        id: openDataMeetings.id,
        owner: openDataMeetings.owner,
        slug: openDataMeetings.slug,
        titleTh: openDataMeetings.titleTh,
        meetingDate: openDataMeetings.meetingDate,
        decisions: db.$count(openDataDecisions, eq(openDataDecisions.meetingId, openDataMeetings.id)),
      })
      .from(openDataMeetings)
      .where(where)
      .orderBy(desc(openDataMeetings.meetingDate))
      .limit(LIST_PAGE_SIZE)
      .offset((page - 1) * LIST_PAGE_SIZE),
    db.select({ total: count() }).from(openDataMeetings).where(where),
  ]);
  const total = totalRow?.total ?? 0;
  type Row = (typeof rows)[number];
  const hrefFor = (p: number) => `${OPEN_DATA_PATHS.meetings}${queryString({ q: term, owner, page: p > 1 ? p : undefined })}`;
  const name = (row: Row) => row.titleTh || row.slug;
  const add = (
    <Button href={`${OPEN_DATA_PATHS.meetings}/new`} icon={<ConsoleIcon name="add" />}>
      {a("listAdd", locale, { item: a("odmMeetingOne", locale) })}
    </Button>
  );
  const columns: DataTableColumn<Row>[] = [
    { id: "date", header: a("odmFieldMeetingDate", locale), cell: (row) => formatDate(row.meetingDate, locale) },
    { id: "title", header: a("listTitle", locale), cell: (row) => <a href={`${OPEN_DATA_PATHS.meetings}/${row.id}`} className="font-medium">{name(row)}</a> },
    ...(owners.length > 1 ? [{ id: "owner", header: a("fieldOwner", locale), cell: (row: Row) => ownerLabel(row.owner, locale) }] : []),
    { id: "decisions", header: a("odmColDecisions", locale), align: "end" as const, cell: (row) => row.decisions },
    {
      id: "edit",
      header: a("listActions", locale),
      align: "end",
      cell: (row) => (
        <RowAction href={`${OPEN_DATA_PATHS.meetings}/${row.id}`} icon="edit" name={name(row)}>
          {a("edit", locale)}
        </RowAction>
      ),
    },
  ];

  return (
    <ConsolePage width="wide">
      <OpenDataHeader locale={locale} section="meetings" title={a("odmTabMeetings", locale)} description={a("odmMeetingsDesc", locale)} actions={add} />
      <Toolbar
        search={<SearchField label={a("ccSearchLabel", locale, { label: a("odmTabMeetings", locale).toLowerCase() })} submitLabel={a("ccSearchSubmit", locale)} defaultValue={q} hidden={owner ? { owner } : undefined} />}
        filters={<OwnerChips locale={locale} owners={owners} current={owner} base={OPEN_DATA_PATHS.meetings} params={{ q: term }} />}
      />
      {rows.length === 0 ? (
        <EmptyPanel icon="info" title={a("listNoMatches", locale)} action={add}>
          {a("ccNoMatchesHint", locale)}
        </EmptyPanel>
      ) : (
        <>
          <ResultCount text={a("ccResultCount", locale, { total })} />
          <DataTable columns={columns} rows={rows} getRowKey={(r) => r.id} caption={a("listCaption", locale, { shown: rows.length, total, label: a("odmTabMeetings", locale) })} />
          <Pagination currentPage={page} totalPages={Math.ceil(total / LIST_PAGE_SIZE)} buildHref={hrefFor} locale={locale} />
        </>
      )}
    </ConsolePage>
  );
}
