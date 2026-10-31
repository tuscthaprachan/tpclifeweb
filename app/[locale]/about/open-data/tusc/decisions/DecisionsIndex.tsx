import { MetadataList, PageHead, TuscShell, academicYearLabel, fillText } from "@/components/domain/open-data";
import { DATA_PATH } from "@/components/domain/open-data/meetings";
import { DecisionResults, LiveDecisionResults } from "@/components/domain/open-data/meetings/DecisionResults";
import { Heading } from "@/components/ui/Heading";
import { InsetText } from "@/components/ui/InsetText";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { Stack } from "@/components/ui/Stack";
import type { Locale } from "@/lib/i18n/config";
import { formatDate, formatNumber } from "@/lib/i18n/format";
import { UI } from "@/lib/i18n/strings";
import { getOpenDataDecisions, getOpenDataDocuments, getOpenDataMeetings } from "@/lib/open-data/read";

export async function DecisionsIndex({ locale, filtered }: { locale: Locale; filtered: boolean }) {
  const [decisions, meetings, documents] = await Promise.all([getOpenDataDecisions(), getOpenDataMeetings(), getOpenDataDocuments()]);
  const n = (value: number) => formatNumber(value, locale);
  const first = meetings[0];
  const last = meetings[meetings.length - 1];
  const minutesSlugs = new Set(meetings.map((meeting) => meeting.minutesDocumentSlug));
  const sources = documents.filter((doc) => minutesSlugs.has(doc.slug)).map((doc) => doc.number);
  const updated = documents.reduce<string | null>((latest, doc) => (latest === null || doc.updatedAt > latest ? doc.updatedAt : latest), null);
  const rowProps = { locale, decisions, meetings, tableNumber: 1 };

  return (
    <TuscShell locale={locale} current="decisions">
      <PageHead
        label={UI.odOpenData[locale]}
        title={UI.odNavDecisions[locale]}
        summary={fillText(UI.odDcSummary[locale], { n: n(decisions.length), meetings: n(meetings.length) })}
      />
      <MetadataList
        items={[
          ...(first && last
            ? [
                {
                  term: UI.odDcPeriod[locale],
                  value: fillText(UI.odDcPeriodValue[locale], {
                    from: formatDate(first.meetingDate, locale),
                    to: formatDate(last.meetingDate, locale),
                    year: academicYearLabel(last.academicYear, locale),
                  }),
                },
              ]
            : []),
          ...(sources.length > 0
            ? [{ term: UI.odDcSource[locale], value: fillText(UI.odDcSourceValue[locale], { n: n(sources.length), files: sources.join(", ") }) }]
            : []),
          { term: UI.odLastUpdated[locale], value: updated ? formatDate(updated, locale) : UI.odNotApplicable[locale] },
          { term: UI.odNextUpdate[locale], value: UI.odToBeAnnounced[locale] },
        ]}
      />
      <Stack space={6}>
        <InsetText>
          <p className="m-0 max-w-[var(--measure-en)]">{UI.odDcTotalsNote[locale]}</p>
        </InsetText>
        <section aria-labelledby="od-find">
          <Stack space={4}>
            <Heading level={2} id="od-find" className="m-0">
              {UI.odDcFind[locale]}
            </Heading>
            <QueryBoundary filtered={filtered} fallback={<DecisionResults {...rowProps} query={{}} />}>
              <LiveDecisionResults {...rowProps} />
            </QueryBoundary>
            <p className="m-0">
              <a href={`${DATA_PATH}/decisions.csv`} download className="inline-flex min-h-[var(--target-min)] items-center text-action underline hover:text-action-hover">
                {UI.odDcDownload[locale]}
              </a>
            </p>
          </Stack>
        </section>
      </Stack>
    </TuscShell>
  );
}
