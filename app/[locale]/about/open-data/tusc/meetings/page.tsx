import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  MetadataList,
  PageHead,
  TUSC_PATH,
  TuscShell,
  academicYearLabel,
  fillText,
} from "@/components/domain/open-data";
import { DATA_PATH, groupBySession, meetingLabel, meetingPath, sessionLabel } from "@/components/domain/open-data/meetings";
import { ColumnChart } from "@/components/ui/ColumnChart";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Details } from "@/components/ui/Details";
import { Figure } from "@/components/ui/Figure";
import { Heading } from "@/components/ui/Heading";
import { StatusTag } from "@/components/ui/StatusTag";
import { Stack } from "@/components/ui/Stack";
import { DEFAULT_LOCALE, LOCALES, isLocale, localePath, type Locale } from "@/lib/i18n/config";
import { formatDate, formatDateShort, formatNumber } from "@/lib/i18n/format";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { getOpenDataDecisions, getOpenDataDocuments, getOpenDataMeetings, type MeetingRow } from "@/lib/open-data/read";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const meetings = await getOpenDataMeetings();
  return {
    alternates: alternatesFor(locale, `${TUSC_PATH}/meetings`),
    title: `${UI.odNavMeetings[locale]} | ${UI.odTuscShort[locale]}`,
    description: fillText(UI.odMtSummary[locale], { n: formatNumber(meetings.length, locale) }),
  };
}

function attendanceText(meeting: MeetingRow, locale: Locale): string {
  if (meeting.present === null || meeting.seats === null) return UI.odNotStated[locale];
  return fillText(UI.odMtAttendanceOf[locale], { present: formatNumber(meeting.present, locale), seats: formatNumber(meeting.seats, locale) });
}

function hasNoAgainst(decisions: { votesAgainst: string | null }[]): boolean {
  const counted = decisions.filter((decision) => decision.votesAgainst !== null && /^\d+$/.test(decision.votesAgainst));
  return counted.length > 0 && counted.every((decision) => Number(decision.votesAgainst) === 0);
}

export default async function TuscMeetingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const [meetings, decisions, documents] = await Promise.all([getOpenDataMeetings(), getOpenDataDecisions(), getOpenDataDocuments()]);
  const n = (value: number) => formatNumber(value, locale);
  const groups = groupBySession(meetings);
  const first = meetings[0];
  const last = meetings[meetings.length - 1];
  const updated = documents.reduce<string | null>((latest, doc) => (latest === null || doc.updatedAt > latest ? doc.updatedAt : latest), null);
  const decisionCount = new Map<string, number>();
  for (const decision of decisions) decisionCount.set(decision.meetingSlug, (decisionCount.get(decision.meetingSlug) ?? 0) + 1);

  const points: string[] = [];
  if (first && last) {
    points.push(
      fillText(UI.odMtPointMet[locale], {
        n: n(meetings.length),
        sessions: n(groups.length),
        from: formatDate(first.meetingDate, locale),
        to: formatDate(last.meetingDate, locale),
        decisions: n(decisions.length),
      }),
    );
  }
  if (hasNoAgainst(decisions)) points.push(UI.odMtPointNoAgainst[locale]);
  if (last && last.minutesAdoptedOn === null) points.push(fillText(UI.odMtPointLatest[locale], { date: formatDate(last.meetingDate, locale) }));

  const attended = meetings.filter((meeting) => meeting.present !== null);
  const firstPresent = attended[0];
  const lastPresent = attended[attended.length - 1];
  const seats = last?.seats ?? null;
  const showFigure = firstPresent !== undefined && lastPresent !== undefined && attended.length > 1;

  const attendanceColumns: DataTableColumn<MeetingRow>[] = [
    {
      id: "meeting",
      header: UI.odMtColMeeting[locale],
      rowHeader: true,
      cell: (meeting) => (
        <Link href={localePath(locale, meetingPath(meeting.slug))} className="text-action underline">
          {meetingLabel(meeting, locale)}
        </Link>
      ),
    },
    { id: "date", header: UI.odMtColDate[locale], cell: (meeting) => formatDate(meeting.meetingDate, locale) },
    { id: "present", header: UI.odMtColPresent[locale], align: "end", cell: (meeting) => (meeting.present === null ? "" : n(meeting.present)) },
    { id: "leave", header: UI.odMtColOnLeave[locale], align: "end", cell: (meeting) => (meeting.onLeave === null ? "" : n(meeting.onLeave)) },
    { id: "absent", header: UI.odMtColAbsent[locale], align: "end", cell: (meeting) => (meeting.absent === null ? "" : n(meeting.absent)) },
  ];

  const sessionColumns: DataTableColumn<MeetingRow>[] = [
    { id: "date", header: UI.odMtColDate[locale], rowHeader: true, cell: (meeting) => formatDate(meeting.meetingDate, locale) },
    {
      id: "meeting",
      header: UI.odMtColMeeting[locale],
      cell: (meeting) => (
        <Link href={localePath(locale, meetingPath(meeting.slug))} className="text-action underline">
          {meetingLabel(meeting, locale)}
        </Link>
      ),
    },
    { id: "decisions", header: UI.odMtColDecisions[locale], align: "end", cell: (meeting) => n(decisionCount.get(meeting.slug) ?? 0) },
    { id: "attendance", header: UI.odMtColAttendance[locale], cell: (meeting) => attendanceText(meeting, locale) },
    {
      id: "minutes",
      header: UI.odMtColMinutes[locale],
      cell: (meeting) =>
        meeting.minutesAdoptedOn ? (
          <StatusTag tone="success" label={fillText(UI.odMtAdopted[locale], { date: formatDate(meeting.minutesAdoptedOn, locale) })} />
        ) : (
          <StatusTag tone="neutral" label={UI.odMtNotAdopted[locale]} />
        ),
    },
  ];

  let tableNumber = 1;

  return (
    <TuscShell locale={locale} current="meetings">
      <PageHead label={UI.odOpenData[locale]} title={UI.odNavMeetings[locale]} summary={fillText(UI.odMtSummary[locale], { n: n(meetings.length) })} />
      <MetadataList
        items={[
          { term: UI.odPublishedBy[locale], value: UI.odTuscFull[locale] },
          ...(first && last
            ? [{ term: UI.odMtMetaPeriod[locale], value: fillText(UI.odDcPeriodValue[locale], { from: formatDate(first.meetingDate, locale), to: formatDate(last.meetingDate, locale), year: academicYearLabel(last.academicYear, locale) }) }]
            : []),
          { term: UI.odLastUpdated[locale], value: updated ? formatDate(updated, locale) : UI.odNotApplicable[locale] },
          { term: UI.odNextUpdate[locale], value: UI.odToBeAnnounced[locale] },
        ]}
      />
      <Stack space={8}>
        {points.length > 0 ? (
          <section aria-labelledby="od-points">
            <Heading level={2} id="od-points" className="m-0 mb-[var(--space-3)]">
              {UI.odMainPoints[locale]}
            </Heading>
            <ul className="m-0 flex max-w-[var(--measure-en)] list-disc flex-col gap-[var(--space-2)] pl-[var(--space-6)]">
              {points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {showFigure ? (
          <section aria-labelledby="od-attendance">
            <Heading level={2} id="od-attendance" className="m-0 mb-[var(--space-3)]">
              {UI.odMtColAttendance[locale]}
            </Heading>
            <Stack space={6}>
              <Figure
                id="od-fig-attendance"
                locale={locale}
                number={1}
                headingLevel={3}
                title={fillText(UI.odMtFigTitle[locale], { first: n(firstPresent.present ?? 0), last: n(lastPresent.present ?? 0) })}
                subtitle={fillText(UI.odMtFigSubtitle[locale], {
                  from: formatDate(firstPresent.meetingDate, locale),
                  to: formatDate(lastPresent.meetingDate, locale),
                })}
                source={fillText(UI.odMtFigSource[locale], { n: n(attended.length) })}
                footnotes={[UI.odMtFigNote1[locale], ...(seats !== null ? [fillText(UI.odMtFigNote2[locale], { n: n(seats) })] : [])]}
              >
                <ColumnChart
                  data={attended.map((meeting, index) => ({
                    label: formatDateShort(meeting.meetingDate, locale).replace(/\s\S+$/, ""),
                    value: meeting.present ?? 0,
                    highlight: index === 0,
                  }))}
                  title={UI.odMtFigChartTitle[locale]}
                  description={fillText(UI.odMtFigDescription[locale], {
                    first: n(firstPresent.present ?? 0),
                    date: formatDate(firstPresent.meetingDate, locale),
                    rest: attended.slice(1).map((meeting) => n(meeting.present ?? 0)).join(", "),
                    n: n(attended.length - 1),
                    seats: n(seats ?? 0),
                  })}
                  locale={locale}
                  unit={UI.odMtFigUnit[locale]}
                  referenceLine={seats !== null ? { value: seats, label: fillText(UI.odMtSeatsLine[locale], { n: n(seats) }) } : undefined}
                />
              </Figure>
              <DataTable
                id="od-attendance-table"
                columns={attendanceColumns}
                rows={attended}
                getRowKey={(meeting) => meeting.slug}
                caption={`${UI.odTable[locale]} ${n(tableNumber++)}: ${UI.odMtTableCaption[locale]}`}
                locale={locale}
              />
              <Details summary={UI.odDownloadData[locale].replace("{label}", `${UI.odFigure[locale]} ${n(1)}`)}>
                <a href={`${DATA_PATH}/meetings.csv`} download className="inline-flex min-h-[var(--target-min)] items-center text-action underline hover:text-action-hover">
                  {UI.odMtDownloadLabel[locale]}
                </a>
              </Details>
            </Stack>
          </section>
        ) : null}

        <section aria-labelledby="od-all">
          <Heading level={2} id="od-all" className="m-0 mb-[var(--space-3)]">
            {UI.odMtAllBySession[locale]}
          </Heading>
          <p className="m-0 mb-[var(--space-4)]">
            <a href={`${DATA_PATH}/meetings.csv`} download className="inline-flex min-h-[var(--target-min)] items-center text-action underline hover:text-action-hover">
              {UI.odMtDownloadAll[locale]}
            </a>
          </p>
          <Stack space={6}>
            {groups.map((group) => {
              const label = fillText(UI.odMtSessionYear[locale], { session: sessionLabel(group, locale), year: academicYearLabel(group.academicYear, locale) });
              return (
                <div key={group.key}>
                  <Heading level={3} className="m-0 mb-[var(--space-2)]">
                    {label}
                  </Heading>
                  <DataTable
                    columns={sessionColumns}
                    rows={group.meetings}
                    getRowKey={(meeting) => meeting.slug}
                    caption={`${UI.odTable[locale]} ${n(tableNumber++)}: ${fillText(UI.odMtCaptionSession[locale], { session: label })}`}
                    locale={locale}
                  />
                </div>
              );
            })}
          </Stack>
        </section>
      </Stack>
    </TuscShell>
  );
}
