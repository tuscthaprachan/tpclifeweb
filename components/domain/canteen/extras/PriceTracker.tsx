import { Heading } from "@/components/ui";
import type { Locale } from "@/lib/i18n/config";
import type { CanteenData } from "@/lib/sanity/types";

import { PriceHistoryChart } from "./PriceHistoryChart";
import {
  ricePlateMedians,
  ricePlateSummary,
  semesterLabel,
  type ChartPoint,
} from "./priceHistory";
import { EXTRAS, extras } from "./strings";

/**
 * The hub's price tracker: the median price of a plate of rice in the first
 * and latest semester we surveyed, with a small chart and table. Renders
 * nothing unless at least two semesters have a surveyed figure, because one
 * figure is not a trend. Surveyed figures only, never projected.
 */
export function PriceTracker({ data, locale }: { data: CanteenData; locale: Locale }) {
  const medians = ricePlateMedians(data);
  const summary = ricePlateSummary(medians);
  if (!summary) return null;

  const points: ChartPoint[] = medians.map((entry) => ({
    label: semesterLabel(entry.semester, locale),
    value: entry.median,
    checkedOn: entry.latestCheckedOn,
    note: extras.plates(locale, entry.count),
  }));

  return (
    <section aria-labelledby="eat-tracker-title" className="flex flex-col gap-[var(--space-3)]">
      <Heading level={2} id="eat-tracker-title" className="m-0 text-xl">
        {EXTRAS.trackerTitle[locale]}
      </Heading>
      <p className="m-0 text-ink-900">
        {extras.riceTrend(
          locale,
          summary.first.median,
          semesterLabel(summary.first.semester, locale),
          summary.latest.median,
          semesterLabel(summary.latest.semester, locale),
        )}
      </p>
      <PriceHistoryChart
        points={points}
        locale={locale}
        title={EXTRAS.trackerChartTitle[locale]}
        headingLevel={3}
        whenHeader={EXTRAS.colWhen[locale]}
        valueHeader={EXTRAS.colMedian[locale]}
        noteHeader={EXTRAS.colPlates[locale]}
      />
      <p className="m-0 text-sm text-ink-600">{EXTRAS.historyNote[locale]}</p>
      <p className="m-0 text-sm text-ink-600">{EXTRAS.semesterNote[locale]}</p>
    </section>
  );
}
