/**
 * The performance figures, shared by the public page and the staff dashboard
 * so the two can never disagree. Summary lists for single measures (each with
 * its plain definition), tables with captions for months, categories and
 * journeys. No chart: a table says everything these figures have to say, and
 * a chart of numbers hidden below five cases would show gaps, not trends.
 *
 * A hidden figure reads "Not enough data" and shows no number, not even the
 * count it rests on (lib/performance/suppress.ts).
 */

import type { ReactNode } from "react";
import { DataTable, Heading, Stack, SummaryList, type SummaryListRow } from "@/components/ui";
import type { Locale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";
import { UI, type UiKey } from "@/lib/i18n/strings";
import type { GroupedRow, Measure } from "@/lib/performance/suppress";
import type { PerformanceReport } from "@/lib/performance/report";

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

function Section({ title, level, children }: { title: string; level: 2 | 3; children: ReactNode }) {
  return (
    <Stack space={3} as="section">
      <Heading level={level}>{title}</Heading>
      {children}
    </Stack>
  );
}

function categoryName(r: GroupedRow, locale: Locale): string {
  if (r.type === "category") return locale === "th" ? r.nameTh : r.nameEn;
  return r.pool === "sensitive" ? UI.perfPoolSensitive[locale] : r.pool === "other" ? UI.perfPoolOther[locale] : UI.perfPoolSensitiveOther[locale];
}

const JOURNEY_NAME = { lost: "perfJLost", found: "perfJFound", claim: "perfJClaim", complaint: "perfJComplaint" } as const;

/** `headingLevel` is the depth of each service heading: 2 on the public page, 3 where the figures sit under a heading of their own. */
export function PerformanceFigures({ report, locale, headingLevel = 2 }: { report: PerformanceReport; locale: Locale; headingLevel?: 2 | 3 }) {
  const { lostFound: lf, complaints: cp, journeys, signposts } = report;
  const f = (measure: Measure, as?: FigureProps["as"], basis?: UiKey) => <Figure measure={measure} locale={locale} as={as} basis={basis} />;

  return (
    <Stack space={8}>
      <Section level={headingLevel} title={UI.perfLfHeading[locale]}>
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
      </Section>

      <Section level={headingLevel} title={UI.perfCpHeading[locale]}>
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
      </Section>

      <Section level={headingLevel} title={UI.perfSpHeading[locale]}>
        <p className="m-0 text-ink-600">{UI.perfSpIntro[locale]}</p>
        <SummaryList
          rows={[
            row(UI.perfSpFaculty[locale], UI.perfSpFacultyDef[locale], f(signposts.faculty)),
            row(UI.perfSpCourse[locale], UI.perfSpCourseDef[locale], f(signposts.course)),
          ]}
        />
      </Section>

      <Section level={headingLevel} title={UI.perfJHeading[locale]}>
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
      </Section>
    </Stack>
  );
}
