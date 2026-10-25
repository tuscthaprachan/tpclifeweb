/**
 * Performance: the figures the Service Standard asks every service to publish
 * (completion rate, user satisfaction, digital take-up, time to resolution,
 * return rate), for lost and found and complaints. Read from the database as
 * SQL aggregates (lib/performance), hidden below five cases, and cached for an
 * hour. The period is a plain `?period=` link, so it works without JavaScript.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PerformanceFigures } from "@/components/domain/performance/PerformanceFigures";
import { PeriodLinks } from "@/components/domain/performance/PeriodLinks";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container, Heading, InsetText, Stack, Timestamp } from "@/components/ui";
import { DEFAULT_LOCALE, isLocale, localePath, type Locale } from "@/lib/i18n/config";
import { formatDate } from "@/lib/i18n/format";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { parsePeriod } from "@/lib/performance/period";
import { getPerformanceReport } from "@/lib/performance/read";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, "/performance"),
    title: UI.perfTitle[locale],
    description: UI.perfIntro[locale],
  };
}

export default async function PerformancePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;
  const period = parsePeriod((await searchParams).period);
  const report = await getPerformanceReport(period);

  return (
    <Container className="pb-8 pt-2">
      <Breadcrumbs locale={locale} items={[{ label: UI.home[locale], path: "/" }, { label: UI.perfTitle[locale] }]} />
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
    </Container>
  );
}
