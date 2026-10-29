"use client";

import { Heading, InsetText, Stack, Timestamp } from "@/components/ui";
import { localePath, type Locale } from "@/lib/i18n/config";
import { formatDate } from "@/lib/i18n/format";
import { UI } from "@/lib/i18n/strings";
import { parsePeriod, type Period } from "@/lib/performance/period";
import type { PerformanceReport } from "@/lib/performance/report";
import { useQueryRecord, type QueryRecord } from "@/lib/use-query";
import { PerformanceFigures } from "./PerformanceFigures";
import { PeriodLinks } from "./PeriodLinks";

interface PerformanceResultsProps {
  locale: Locale;
  /** The report for every period, so choosing one needs no server round trip. */
  reports: Record<Period, PerformanceReport | null>;
}

export function LivePerformanceResults(props: PerformanceResultsProps) {
  return <PerformanceResults {...props} query={useQueryRecord()} />;
}

export function PerformanceResults({ locale, reports, query }: PerformanceResultsProps & { query: QueryRecord }) {
  const period = parsePeriod(query.period);
  const report = reports[period];

  return (
    <Stack space={8}>
      <Stack space={4}>
        <Heading level={1}>{UI.perfTitle[locale]}</Heading>
        <p className="m-0 max-w-[var(--width-narrow)] text-ink-900">{UI.perfIntro[locale]}</p>
        <InsetText>{UI.perfSmallNumbers[locale]}</InsetText>
        <PeriodLinks locale={locale} current={period} basePath={localePath(locale, "/performance")} />
        {report ? (
          <div className="text-sm text-ink-600">
            <p className="m-0">{report.from ? UI.perfCoversFrom[locale].replace("{from}", formatDate(report.from, locale)) : UI.perfCoversAll[locale]}</p>
            {period === "12m" ? <p className="m-0">{UI.perfPeriod12mNote[locale]}</p> : null}
            <p className="m-0">
              {UI.perfUpdated[locale]}: <Timestamp value={report.generatedAt} locale={locale} format="datetime" />. {UI.perfRefreshNote[locale]}
            </p>
          </div>
        ) : null}
      </Stack>

      {report ? (
        <>
          <PerformanceFigures report={report} locale={locale} />
          <Stack space={3} as="section">
            <Heading level={2}>{UI.perfAboutHeading[locale]}</Heading>
            <ul className="m-0 list-disc space-y-[var(--space-2)] ps-[var(--space-6)] text-ink-900">
              <li>{UI.perfAbout1[locale]}</li>
              <li>{UI.perfAbout2[locale]}</li>
              <li>{UI.perfAbout3[locale]}</li>
            </ul>
          </Stack>
        </>
      ) : (
        <p className="m-0 text-ink-900">{UI.perfUnavailable[locale]}</p>
      )}
    </Stack>
  );
}
