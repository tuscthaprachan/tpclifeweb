import type { DecisionRow, MeetingRow } from "@/lib/open-data/read";
import { DECISION_OUTCOMES, DECISION_TOPICS } from "./meetings";

export const DECISIONS_PER_PAGE = 24;

export interface DecisionQuery {
  topic: string;
  outcome: string;
  meeting: string;
  page: number;
}

export type QueryInput = Record<string, string | undefined>;

function oneOf(raw: string | undefined, allowed: readonly string[]): string {
  return raw !== undefined && allowed.includes(raw) ? raw : "";
}

/** Reads the filters from the query string; anything that is not a known value is ignored. */
export function parseDecisionQuery(query: QueryInput, meetingSlugs: readonly string[]): DecisionQuery {
  const page = Number.parseInt(query.page ?? "", 10);
  return {
    topic: oneOf(query.topic, DECISION_TOPICS),
    outcome: oneOf(query.outcome, DECISION_OUTCOMES),
    meeting: oneOf(query.meeting, meetingSlugs),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export function hasDecisionFilters(query: DecisionQuery): boolean {
  return query.topic !== "" || query.outcome !== "" || query.meeting !== "";
}

/** Latest meeting first, the register order inside a meeting. */
export function sortDecisions(decisions: readonly DecisionRow[]): DecisionRow[] {
  return [...decisions].sort((a, b) => {
    if (a.meetingDate !== b.meetingDate) return a.meetingDate < b.meetingDate ? 1 : -1;
    return a.ref < b.ref ? -1 : a.ref > b.ref ? 1 : 0;
  });
}

export function filterDecisions(decisions: readonly DecisionRow[], query: DecisionQuery): DecisionRow[] {
  return decisions.filter(
    (decision) =>
      (query.topic === "" || decision.topic === query.topic) &&
      (query.outcome === "" || decision.outcome === query.outcome) &&
      (query.meeting === "" || decision.meetingSlug === query.meeting),
  );
}

export interface DecisionPage {
  rows: DecisionRow[];
  page: number;
  pages: number;
  total: number;
  from: number;
  to: number;
}

export function paginateDecisions(decisions: readonly DecisionRow[], requestedPage: number, perPage = DECISIONS_PER_PAGE): DecisionPage {
  const total = decisions.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(Math.max(1, requestedPage), pages);
  const start = (page - 1) * perPage;
  const rows = decisions.slice(start, start + perPage);
  return { rows, page, pages, total, from: total === 0 ? 0 : start + 1, to: start + rows.length };
}

/** The query string for a page of the register, keeping only the filters that are set. */
export function decisionQueryString(query: Omit<DecisionQuery, "page">, page: number): string {
  const params = new URLSearchParams();
  if (query.topic) params.set("topic", query.topic);
  if (query.outcome) params.set("outcome", query.outcome);
  if (query.meeting) params.set("meeting", query.meeting);
  if (page > 1) params.set("page", String(page));
  const text = params.toString();
  return text ? `?${text}` : "";
}

export function meetingOptions(meetings: readonly MeetingRow[]): MeetingRow[] {
  return [...meetings].sort((a, b) => (a.meetingDate < b.meetingDate ? 1 : -1));
}
