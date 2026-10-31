import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  MetadataList,
  PageHead,
  Transcript,
  TuscShell,
  academicYearLabel,
  documentListItem,
  fillText,
} from "@/components/domain/open-data";
import {
  agendaItems,
  decisionText,
  meetingDocuments,
  meetingHeader,
  meetingLabel,
  meetingPath,
  nestAgenda,
  outcomeLabel,
  outcomeTone,
  printedValue,
} from "@/components/domain/open-data/meetings";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Details } from "@/components/ui/Details";
import { DocumentList } from "@/components/ui/DocumentList";
import { Heading } from "@/components/ui/Heading";
import { InsetText } from "@/components/ui/InsetText";
import { Stack } from "@/components/ui/Stack";
import { StatusTag } from "@/components/ui/StatusTag";
import { TableOfContents } from "@/components/ui/TableOfContents";
import { DEFAULT_LOCALE, isLocale, localePath, type Locale } from "@/lib/i18n/config";
import { formatDate, formatNumber } from "@/lib/i18n/format";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import {
  getOpenDataDecisions,
  getOpenDataDocument,
  getOpenDataDocuments,
  getOpenDataMeetings,
  type DecisionRow,
} from "@/lib/open-data/read";
import { slugParams } from "@/lib/static-params";

export async function generateStaticParams() {
  const meetings = await getOpenDataMeetings();
  return slugParams(meetings.map((meeting) => meeting.slug));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const meetings = await getOpenDataMeetings();
  const meeting = meetings.find((m) => m.slug === slug);
  if (!meeting) return {};
  return {
    alternates: alternatesFor(locale, meetingPath(slug)),
    title: `${meetingLabel(meeting, locale)} | ${UI.odNavMeetings[locale]}`,
    description: fillText(UI.odMtMeetingTitle[locale], { session: meetingLabel(meeting, locale), date: formatDate(meeting.meetingDate, locale) }),
  };
}

export default async function TuscMeetingPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: rawLocale, slug } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const [meetings, allDecisions, documents] = await Promise.all([getOpenDataMeetings(), getOpenDataDecisions(), getOpenDataDocuments()]);
  const index = meetings.findIndex((m) => m.slug === slug);
  const meeting = meetings[index];
  if (!meeting) notFound();
  const previous = meetings[index - 1] ?? null;
  const next = meetings[index + 1] ?? null;

  const minutes = meeting.minutesDocumentSlug ? await getOpenDataDocument(meeting.minutesDocumentSlug) : null;
  const markdown = minutes?.transcriptMarkdown ?? "";
  const header = meetingHeader(markdown);
  const agenda = nestAgenda(agendaItems(markdown));
  const decisions = allDecisions.filter((decision) => decision.meetingSlug === slug);
  const byId = new Map(documents.map((doc) => [doc.id, doc]));
  const related = meetingDocuments(meeting, documents);
  const adoptedAt = meeting.minutesAdoptedOn ? meetings.find((m) => m.meetingDate === meeting.minutesAdoptedOn) : undefined;
  const n = (value: number) => formatNumber(value, locale);
  const title = meetingLabel(meeting, locale);
  const date = formatDate(meeting.meetingDate, locale);

  const summary =
    meeting.present !== null && meeting.seats !== null
      ? fillText((decisions.length > 0 ? UI.odMtPageSummary : UI.odMtPageSummaryNoDecisions)[locale], {
          decisions: n(decisions.length),
          present: n(meeting.present),
          seats: n(meeting.seats),
        })
      : undefined;

  const dateTime =
    locale === "th"
      ? (header.dateLine ?? date)
      : header.time
        ? `${date}, ${fillText(UI.odMtScheduled.en, { time: header.time })}`
        : date;
  const place = locale === "th" ? (header.placeLine?.replace(/^ณ\s+/, "") ?? meeting.place) : (meeting.place ?? header.placeLine?.replace(/^ณ\s+/, "") ?? null);
  const placeLang = locale === "th" && header.placeLine ? "th" : locale === "en" && meeting.place ? "en" : undefined;

  const tocItems = [
    { label: UI.odMtDetails[locale], href: "#details" },
    ...(decisions.length > 0 ? [{ label: UI.odMtDecisions[locale], href: "#decisions" }] : []),
    ...(agenda.length > 0 ? [{ label: UI.odMtAgenda[locale], href: "#agenda" }] : []),
    ...(markdown.trim() ? [{ label: UI.odMtMinutes[locale], href: "#minutes" }] : []),
    ...(related.length > 0 ? [{ label: UI.odMtDocuments[locale], href: "#documents" }] : []),
    { label: UI.odMtNeighbours[locale], href: "#neighbours" },
  ];

  const decisionColumns: DataTableColumn<DecisionRow>[] = [
    {
      id: "item",
      header: UI.odDcColItem[locale],
      rowHeader: true,
      cell: (row) =>
        row.minutesAnchor ? (
          <a href={`#${row.minutesAnchor}`} className="text-action underline">
            {row.item}
          </a>
        ) : (
          row.item
        ),
    },
    { id: "decision", header: UI.odDcColDecision[locale], cell: (row) => <span lang={locale}>{decisionText(row, locale)}</span> },
    { id: "for", header: UI.odDcColFor[locale], align: "end", cell: (row) => printedValue(row.votesFor, locale) },
    { id: "against", header: UI.odDcColAgainst[locale], align: "end", cell: (row) => printedValue(row.votesAgainst, locale) },
    { id: "abstain", header: UI.odDcColAbstain[locale], align: "end", cell: (row) => printedValue(row.votesAbstain, locale) },
    { id: "outcome", header: UI.odDcColOutcome[locale], cell: (row) => <StatusTag tone={outcomeTone(row.outcome)} label={outcomeLabel(row.outcome, locale)} /> },
  ];

  const itemLink = (id: string, label: string) => (
    <a href={`#${id}`} className="inline-flex min-h-[var(--target-min)] items-center text-action underline hover:text-action-hover" lang="th">
      {label}
    </a>
  );

  return (
    <TuscShell locale={locale} current="meetings" trail={[{ label: title }]}>
      <PageHead
        label={UI.odNavMeetings[locale]}
        title={fillText(UI.odMtMeetingTitle[locale], { session: title, date })}
        summary={summary}
      />
      <TableOfContents locale={locale} headingLevel={2} id="od-page-toc" items={tocItems} className="mb-[var(--space-6)]" />

      <Stack space={8}>
        <section aria-labelledby="details">
          <Heading level={2} id="details" className="m-0 mb-[var(--space-3)]">
            {UI.odMtDetails[locale]}
          </Heading>
          <MetadataList
            className="mb-[var(--space-4)]"
            items={[
              { term: UI.odMtMetaDateTime[locale], value: <span lang={locale === "th" && header.dateLine ? "th" : undefined}>{dateTime}</span> },
              ...(place ? [{ term: UI.odMtMetaPlace[locale], value: <span lang={placeLang}>{place}</span> }] : []),
              ...(meeting.chair ? [{ term: UI.odMtMetaChair[locale], value: <span lang="th">{meeting.chair}</span> }] : []),
              {
                term: UI.odMtMetaSession[locale],
                value: fillText(UI.odMtSessionYear[locale], { session: title, year: academicYearLabel(meeting.academicYear, locale) }),
              },
              ...(meeting.present !== null && meeting.onLeave !== null && meeting.absent !== null && meeting.seats !== null
                ? [
                    {
                      term: UI.odMtMetaAttendance[locale],
                      value: fillText(UI.odMtAttendanceValue[locale], {
                        present: n(meeting.present),
                        leave: n(meeting.onLeave),
                        absent: n(meeting.absent),
                        seats: n(meeting.seats),
                      }),
                    },
                  ]
                : []),
              {
                term: UI.odMtMetaStatus[locale],
                value: meeting.minutesAdoptedOn ? (
                  <>
                    <StatusTag tone="success" label={fillText(UI.odMtAdopted[locale], { date: formatDate(meeting.minutesAdoptedOn, locale) })} />
                    {adoptedAt ? (
                      <>
                        {" "}
                        {UI.odMtAdoptedAt[locale]}{" "}
                        <Link href={localePath(locale, meetingPath(adoptedAt.slug))} className="text-action underline">
                          {meetingLabel(adoptedAt, locale)}
                        </Link>
                      </>
                    ) : null}
                  </>
                ) : (
                  <StatusTag tone="neutral" label={UI.odMtNotAdopted[locale]} />
                ),
              },
            ]}
          />
          {meeting.sessionType === "extraordinary" ? (
            <Details summary={UI.odMtExtraSummary[locale]}>
              <p className="m-0">{UI.odMtExtraBody[locale]}</p>
            </Details>
          ) : null}
        </section>

        {decisions.length > 0 ? (
          <section aria-labelledby="decisions">
            <Heading level={2} id="decisions" className="m-0 mb-[var(--space-3)]">
              {UI.odMtDecisions[locale]}
            </Heading>
            <Stack space={4}>
              <DataTable
                id="od-meeting-decisions"
                columns={decisionColumns}
                rows={decisions}
                getRowKey={(row) => row.id}
                caption={`${UI.odTable[locale]} ${n(1)}: ${fillText(UI.odMtDecisionsCaption[locale], { meeting: title })}`}
                locale={locale}
              />
              <p className="m-0 max-w-[var(--measure-en)] text-ink-600">{UI.odDcTotalsNote[locale]}</p>
            </Stack>
          </section>
        ) : null}

        {agenda.length > 0 ? (
          <section aria-labelledby="agenda">
            <Heading level={2} id="agenda" className="m-0 mb-[var(--space-3)]">
              {UI.odMtAgenda[locale]}
            </Heading>
            <p className="m-0 mb-[var(--space-3)] max-w-[var(--measure-en)]">{UI.odMtAgendaIntro[locale]}</p>
            <ol className="m-0 flex list-none flex-col gap-[var(--space-1)] p-0">
              {agenda.map((item) => (
                <li key={item.id}>
                  {itemLink(item.id, item.label)}
                  {item.children.length > 0 ? (
                    <ul className="m-0 mt-[var(--space-1)] flex list-none flex-col gap-[var(--space-1)] pl-[var(--space-6)]">
                      {item.children.map((child) => (
                        <li key={child.id}>{itemLink(child.id, child.label)}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {markdown.trim() ? (
          <section aria-labelledby="minutes">
            <Heading level={2} id="minutes" className="m-0 mb-[var(--space-3)]">
              {UI.odMtMinutes[locale]}
            </Heading>
            <Stack space={4}>
              <InsetText>
                <p className="m-0">{UI.odMtThaiNote[locale]}</p>
              </InsetText>
              {agenda.length > 0 ? (
                <TableOfContents
                  locale={locale}
                  headingLevel={3}
                  id="od-minutes-toc"
                  title={UI.odMtMinutesToc[locale]}
                  items={agenda.map((item) => ({ label: item.label, href: `#${item.id}` }))}
                />
              ) : null}
              <Transcript markdown={markdown} locale={locale} headingLevel={3} />
            </Stack>
          </section>
        ) : null}

        {related.length > 0 ? (
          <section aria-labelledby="documents">
            <Heading level={2} id="documents" className="m-0 mb-[var(--space-3)]">
              {UI.odMtDocuments[locale]}
            </Heading>
            <DocumentList locale={locale} headingLevel={3} items={related.map((doc) => documentListItem(doc, locale, byId))} />
          </section>
        ) : null}

        <nav aria-labelledby="neighbours">
          <Heading level={2} id="neighbours" className="m-0 mb-[var(--space-3)]">
            {UI.odMtNeighbours[locale]}
          </Heading>
          <ul className="m-0 flex list-none flex-col gap-[var(--space-2)] p-0">
            {previous ? (
              <li>
                {UI.odMtPrevious[locale]}:{" "}
                <Link href={localePath(locale, meetingPath(previous.slug))} rel="prev" className="text-action underline">
                  {meetingLabel(previous, locale)} ({formatDate(previous.meetingDate, locale)})
                </Link>
              </li>
            ) : null}
            {next ? (
              <li>
                {UI.odMtNext[locale]}:{" "}
                <Link href={localePath(locale, meetingPath(next.slug))} rel="next" className="text-action underline">
                  {meetingLabel(next, locale)} ({formatDate(next.meetingDate, locale)})
                </Link>
              </li>
            ) : null}
          </ul>
        </nav>
      </Stack>
    </TuscShell>
  );
}
