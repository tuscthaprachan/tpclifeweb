/**
 * The staff performance figures: the same measures and the same suppression
 * as components/domain/performance/PerformanceFigures, laid out as headline
 * stat cards and one card per service. A hidden figure reads "Not enough
 * data" and shows no number, not even the count it rests on.
 */

import type { ReactNode } from "react";
import { MessageSquareWarning, PackageSearch, Route, Signpost } from "lucide-react";
import { StatCard } from "@/components/admin/ui";
import { DataTable, Stack, SummaryList, type SummaryListRow } from "@/components/ui";
import type { Locale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";
import { UI, type UiKey } from "@/lib/i18n/strings";
import type { GroupedRow, Measure } from "@/lib/performance/suppress";
import type { PerformanceReport } from "@/lib/performance/report";
import { SectionCard } from "../cases/SectionCard";

const MONTH_TAG: Record<Locale, string> = { th: "th-TH-u-ca-buddhist", en: "en-GB" };

function monthLabel(key: string, locale: Locale): string {
  const [year, month] = key.split("-").map(Number) as [number, number];
  return new Intl.DateTimeFormat(MONTH_TAG[locale], { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 15)));
}

const fill = (template: string, n: number, locale: Locale) => template.replace("{n}", formatNumber(n, locale));

interface FigureProps {
  measure: Measure;
  locale: Locale;
  /** How to write the value. */
  as?: "count" | "percent" | "days" | "score";
  /** The words after "of N", naming what N counts. */
  basis?: UiKey;
}

function Figure({ measure, locale, as = "count", basis }: FigureProps) {
  if (measure.suppressed) return <span className="text-ink-600">{UI.perfNotEnough[locale]}</span>;
  const value =
    as === "percent"
      ? `${formatNumber(measure.value, locale)}%`
      : as === "days"
        ? fill(UI.perfDays[locale], measure.value, locale)
        : as === "score"
          ? fill(UI.perfOutOfFive[locale], measure.value, locale)
          : formatNumber(measure.value, locale);
  return (
    <span>
      <strong className="text-lg font-semibold">{value}</strong>
      {basis ? <span className="ms-[var(--space-2)] text-ink-600">{fill(UI[basis][locale], measure.n, locale)}</span> : null}
    </span>
  );
}

function statValue(measure: Measure, locale: Locale, as: FigureProps["as"] = "count"): string {
  if (measure.suppressed) return UI.perfNotEnough[locale];
  return as === "percent"
    ? `${formatNumber(measure.value, locale)}%`
    : as === "days"
      ? fill(UI.perfDays[locale], measure.value, locale)
      : as === "score"
        ? fill(UI.perfOutOfFive[locale], measure.value, locale)
        : formatNumber(measure.value, locale);
}

function statHint(measure: Measure, basis: UiKey, locale: Locale): string | undefined {
  return measure.suppressed ? undefined : fill(UI[basis][locale], measure.n, locale);
}

function row(label: string, definition: string, figure: ReactNode): SummaryListRow {
  return {
    key: label,
    value: (
      <>
        {figure}
        <p className="m-0 mt-[var(--space-1)] text-sm text-ink-600">{definition}</p>
      </>
    ),
  };
}

function categoryName(r: GroupedRow, locale: Locale): string {
  if (r.type === "category") return locale === "th" ? r.nameTh : r.nameEn;
  return r.pool === "sensitive" ? UI.perfPoolSensitive[locale] : r.pool === "other" ? UI.perfPoolOther[locale] : UI.perfPoolSensitiveOther[locale];
}

const _x = { lost: "perfJLost", found: "perfJFound", claim: "perfJClaim", complaint: "perfJComplaint" } as const;

const JOURNEY_NAME = { lost: "perfJLost", found: "perfJFound", claim: "perfJClaim", complaint: "perfJComplaint" } as const;

/** Headline figures as stat cards. */
export function HeadlineStats({ report, locale }: { report: PerformanceReport; locale: Locale }) {
  const { lostFound: lf, complaints: cp } = report;
  return (
    <div className="grid gap-[var(--space-3)] [grid-template-columns:repeat(auto-fit,minmax(14rem,1fr))]">
      <StatCard icon="lostFound" label={UI.perfLfReturned[locale]} value={statValue(lf.returned, locale)} />
      <StatCard icon="lostFound" label={UI.perfLfReturnRate[locale]} value={statValue(lf.returnRate, locale, "percent")} hint={statHint(lf.returnRate, "perfOfItems", locale)} />
      <StatCard icon="cases" label={UI.perfCpReceived[locale]} value={statValue(cp.received, locale)} />
      <StatCard icon="overdue" label={UI.perfCpAck[locale]} value={statValue(cp.acknowledgedOnTime, locale, "percent")} hint={statHint(cp.acknowledgedOnTime, "perfOfComplaints", locale)} />
      <StatCard icon="check" label={UI.perfCpResolved[locale]} value={statValue(cp.resolvedOnTime, locale, "percent")} hint={statHint(cp.resolvedOnTime, "perfOfComplaints", locale)} />
    </div>
  );
}

/** One card per service, headings at depth 3 under the page's "Figures" heading. */
export function PerformanceCards({ report, locale }: { report: PerformanceReport; locale: Locale }) {
  const { lostFound: lf, complaints: cp, journeys, signposts } = report;
  const f = (measure: Measure, as?: FigureProps["as"], basis?: UiKey) => <Figure measure={measure} locale={locale} as={as} basis={basis} />;

  return (
    <Stack space={4}>
      <SectionCard level={3} icon={PackageSearch} title={UI.perfLfHeading[locale]}>
        <SummaryList
          rows={[
            row(UI.perfLfLostReceived[locale], UI.perfLfLostReceivedDef[locale], f(lf.lostReceived)),
            row(UI.perfLfFoundReceived[locale], UI.perfLfFoundReceivedDef[locale], f(lf.foundReceived)),
            row(UI.perfLfReturned[locale], UI.perfLfReturnedDef[locale], f(lf.returned)),
            row(UI.perfLfReturnRate[locale], UI.perfLfReturnRateDef[locale], f(lf.returnRate, "percent", "perfOfItems")),
            row(UI.perfLfMedian[locale], UI.perfLfMedianDef[locale], f(lf.medianDaysToReturn, "days", "perfOfItems")),
            row(UI.perfLfOnline[locale], UI.perfLfOnlineDef[locale], f(lf.onlineShare, "percent", "perfOfReports")),
          ]}
        />
      </SectionCard>

      <SectionCard level={3} icon={MessageSquareWarning} title={UI.perfCpHeading[locale]}>
        <SummaryList
          rows={[
            row(UI.perfCpReceived[locale], UI.perfCpReceivedDef[locale], f(cp.received)),
            row(UI.perfCpRedirected[locale], UI.perfCpRedirectedDef[locale], f(cp.redirected)),
            row(UI.perfCpAck[locale], UI.perfCpAckDef[locale], f(cp.acknowledgedOnTime, "percent", "perfOfComplaints")),
            row(UI.perfCpResolved[locale], UI.perfCpResolvedDef[locale], f(cp.resolvedOnTime, "percent", "perfOfComplaints")),
            row(UI.perfCpMedian[locale], UI.perfCpMedianDef[locale], f(cp.medianDaysToResolution, "days", "perfOfComplaints")),
            row(UI.perfCpSatisfaction[locale], UI.perfCpSatisfactionDef[locale], f(cp.satisfactionMean, "score", "perfOfResponses")),
            row(UI.perfCpSatisfied[locale], UI.perfCpSatisfiedDef[locale], f(cp.satisfiedShare, "percent", "perfOfResponses")),
            row(UI.perfCpReopen[locale], UI.perfCpReopenDef[locale], f(cp.reopenRate, "percent", "perfOfComplaints")),
            row(UI.perfCpOnline[locale], UI.perfCpOnlineDef[locale], f(cp.onlineShare, "percent", "perfOfComplaints")),
          ]}
        />

        {cp.byMonth.length > 0 ? (
          <DataTable
            caption={UI.perfCpMonthCaption[locale]}
            columns={[
              { id: "month", header: UI.perfColMonth[locale], cell: (r) => monthLabel(r.month, locale) },
              { id: "received", header: UI.perfColReceived[locale], align: "end", cell: (r) => f(r.received) },
            ]}
            rows={cp.byMonth}
            getRowKey={(r) => r.month}
          />
        ) : report.period === "30d" ? (
          <p className="m-0 text-sm text-ink-600">{UI.perfCpMonthNone[locale]}</p>
        ) : null}

        {cp.byCategory.length > 0 ? (
          <>
            <DataTable
              caption={UI.perfCpCategoryCaption[locale]}
              columns={[
                { id: "category", header: UI.perfColCategory[locale], cell: (r) => categoryName(r, locale) },
                { id: "received", header: UI.perfColReceived[locale], align: "end", cell: (r) => formatNumber(r.n, locale) },
              ]}
              rows={cp.byCategory}
              getRowKey={(r) => (r.type === "category" ? r.key : r.pool)}
            />
            <p className="m-0 text-sm text-ink-600">{UI.perfCpCategoryNote[locale]}</p>
          </>
        ) : (
          <p className="m-0 text-ink-600">{UI.perfNotEnough[locale]}</p>
        )}
      </SectionCard>

      <SectionCard level={3} icon={Signpost} title={UI.perfSpHeading[locale]}>
        <p className="m-0 text-ink-600">{UI.perfSpIntro[locale]}</p>
        <SummaryList
          rows={[
            row(UI.perfSpFaculty[locale], UI.perfSpFacultyDef[locale], f(signposts.faculty)),
            row(UI.perfSpCourse[locale], UI.perfSpCourseDef[locale], f(signposts.course)),
          ]}
        />
      </SectionCard>

      <SectionCard level={3} icon={Route} title={UI.perfJHeading[locale]}>
        <p className="m-0 text-ink-600">{UI.perfJIntro[locale]}</p>
        <DataTable
          caption={UI.perfJCaption[locale]}
          columns={[
            { id: "form", header: UI.perfColForm[locale], cell: (r) => UI[JOURNEY_NAME[r.kind]][locale] },
            { id: "started", header: UI.perfColStarted[locale], align: "end", cell: (r) => f(r.started) },
            { id: "sent", header: UI.perfColSent[locale], align: "end", cell: (r) => f(r.completionRate, "percent", "perfOfForms") },
          ]}
          rows={journeys}
          getRowKey={(r) => r.kind}
        />
      </SectionCard>
    </Stack>
  );
}
