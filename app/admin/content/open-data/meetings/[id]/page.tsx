import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ConsoleIcon } from "@/components/admin/icons";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { Card, ConsolePage } from "@/components/admin/ui";
import { RowAction } from "@/app/admin/content/_list/parts";
import { Button, DataTable, NotificationBanner, type DataTableColumn } from "@/components/ui";
import { isUuid } from "@/lib/admin/content/form-state";
import { getAdminLocale } from "@/lib/admin/locale";
import { requireOpenDataEditor } from "@/lib/admin/open-data/access";
import { OPEN_DATA_PATHS } from "@/lib/admin/open-data/paths";
import { canEditOwner } from "@/lib/admin/open-data/scope";
import { isAuthConfigured } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { openDataDecisions, openDataMeetings } from "@/lib/db/schema/content/open-data";
import { a } from "@/lib/i18n/admin";
import { OpenDataHeader } from "../../parts";
import { MeetingForm } from "../MeetingForm";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getAdminLocale();
  return { title: a("odmMeetingOne", locale) };
}

export default async function EditMeetingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; notice?: string }> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  const { owners } = await requireOpenDataEditor();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { saved, notice } = await searchParams;
  const db = getDb();
  const [meeting] = await db.select().from(openDataMeetings).where(eq(openDataMeetings.id, id));
  if (!meeting || !canEditOwner(owners, meeting.owner)) notFound();
  const decisions = await db.select().from(openDataDecisions).where(eq(openDataDecisions.meetingId, id)).orderBy(asc(openDataDecisions.ref));
  type Row = (typeof decisions)[number];
  const heading = meeting.titleTh || meeting.slug;
  const base = `${OPEN_DATA_PATHS.meetings}/${id}/decisions`;

  const columns: DataTableColumn<Row>[] = [
    { id: "ref", header: a("odmFieldRef", locale), cell: (row) => <a href={`${base}/${row.id}`} className="font-medium">{row.ref}</a> },
    { id: "item", header: a("odmFieldItem", locale), cell: (row) => row.item },
    { id: "topic", header: a("odmFieldTopic", locale), cell: (row) => row.topic },
    { id: "outcome", header: a("odmFieldOutcome", locale), cell: (row) => row.outcome },
    {
      id: "votes",
      header: a("odmColVotes", locale),
      cell: (row) => [row.votesFor, row.votesAgainst, row.votesAbstain].map((v) => v ?? "-").join(" / "),
    },
    {
      id: "edit",
      header: a("listActions", locale),
      align: "end",
      cell: (row) => (
        <RowAction href={`${base}/${row.id}`} icon="edit" name={row.ref}>
          {a("edit", locale)}
        </RowAction>
      ),
    },
  ];

  return (
    <ConsolePage width="wide">
      <OpenDataHeader locale={locale} section="meetings" title={heading} trail={[{ label: a("odmTabMeetings", locale), href: OPEN_DATA_PATHS.meetings }]} />
      {notice === "deleted" ? (
        <NotificationBanner variant="success" title={a("odmDecisionDeleted", locale)}>
          {a("listDeletedNote", locale)}
        </NotificationBanner>
      ) : null}
      <MeetingForm locale={locale} owners={owners} id={id} saved={saved} />
      <Card
        title={a("odmDecisionsHeading", locale)}
        icon="info"
        level={2}
        actions={
          <Button href={`${base}/new`} icon={<ConsoleIcon name="add" />}>
            {a("listAdd", locale, { item: a("odmDecisionOne", locale) })}
          </Button>
        }
      >
        {decisions.length === 0 ? (
          <p className="m-0">{a("odmDecisionsEmpty", locale)}</p>
        ) : (
          <DataTable columns={columns} rows={decisions} getRowKey={(r) => r.id} caption={a("odmDecisionsCaption", locale, { title: heading })} />
        )}
      </Card>
    </ConsolePage>
  );
}
