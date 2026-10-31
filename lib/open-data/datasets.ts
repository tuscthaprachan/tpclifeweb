import "server-only";

import { CSV_BOM, cell, csvBytes, csvText, type CsvTable } from "./csv";
import {
  getOpenDataBodies,
  getOpenDataBudgetLines,
  getOpenDataDecisions,
  getOpenDataFunds,
  getOpenDataMeetings,
  getOpenDataMemberships,
  getOpenDataRecommendations,
  getOpenDataSurveyResults,
  type BodyRow,
  type BudgetLineRow,
  type DecisionRow,
  type FundRow,
  type MeetingRow,
  type MembershipRow,
  type RecommendationRow,
  type SurveyResultRow,
} from "./read";

export const DATASET_KEYS = [
  "members",
  "committees",
  "meetings",
  "decisions",
  "budget-lines",
  "funds",
  "recommendations",
  "canteen-survey",
] as const;
export type DatasetKey = (typeof DATASET_KEYS)[number];

export function isDatasetKey(value: string): value is DatasetKey {
  return (DATASET_KEYS as readonly string[]).includes(value);
}

/** The path of a dataset's file, without the locale prefix. */
export function datasetPath(key: DatasetKey): string {
  return `/about/open-data/tusc/data/${key}.csv`;
}

/** The leading document number of a document slug ("48-summary-of-..." gives "48"). */
function documentNumber(slug: string | null): string {
  return cell(slug === null ? null : (slug.split("-")[0] ?? null));
}

export function membersTable(rows: readonly MembershipRow[]): CsvTable {
  return {
    columns: ["person", "person_latin", "faculty", "party", "role", "body", "from", "to", "source_documents", "source_reference"],
    rows: rows.map((r) => [
      r.personNameTh,
      cell(r.personNameLatin),
      cell(r.faculty),
      cell(r.party),
      r.roleTh,
      r.bodyNameTh,
      cell(r.fromDate),
      cell(r.toDate),
      cell(r.sourceDocuments),
      cell(r.sourceAnchor),
    ]),
  };
}

export function committeesTable(bodies: readonly BodyRow[]): CsvTable {
  const nameBySlug = new Map(bodies.map((b) => [b.slug, b.nameTh]));
  return {
    columns: ["name", "type", "parent", "remit", "legal_basis", "appointed_on", "ended_on", "members_as_appointed", "chair", "status", "source_document"],
    rows: bodies
      .filter((b) => b.committeeType !== null)
      .map((b) => [
        b.nameTh,
        cell(b.committeeType),
        b.parentSlug === null ? "[not applicable]" : cell(nameBySlug.get(b.parentSlug) ?? b.parentSlug),
        cell(b.remit),
        cell(b.legalBasis),
        cell(b.appointedOn),
        cell(b.endedOn),
        cell(b.membersAsAppointed),
        cell(b.chair),
        cell(b.activity),
        documentNumber(b.sourceDocumentSlug),
      ]),
  };
}

export function meetingsTable(rows: readonly MeetingRow[]): CsvTable {
  return {
    columns: [
      "session_type",
      "session_number",
      "meeting_number",
      "meeting_th",
      "date",
      "place",
      "chair",
      "present",
      "on_leave",
      "absent",
      "seats",
      "minutes_adopted_on",
      "minutes_document",
      "agenda_document",
    ],
    rows: rows.map((m) => [
      m.sessionType,
      String(m.session),
      String(m.meeting),
      m.titleTh,
      m.meetingDate,
      cell(m.place),
      cell(m.chair),
      cell(m.present),
      cell(m.onLeave),
      cell(m.absent),
      cell(m.seats),
      cell(m.minutesAdoptedOn),
      documentNumber(m.minutesDocumentSlug),
      documentNumber(m.agendaDocumentSlug),
    ]),
  };
}

export function decisionsTable(rows: readonly DecisionRow[]): CsvTable {
  return {
    columns: [
      "decision_ref",
      "meeting_date",
      "meeting",
      "item_printed",
      "minutes_anchor",
      "topic",
      "type",
      "decision_th",
      "decision_en",
      "votes_for",
      "votes_against",
      "votes_abstain",
      "members_voting_printed",
      "party_breakdown_printed",
      "outcome",
      "amount_thb",
    ],
    rows: rows.map((d) => [
      d.ref,
      d.meetingDate,
      d.meetingSlug,
      d.item,
      cell(d.minutesAnchor),
      d.topic,
      d.type,
      d.textTh,
      d.textEn,
      cell(d.votesFor),
      cell(d.votesAgainst),
      cell(d.votesAbstain),
      cell(d.membersVoting),
      cell(d.partyBreakdown),
      d.outcome,
      cell(d.amount),
    ]),
  };
}

export const BUDGET_COLUMNS = [
  "fiscal_year_be",
  "view",
  "organisation_type",
  "organisation",
  "project",
  "category",
  "amount_thb",
  "source_page",
] as const;

export function budgetLinesTable(rows: readonly BudgetLineRow[]): CsvTable {
  return {
    columns: BUDGET_COLUMNS,
    rows: rows.map((l) => [String(l.fiscalYear), l.view, l.organisationType, l.organisation, l.project, l.category, l.amount, cell(l.sourcePage)]),
  };
}

export function fundsTable(rows: readonly FundRow[]): CsvTable {
  return {
    columns: ["no", "fund_type", "code", "name_th", "annotation"],
    rows: rows.map((f) => [String(f.number), f.type, f.code, f.name, cell(f.annotation, "[none]")]),
  };
}

export function recommendationsTable(rows: readonly RecommendationRow[]): CsvTable {
  return {
    columns: ["report", "section", "urgency", "addressed_to", "status", "status_date", "recommendation_en", "recommendation_th"],
    rows: rows.map((r) => [
      r.reportDocumentSlug,
      r.section,
      cell(r.urgency),
      cell(r.addressedTo),
      cell(r.responseStatus),
      cell(r.responseDate),
      r.textEn,
      r.textTh,
    ]),
  };
}

export function surveyTable(rows: readonly SurveyResultRow[]): CsvTable {
  const sorted = [...rows].sort((a, b) => b.mentions - a.mentions || a.problemTh.localeCompare(b.problemTh, "th"));
  return {
    columns: ["problem_th", "problem_en", "mentions"],
    rows: sorted.map((r) => [r.problemTh, cell(r.problemEn), String(r.mentions)]),
  };
}

export async function getDatasetTable(key: DatasetKey): Promise<CsvTable> {
  switch (key) {
    case "members":
      return membersTable(await getOpenDataMemberships());
    case "committees":
      return committeesTable(await getOpenDataBodies());
    case "meetings":
      return meetingsTable(await getOpenDataMeetings());
    case "decisions":
      return decisionsTable(await getOpenDataDecisions());
    case "budget-lines":
      return budgetLinesTable(await getOpenDataBudgetLines());
    case "funds":
      return fundsTable(await getOpenDataFunds());
    case "recommendations":
      return recommendationsTable(await getOpenDataRecommendations());
    case "canteen-survey":
      return surveyTable(await getOpenDataSurveyResults());
  }
}

export interface DatasetSummary {
  key: DatasetKey;
  rows: number;
  columns: readonly string[];
  bytes: number;
}

export async function getDatasetSummaries(): Promise<DatasetSummary[]> {
  return Promise.all(
    DATASET_KEYS.map(async (key) => {
      const table = await getDatasetTable(key);
      return { key, rows: table.rows.length, columns: table.columns, bytes: csvBytes(table) };
    }),
  );
}

export { CSV_BOM, csvText };

/** The headers of a CSV download: a file the browser saves, cached for an hour and by shared caches for a day. */
export function csvHeaders(filename: string): HeadersInit {
  return {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    "X-Content-Type-Options": "nosniff",
  };
}
