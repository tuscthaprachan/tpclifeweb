import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  MetadataList,
  PRINTED_BUDGET,
  PageHead,
  SectionLinks,
  TuscShell,
  academicYearLabel,
  documentListItem,
  fillText,
  fiscalYearLabel,
  formatMoney,
  formatMoneyAmount,
} from "@/components/domain/open-data";
import { DocumentList } from "@/components/ui/DocumentList";
import { Heading } from "@/components/ui/Heading";
import { KeyFigures, type KeyFigure } from "@/components/ui/KeyFigures";
import { Stack } from "@/components/ui/Stack";
import { DEFAULT_LOCALE, LOCALES, isLocale, type Locale } from "@/lib/i18n/config";
import { formatDate, formatNumber } from "@/lib/i18n/format";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { getOpenDataDecisions, getOpenDataDocuments, getOpenDataFunds, getOpenDataMeetings } from "@/lib/open-data/read";

const NEW_ITEMS = 5;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, "/about/open-data/tusc"),
    title: UI.odTuscTitle[locale],
    description: UI.odTuscSummary[locale],
  };
}

export default async function TuscOpenDataPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const [documents, meetings, decisions, funds] = await Promise.all([
    getOpenDataDocuments(),
    getOpenDataMeetings(),
    getOpenDataDecisions(),
    getOpenDataFunds(),
  ]);

  const byId = new Map(documents.map((doc) => [doc.id, doc]));
  const pages = documents.reduce((sum, doc) => sum + (doc.pages ?? 0), 0);
  const scans = documents.filter((doc) => doc.scan).length;
  const updated = documents.reduce<string | null>((latest, doc) => (latest === null || doc.updatedAt > latest ? doc.updatedAt : latest), null);

  const firstMeeting = meetings[0];
  const lastMeeting = meetings[meetings.length - 1];
  const seats = lastMeeting?.seats ?? null;
  const year = lastMeeting ? academicYearLabel(lastMeeting.academicYear, locale) : null;
  const n = (value: number) => formatNumber(value, locale);

  const keyFigures: KeyFigure[] = [];
  if (seats !== null && year) keyFigures.push({ label: UI.odKeyMembers[locale], figure: n(seats), context: year });
  if (decisions.length > 0 && year) {
    keyFigures.push({
      label: UI.odKeyDecisions[locale],
      figure: n(decisions.length),
      context: fillText(UI.odKeyDecisionsContext[locale], { meetings: n(meetings.length), year }),
    });
  }
  keyFigures.push({
    label: UI.odKeyBudget[locale],
    figure: formatMoneyAmount(PRINTED_BUDGET.total, locale),
    context: fillText(UI.odKeyBudgetContext[locale], { year: fiscalYearLabel(PRINTED_BUDGET.fiscalYear, locale) }),
  });

  const [figureA, figureB, figureC] = keyFigures;
  const figures = figureA && figureB ? (figureC ? ([figureA, figureB, figureC] as const) : ([figureA, figureB] as const)) : null;

  const points: string[] = [];
  if (seats !== null) points.push(fillText(UI.odPointSeats[locale], { seats: n(seats) }));
  if (firstMeeting && lastMeeting) {
    points.push(
      fillText(UI.odPointMeetings[locale], {
        n: n(meetings.length),
        from: formatDate(firstMeeting.meetingDate, locale),
        to: formatDate(lastMeeting.meetingDate, locale),
      }),
    );
  }
  if (decisions.length > 0) points.push(fillText(UI.odPointDecisions[locale], { decisions: n(decisions.length) }));
  points.push(
    fillText(UI.odPointBudget[locale], {
      year: fiscalYearLabel(PRINTED_BUDGET.fiscalYear, locale),
      total: formatMoney(PRINTED_BUDGET.total, locale),
    }),
  );
  if (documents.length > 0) {
    points.push(fillText(UI.odPointDocuments[locale], { files: n(documents.length), pages: n(pages), scans: n(scans) }));
  }

  const latest = [...documents]
    .sort((a, b) => {
      if (a.dateIso && b.dateIso) return a.dateIso < b.dateIso ? 1 : a.dateIso > b.dateIso ? -1 : a.number.localeCompare(b.number);
      if (a.dateIso) return -1;
      if (b.dateIso) return 1;
      return a.number.localeCompare(b.number);
    })
    .slice(0, NEW_ITEMS);

  return (
    <TuscShell locale={locale} current="overview">
      <PageHead label={UI.odOpenData[locale]} title={UI.odTuscTitle[locale]} summary={UI.odTuscSummary[locale]} />
      <MetadataList
        items={[
          { term: UI.odPublishedBy[locale], value: UI.odTuscFull[locale] },
          { term: UI.odLastUpdated[locale], value: updated ? formatDate(updated, locale) : UI.odNotApplicable[locale] },
          { term: UI.odNextUpdate[locale], value: UI.odToBeAnnounced[locale] },
          { term: UI.odContact[locale], value: UI.odTuscContact[locale] },
        ]}
      />
      <Stack space={8}>
        <section aria-labelledby="od-key">
          <Heading level={2} id="od-key" className="m-0 mb-[var(--space-3)]">
            {UI.odKeyFigures[locale]}
          </Heading>
          {figures ? <KeyFigures items={figures} headingLevel={3} /> : null}
        </section>

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

        {latest.length > 0 ? (
          <section aria-labelledby="od-new">
            <Heading level={2} id="od-new" className="m-0 mb-[var(--space-3)]">
              {UI.odWhatIsNew[locale]}
            </Heading>
            <DocumentList locale={locale} headingLevel={3} items={latest.map((doc) => documentListItem(doc, locale, byId))} />
            {latest.some((doc) => !doc.dateIso) ? <p className="m-0 mt-[var(--space-3)] text-sm text-ink-600">{UI.odNewNote[locale]}</p> : null}
          </section>
        ) : null}

        <SectionLinks
          locale={locale}
          headingLevel={2}
          counts={{ meetings: meetings.length, funds: funds.length, documents: documents.length }}
        />
      </Stack>
    </TuscShell>
  );
}
