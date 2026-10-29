import { LivePerformanceResults, PerformanceResults } from "@/components/domain/performance/PerformanceResults";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container } from "@/components/ui";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { DEFAULT_PERIOD, PERIODS, type Period } from "@/lib/performance/period";
import { getPerformanceReport } from "@/lib/performance/read";
import type { PerformanceReport } from "@/lib/performance/report";

export async function PerformanceIndex({ locale, filtered }: { locale: Locale; filtered: boolean }) {
  const entries = await Promise.all(PERIODS.map(async (period) => [period, await getPerformanceReport(period)] as const));
  const reports = Object.fromEntries(entries) as Record<Period, PerformanceReport | null>;

  return (
    <Container className="pb-8 pt-2">
      <Breadcrumbs locale={locale} items={[{ label: UI.home[locale], path: "/" }, { label: UI.perfTitle[locale] }]} />
      <QueryBoundary filtered={filtered} fallback={<PerformanceResults locale={locale} reports={reports} query={{ period: DEFAULT_PERIOD }} />}>
        <LivePerformanceResults locale={locale} reports={reports} />
      </QueryBoundary>
    </Container>
  );
}
