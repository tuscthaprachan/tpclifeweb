import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MetadataList, PageHead, TUSC_PATH, TuscShell, fillText } from "@/components/domain/open-data";
import {
  BodyLink,
  BodyStatus,
  DateOrNotStated,
  NotStated,
  ThaiName,
  bodiesWithMembers,
  bodyTypeLabel,
  latestDate,
  printedOrNull,
} from "@/components/domain/open-data/people";
import { CiteThis } from "@/components/ui/CiteThis";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Heading } from "@/components/ui/Heading";
import { Stack } from "@/components/ui/Stack";
import { DEFAULT_LOCALE, LOCALES, isLocale, localePath, type Locale } from "@/lib/i18n/config";
import { formatDate, formatNumber } from "@/lib/i18n/format";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import {
  getOpenDataBodies,
  getOpenDataDocuments,
  getOpenDataMeetings,
  getOpenDataMemberships,
  type BodyRow,
} from "@/lib/open-data/read";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const [bodies, memberships] = await Promise.all([getOpenDataBodies(), getOpenDataMemberships()]);
  const n = bodiesWithMembers(bodies, memberships).length;
  return {
    alternates: alternatesFor(locale, `${TUSC_PATH}/committees`),
    title: `${UI.odNavCommittees[locale]} | ${UI.odTuscShort[locale]}`,
    description: fillText(UI.odCommitteesSummary[locale], { n: formatNumber(n, locale) }),
  };
}

export default async function TuscCommitteesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const [allBodies, memberships, documents, meetings] = await Promise.all([
    getOpenDataBodies(),
    getOpenDataMemberships(),
    getOpenDataDocuments(),
    getOpenDataMeetings(),
  ]);
  const bodies = bodiesWithMembers(allBodies, memberships);
  const n = (value: number) => formatNumber(value, locale);
  const documentBySlug = new Map(documents.map((doc) => [doc.slug, doc]));
  const updated = documents.reduce<string | null>((latest, doc) => (latest === null || doc.updatedAt > latest ? doc.updatedAt : latest), null);
  const lastMeeting = meetings[meetings.length - 1];
  const asAt = lastMeeting ? lastMeeting.meetingDate : latestDate(memberships.flatMap((m) => [m.fromDate, m.toDate]));

  const types = new Map<string, number>();
  for (const body of bodies) {
    const label = bodyTypeLabel(body, locale);
    types.set(label, (types.get(label) ?? 0) + 1);
  }
  const typeList = [...types.entries()].map(([label, count]) => `${label} (${n(count)})`).join(", ");

  const columns: DataTableColumn<BodyRow>[] = [
    { id: "body", header: UI.odColBody[locale], rowHeader: true, cell: (body) => <BodyLink body={body} locale={locale} /> },
    { id: "type", header: UI.odColType[locale], cell: (body) => bodyTypeLabel(body, locale) },
    {
      id: "chair",
      header: UI.odColChair[locale],
      cell: (body) => {
        const chair = printedOrNull(body.chair);
        return chair ? <ThaiName name={chair} /> : <NotStated locale={locale} />;
      },
    },
    {
      id: "members",
      header: UI.odColMembers[locale],
      align: "end",
      cell: (body) => (body.membersAsAppointed === null ? <NotStated locale={locale} /> : n(body.membersAsAppointed)),
    },
    {
      id: "appointed",
      header: UI.odColAppointed[locale],
      cell: (body) => {
        const doc = body.sourceDocumentSlug ? documentBySlug.get(body.sourceDocumentSlug) : undefined;
        if (!doc || !body.appointedOn) return <DateOrNotStated iso={body.appointedOn} locale={locale} />;
        return (
          <Link
            href={localePath(locale, `${TUSC_PATH}/documents/${doc.slug}`)}
            className="text-action underline hover:text-action-hover"
          >
            {formatDate(body.appointedOn, locale)}
          </Link>
        );
      },
    },
    { id: "status", header: UI.odColStatus[locale], cell: (body) => <BodyStatus activity={body.activity} locale={locale} /> },
  ];

  return (
    <TuscShell locale={locale} current="committees">
      <PageHead
        label={UI.odOpenData[locale]}
        title={UI.odNavCommittees[locale]}
        summary={fillText(UI.odCommitteesSummary[locale], { n: n(bodies.length) })}
      />
      <MetadataList
        items={[
          { term: UI.odPublishedBy[locale], value: UI.odTuscFull[locale] },
          {
            term: UI.odPositionAsAt[locale],
            value: asAt ? fillText(UI.odPositionAsAtValue[locale], { date: formatDate(asAt, locale) }) : UI.odNotApplicable[locale],
          },
          { term: UI.odLastUpdated[locale], value: updated ? formatDate(updated, locale) : UI.odNotApplicable[locale] },
          { term: UI.odNextUpdate[locale], value: UI.odToBeAnnounced[locale] },
        ]}
      />
      <Stack space={8}>
        <section aria-labelledby="main-points">
          <Heading level={2} id="main-points" className="m-0 mb-[var(--space-3)]">
            {UI.odMainPoints[locale]}
          </Heading>
          <ul className="m-0 flex max-w-[var(--measure-en)] list-disc flex-col gap-[var(--space-2)] pl-[var(--space-6)]">
            <li>{fillText(UI.odCommitteesPointTypes[locale], { list: typeList })}</li>
          </ul>
        </section>

        <section aria-labelledby="all">
          <Heading level={2} id="all" className="m-0 mb-[var(--space-3)]">
            {fillText(UI.odCommitteesAllHeading[locale], { n: n(bodies.length) })}
          </Heading>
          <DataTable
            id="t-bodies"
            locale={locale}
            caption={`${fillText(UI.odTableLabel[locale], { n: 1 })}: ${fillText(UI.odCapBodies[locale], { n: n(bodies.length) })}`}
            columns={columns}
            rows={bodies}
            getRowKey={(body) => body.slug}
            sourceNote={UI.odNotStatedNote[locale]}
          />
        </section>

        <CiteThis locale={locale} headingLevel={2}>
          {fillText(UI.odCiteBody[locale], {
            title: UI.odNavCommittees[locale],
            date: updated ? formatDate(updated, locale) : UI.odNotApplicable[locale],
          })}
        </CiteThis>
      </Stack>
    </TuscShell>
  );
}
