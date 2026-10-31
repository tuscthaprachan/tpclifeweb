import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  MetadataList,
  PageHead,
  TUSC_PATH,
  TuscShell,
  documentListItem,
  fillText,
} from "@/components/domain/open-data";
import {
  BodyLink,
  COUNCIL_SLUG,
  DateOrNotStated,
  EXECUTIVE_SLUG,
  NotStated,
  SourceLinks,
  TextOf,
  ThaiName,
  bodiesWithMembers,
  citedDocuments,
  facultyLabel,
  groupByPerson,
  latestDate,
  membershipsOfBody,
  partyLabel,
  periodText,
  printedOrNull,
  roleLabel,
  seatsByParty,
  type PersonEntry,
} from "@/components/domain/open-data/people";
import { CiteThis } from "@/components/ui/CiteThis";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { DocumentList } from "@/components/ui/DocumentList";
import { Heading } from "@/components/ui/Heading";
import { InsetText } from "@/components/ui/InsetText";
import { Stack } from "@/components/ui/Stack";
import { TableOfContents } from "@/components/ui/TableOfContents";
import { DEFAULT_LOCALE, LOCALES, isLocale, localePath, type Locale } from "@/lib/i18n/config";
import { formatDate, formatNumber } from "@/lib/i18n/format";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import {
  getOpenDataBodies,
  getOpenDataDocuments,
  getOpenDataMeetings,
  getOpenDataMemberships,
  type MembershipRow,
} from "@/lib/open-data/read";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, `${TUSC_PATH}/people`),
    title: `${UI.odNavPeople[locale]} | ${UI.odTuscShort[locale]}`,
    description: UI.odPeopleSummary[locale],
  };
}

export default async function TuscPeoplePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const [bodies, memberships, documents, meetings] = await Promise.all([
    getOpenDataBodies(),
    getOpenDataMemberships(),
    getOpenDataDocuments(),
    getOpenDataMeetings(),
  ]);

  const n = (value: number) => formatNumber(value, locale);
  const byNumber = new Map(documents.map((doc) => [doc.number, doc]));
  const byId = new Map(documents.map((doc) => [doc.id, doc]));
  const bodyBySlug = new Map(bodies.map((body) => [body.slug, body]));
  const people = groupByPerson(memberships);
  const withMembers = bodiesWithMembers(bodies, memberships);
  const executive = membershipsOfBody(memberships, EXECUTIVE_SLUG);
  const offices = withMembers.filter((body) => body.kind === "office");
  const councilMembers = membershipsOfBody(memberships, COUNCIL_SLUG);
  const seatRows = seatsByParty(councilMembers);
  const partyRank = new Map(seatRows.map((row, i) => [row.party, i]));
  const membersByParty = [...councilMembers].sort(
    (a, b) =>
      (partyRank.get(printedOrNull(a.party) ?? "") ?? 0) - (partyRank.get(printedOrNull(b.party) ?? "") ?? 0) ||
      a.personNameTh.localeCompare(b.personNameTh, "th"),
  );
  const cited = citedDocuments(memberships, documents);
  const lastMeeting = meetings[meetings.length - 1];
  const seats = lastMeeting?.seats ?? null;
  const updated = documents.reduce<string | null>((latest, doc) => (latest === null || doc.updatedAt > latest ? doc.updatedAt : latest), null);
  const asAt = lastMeeting ? lastMeeting.meetingDate : latestDate(memberships.flatMap((m) => [m.fromDate, m.toDate]));
  const tableLabel = (num: number, title: string) => `${fillText(UI.odTableLabel[locale], { n: num })}: ${title}`;

  const points: string[] = [
    fillText(UI.odPeoplePointPeople[locale], { people: n(people.length), bodies: n(withMembers.length) }),
  ];
  if (seats !== null) points.push(fillText(UI.odPeoplePointSeats[locale], { seats: n(seats) }));
  if (councilMembers.length > 0) points.push(fillText(UI.odPeoplePointMembers[locale], { n: n(councilMembers.length) }));
  if (executive.length > 0) points.push(fillText(UI.odPeoplePointExecutive[locale], { n: n(executive.length) }));

  const postColumns = (bodySlug: string): DataTableColumn<MembershipRow>[] => [
    { id: "post", header: UI.odColPost[locale], rowHeader: true, cell: (m) => <TextOf label={roleLabel(m.roleTh, locale, bodySlug)} /> },
    {
      id: "holder",
      header: UI.odColHolder[locale],
      cell: (m) => (
        <a href={`#person-${m.personId}`} className="text-action underline hover:text-action-hover">
          <ThaiName name={m.personNameTh} />
        </a>
      ),
    },
    { id: "from", header: UI.odColFrom[locale], cell: (m) => <DateOrNotStated iso={m.fromDate} locale={locale} /> },
    { id: "to", header: UI.odColTo[locale], cell: (m) => <DateOrNotStated iso={m.toDate} locale={locale} /> },
    { id: "source", header: UI.odColSource[locale], cell: (m) => <SourceLinks row={m} documents={byNumber} locale={locale} /> },
  ];

  const personColumns: DataTableColumn<PersonEntry>[] = [
    {
      id: "name",
      header: UI.odColName[locale],
      rowHeader: true,
      cell: (p) => (
        <span id={`person-${p.personId}`}>
          <ThaiName name={p.nameTh} />
          <span className="block text-sm font-normal text-ink-600">
            {printedOrNull(p.nameLatin) ?? UI.odLatinNotStated[locale]}
          </span>
        </span>
      ),
    },
    {
      id: "faculty",
      header: UI.odColFaculty[locale],
      cell: (p) => {
        const label = facultyLabel(p.faculty, locale);
        return label ? <TextOf label={label} /> : <NotStated locale={locale} />;
      },
    },
    { id: "party", header: UI.odColParty[locale], cell: (p) => printedOrNull(p.party) ?? <NotStated locale={locale} /> },
    {
      id: "roles",
      header: UI.odColRoles[locale],
      cell: (p) => (
        <ul className="m-0 flex list-none flex-col gap-[var(--space-2)] p-0">
          {p.memberships.map((m) => {
            const body = bodyBySlug.get(m.bodySlug);
            const period = periodText(m.fromDate, m.toDate, locale);
            return (
              <li key={`${m.bodySlug}-${m.roleTh}-${m.fromDate ?? ""}`}>
                <TextOf label={roleLabel(m.roleTh, locale, m.bodySlug)} />
                {", "}
                {body ? <BodyLink body={body} locale={locale} /> : <span lang="th">{m.bodyNameTh}</span>}
                {period ? <>, {period}</> : null}
                <span className="block text-sm text-ink-600">
                  {UI.odColSource[locale]}: <SourceLinks row={m} documents={byNumber} locale={locale} />
                </span>
              </li>
            );
          })}
        </ul>
      ),
    },
  ];

  const memberColumns: DataTableColumn<MembershipRow>[] = [
    {
      id: "name",
      header: UI.odColName[locale],
      rowHeader: true,
      cell: (m) => (
        <a href={`#person-${m.personId}`} className="text-action underline hover:text-action-hover">
          <ThaiName name={m.personNameTh} />
        </a>
      ),
    },
    {
      id: "faculty",
      header: UI.odColFaculty[locale],
      cell: (m) => {
        const label = facultyLabel(m.faculty, locale);
        return label ? <TextOf label={label} /> : <NotStated locale={locale} />;
      },
    },
    {
      id: "party",
      header: UI.odColParty[locale],
      cell: (m) => {
        const label = partyLabel(m.party, locale);
        return label ? <TextOf label={label} /> : <NotStated locale={locale} />;
      },
    },
    { id: "source", header: UI.odColSource[locale], cell: (m) => <SourceLinks row={m} documents={byNumber} locale={locale} /> },
  ];

  const toc = [
    { label: UI.odMainPoints[locale], href: "#main-points" },
    ...(executive.length > 0 ? [{ label: UI.odExecutiveHeading[locale], href: "#executive" }] : []),
    ...(offices.length > 0 ? [{ label: UI.odOfficesHeading[locale], href: "#offices" }] : []),
    ...(councilMembers.length > 0
      ? [
          { label: UI.odMembersHeading[locale], href: "#members" },
          { label: UI.odSeatsHeading[locale], href: "#seats" },
        ]
      : []),
    { label: UI.odEveryoneHeading[locale], href: "#everyone" },
    ...(cited.length > 0 ? [{ label: UI.odPeopleSourcesHeading[locale], href: "#sources" }] : []),
  ];

  let tableNumber = 0;

  return (
    <TuscShell locale={locale} current="people">
      <PageHead label={UI.odOpenData[locale]} title={UI.odNavPeople[locale]} summary={UI.odPeopleSummary[locale]} />
      <MetadataList
        items={[
          { term: UI.odPublishedBy[locale], value: UI.odTuscFull[locale] },
          {
            term: UI.odPositionAsAt[locale],
            value: asAt ? fillText(UI.odPositionAsAtValue[locale], { date: formatDate(asAt, locale) }) : UI.odNotApplicable[locale],
          },
          { term: UI.odLastUpdated[locale], value: updated ? formatDate(updated, locale) : UI.odNotApplicable[locale] },
          { term: UI.odNextUpdate[locale], value: UI.odToBeAnnounced[locale] },
          { term: UI.odContact[locale], value: UI.odTuscContact[locale] },
        ]}
      />
      <Stack space={8}>
        <InsetText>
          <p className="m-0">
            {UI.odPeopleNamesNote[locale]} {UI.odPeoplePresidentNote[locale]}
          </p>
        </InsetText>
        <TableOfContents locale={locale} headingLevel={2} items={toc} />

        <section aria-labelledby="main-points">
          <Heading level={2} id="main-points" className="m-0 mb-[var(--space-3)]">
            {UI.odMainPoints[locale]}
          </Heading>
          <ul className="m-0 flex max-w-[var(--measure-en)] list-disc flex-col gap-[var(--space-2)] pl-[var(--space-6)]">
            {points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </section>

        {executive.length > 0 ? (
          <section aria-labelledby="executive">
            <Heading level={2} id="executive" className="m-0 mb-[var(--space-2)]">
              {UI.odExecutiveHeading[locale]}
            </Heading>
            <p className="m-0 mb-[var(--space-3)] max-w-[var(--measure-en)]">{UI.odExecutiveIntro[locale]}</p>
            <DataTable
              id="t-executive"
              locale={locale}
              caption={tableLabel(++tableNumber, UI.odCapExecutive[locale])}
              columns={postColumns(EXECUTIVE_SLUG)}
              rows={executive}
              getRowKey={(m) => `${m.personId}-${m.roleTh}-${m.fromDate ?? ""}`}
              sourceNote={UI.odNotStatedNote[locale]}
            />
          </section>
        ) : null}

        {offices.length > 0 ? (
          <section aria-labelledby="offices">
            <Heading level={2} id="offices" className="m-0 mb-[var(--space-3)]">
              {UI.odOfficesHeading[locale]}
            </Heading>
            <Stack space={6}>
              {offices.map((office) => {
                const name = locale === "en" && office.nameEn ? office.nameEn : office.nameTh;
                return (
                  <div key={office.slug}>
                    <Heading level={3} className="m-0 mb-[var(--space-2)] text-lg">
                      <BodyLink body={office} locale={locale} />
                    </Heading>
                    <DataTable
                      id={`t-${office.slug}`}
                      locale={locale}
                      caption={tableLabel(++tableNumber, fillText(UI.odCapOffice[locale], { name }))}
                      columns={postColumns(office.slug)}
                      rows={membershipsOfBody(memberships, office.slug)}
                      getRowKey={(m) => `${m.personId}-${m.roleTh}-${m.fromDate ?? ""}`}
                    />
                  </div>
                );
              })}
            </Stack>
          </section>
        ) : null}

        {councilMembers.length > 0 ? (
          <>
            <section aria-labelledby="members">
              <Heading level={2} id="members" className="m-0 mb-[var(--space-2)]">
                {UI.odMembersHeading[locale]}
              </Heading>
              <p className="m-0 mb-[var(--space-3)] max-w-[var(--measure-en)]">{UI.odMembersIntro[locale]}</p>
              <DataTable
                id="t-members"
                locale={locale}
                caption={tableLabel(++tableNumber, UI.odCapMembersList[locale])}
                columns={memberColumns}
                rows={membersByParty}
                getRowKey={(m) => m.personId}
              />
            </section>
            <section aria-labelledby="seats">
              <Heading level={2} id="seats" className="m-0 mb-[var(--space-3)]">
                {UI.odSeatsHeading[locale]}
              </Heading>
              <DataTable
                id="t-seats"
                locale={locale}
                caption={tableLabel(++tableNumber, UI.odCapSeats[locale])}
                columns={[
                  {
                    id: "party",
                    header: UI.odColParty[locale],
                    rowHeader: true,
                    cell: (row: (typeof seatRows)[number]) => {
                      const label = partyLabel(row.party, locale);
                      return label ? <TextOf label={label} /> : <NotStated locale={locale} />;
                    },
                  },
                  { id: "seats", header: UI.odColSeats[locale], align: "end", cell: (row) => n(row.seats) },
                ]}
                rows={seatRows}
                getRowKey={(row) => row.party}
                footerRows={[{ key: "total", cells: { party: UI.odTotal[locale], seats: n(councilMembers.length) } }]}
              />
            </section>
          </>
        ) : null}

        <section aria-labelledby="everyone">
          <Heading level={2} id="everyone" className="m-0 mb-[var(--space-3)]">
            {UI.odEveryoneHeading[locale]}
          </Heading>
          <DataTable
            id="t-everyone"
            locale={locale}
            caption={tableLabel(++tableNumber, UI.odCapEveryone[locale])}
            columns={personColumns}
            rows={people}
            getRowKey={(p) => p.personId}
            sourceNote={UI.odNotStatedNote[locale]}
          />
        </section>

        {cited.length > 0 ? (
          <section aria-labelledby="sources">
            <Heading level={2} id="sources" className="m-0 mb-[var(--space-3)]">
              {UI.odPeopleSourcesHeading[locale]}
            </Heading>
            <DocumentList locale={locale} headingLevel={3} items={cited.map((doc) => documentListItem(doc, locale, byId))} />
          </section>
        ) : null}

        <CiteThis locale={locale} headingLevel={2}>
          {fillText(UI.odCiteBody[locale], {
            title: UI.odNavPeople[locale],
            date: updated ? formatDate(updated, locale) : UI.odNotApplicable[locale],
          })}
        </CiteThis>
        <p className="m-0">
          <Link href={localePath(locale, `${TUSC_PATH}/committees`)} className="inline-flex min-h-[var(--target-min)] items-center text-action underline">
            {UI.odAllCommittees[locale]}
          </Link>
        </p>
      </Stack>
    </TuscShell>
  );
}
