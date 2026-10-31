"use client";

import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { StatusTag } from "@/components/ui/StatusTag";
import { liveRegionProps } from "@/lib/a11y";
import { localePath, type Locale } from "@/lib/i18n/config";
import { formatDate, formatNumber } from "@/lib/i18n/format";
import { UI } from "@/lib/i18n/strings";
import type { DecisionRow, MeetingRow } from "@/lib/open-data/read";
import { useQueryRecord, type QueryRecord } from "@/lib/use-query";
import { fillText } from "../fill";
import { TUSC_PATH } from "../sections";
import { DecisionFilters } from "./DecisionFilters";
import {
  decisionQueryString,
  filterDecisions,
  hasDecisionFilters,
  paginateDecisions,
  parseDecisionQuery,
  sortDecisions,
} from "./decision-query";
import { decisionText, meetingPath, outcomeLabel, outcomeTone, printedValue } from "./meetings";

interface DecisionResultsProps {
  locale: Locale;
  decisions: DecisionRow[];
  meetings: MeetingRow[];
  /** The number of the table among the tables on the page. */
  tableNumber: number;
}

export function LiveDecisionResults(props: DecisionResultsProps) {
  return <DecisionResults {...props} query={useQueryRecord()} />;
}

export function DecisionResults({ locale, decisions, meetings, tableNumber, query: rawQuery }: DecisionResultsProps & { query: QueryRecord }) {
  const query = parseDecisionQuery(rawQuery, meetings.map((meeting) => meeting.slug));
  const filtered = sortDecisions(filterDecisions(decisions, query));
  const page = paginateDecisions(filtered, query.page);
  const n = (value: number) => formatNumber(value, locale);
  const base = localePath(locale, `${TUSC_PATH}/decisions`);

  const columns: DataTableColumn<DecisionRow>[] = [
    {
      id: "decision",
      header: UI.odDcColDecision[locale],
      rowHeader: true,
      cell: (row) => (
        <>
          <span className="tabular-nums">{row.ref}</span> <span lang={locale}>{decisionText(row, locale)}</span>
        </>
      ),
    },
    { id: "for", header: UI.odDcColFor[locale], align: "end", cell: (row) => printedValue(row.votesFor, locale) },
    { id: "against", header: UI.odDcColAgainst[locale], align: "end", cell: (row) => printedValue(row.votesAgainst, locale) },
    { id: "abstain", header: UI.odDcColAbstain[locale], align: "end", cell: (row) => printedValue(row.votesAbstain, locale) },
    {
      id: "outcome",
      header: UI.odDcColOutcome[locale],
      cell: (row) => <StatusTag tone={outcomeTone(row.outcome)} label={outcomeLabel(row.outcome, locale)} />,
    },
    {
      id: "minutes",
      header: UI.odDcColMinutes[locale],
      cell: (row) => (
        <Link
          href={`${localePath(locale, meetingPath(row.meetingSlug))}${row.minutesAnchor ? `#${row.minutesAnchor}` : ""}`}
          className="text-action underline"
        >
          {fillText(UI.odDcMinutesLink[locale], { date: formatDate(row.meetingDate, locale), item: row.item })}
        </Link>
      ),
    },
  ];

  const caption =
    page.pages > 1
      ? fillText(UI.odDcCaption[locale], { page: n(page.page), pages: n(page.pages) })
      : UI.odDcCaptionOnePage[locale];

  return (
    <>
      <DecisionFilters
        locale={locale}
        decisions={decisions}
        meetings={meetings}
        value={query}
        hasActiveFilters={hasDecisionFilters(query)}
        labelledBy="od-find"
      />

      <p {...liveRegionProps("polite")} className="m-0 text-ink-900">
        {fillText(UI.odDcShowing[locale], { from: n(page.from), to: n(page.to), total: n(page.total) })}
      </p>

      {page.rows.length === 0 ? (
        <EmptyState title={UI.odDcNone[locale]}>
          <Link href={base} className="text-action underline">
            {UI.clearFilters[locale]}
          </Link>
        </EmptyState>
      ) : (
        <>
          <DataTable
            id="od-decisions-table"
            columns={columns}
            rows={page.rows}
            getRowKey={(row) => row.id}
            caption={`${UI.odTable[locale]} ${n(tableNumber)}: ${caption}`}
            locale={locale}
          />
          <Pagination
            currentPage={page.page}
            totalPages={page.pages}
            buildHref={(target) => `${base}${decisionQueryString(query, target)}`}
            locale={locale}
          />
        </>
      )}
    </>
  );
}
