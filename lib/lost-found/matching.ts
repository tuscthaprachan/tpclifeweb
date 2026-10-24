/**
 * Matching: ranks found items for a lost report, and lost reports for a found
 * item, so the desk does not search by eye (backend plan, "Match").
 *
 * WHAT COUNTS. A candidate must fall in the date window (the item was found on
 * or after the day it was lost, and within `MATCH_WINDOW_DAYS` of it) and must
 * either share the category or have wording at least `MIN_TEXT_SIMILARITY`
 * similar. Candidates are then scored out of 100:
 *
 *   same category   40
 *   same place      20   (only when both name a place)
 *   closeness       15   (all of it on the same day, none at the window's end)
 *   similar wording 25   (pg_trgm `similarity()` over title and description,
 *                         the better of the Thai and the English text)
 *
 * The score orders candidates and is explained to staff in words
 * (`describeMatch`); it never decides anything. An officer confirms every
 * link. pg_trgm is installed by migration 0007 and loaded into PGlite in
 * tests; trigram similarity on Thai depends on the database locale, which is
 * why both languages are tried and the English text usually carries it.
 */

import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { getCase } from "@/lib/cases/engine";
import type { StaffActor } from "@/lib/cases/types";
import type { AuditExecutor } from "@/lib/db/audit";
import { cases, lostFoundItems } from "@/lib/db/schema";
import { lostFoundCaseLinks } from "@/lib/db/schema/lost-found-staff";
import { a, type AdminKey } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";

export const MATCH_WINDOW_DAYS = 30;
export const MIN_TEXT_SIMILARITY = 0.2;
const SIMILAR_WORDING = 0.3;

/** Found items that can still be matched, and lost reports that are still looking. */
export const MATCHABLE_FOUND_STATUSES = ["logged", "listed"] as const;
export const MATCHABLE_LOST_STATUSES = ["submitted", "searching", "match_found"] as const;

export interface MatchReasons {
  sameCategory: boolean;
  /** Null when either side has no place. */
  samePlace: boolean | null;
  /** Whole days between the two dates (found minus lost, never negative inside the window). */
  daysApart: number;
  /** 0 to 1, from pg_trgm. */
  textSimilarity: number;
}

const POINTS = { category: 40, place: 20, date: 15, text: 25 } as const;

/** The score for a set of reasons, 0 to 100. Pure. */
export function scoreMatch(r: MatchReasons): number {
  const date = POINTS.date * Math.max(0, 1 - Math.max(0, r.daysApart) / MATCH_WINDOW_DAYS);
  const text = POINTS.text * Math.min(1, Math.max(0, r.textSimilarity) * 1.7);
  const total = (r.sameCategory ? POINTS.category : 0) + (r.samePlace ? POINTS.place : 0) + date + text;
  return Math.max(0, Math.min(100, Math.round(total)));
}

/** The pieces of the explanation, in the order they are said. Pure. */
export function explainMatch(r: MatchReasons): AdminKey[] {
  const keys: AdminKey[] = [];
  keys.push(r.sameCategory ? "lfcMatchSameCategory" : "lfcMatchOtherCategory");
  if (r.samePlace === true) keys.push("lfcMatchSamePlace");
  if (r.samePlace === false) keys.push("lfcMatchOtherPlace");
  keys.push(r.daysApart === 0 ? "lfcMatchSameDay" : r.daysApart === 1 ? "lfcMatchOneDay" : "lfcMatchDaysApart");
  if (r.textSimilarity >= SIMILAR_WORDING) keys.push("lfcMatchSimilarWording");
  return keys;
}

/** "Same category, same place, 2 days apart, similar wording". */
export function describeMatch(r: MatchReasons, locale: Locale): string {
  const parts = explainMatch(r).map((key) => a(key, locale, { days: r.daysApart }));
  const text = parts.join(", ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export interface MatchCandidate {
  caseId: string;
  reference: string;
  kind: "lost" | "found";
  status: string;
  title: { th: string; en: string };
  category: string;
  occurredOn: string;
  score: number;
  reasons: MatchReasons;
  /** Already linked to the subject as a possible or confirmed match. */
  linked: boolean;
}

const DAY_MS = 86_400_000;
const dayNumber = (date: string): number => Math.floor(Date.parse(`${date}T00:00:00Z`) / DAY_MS);
const addDays = (date: string, days: number): string => new Date((dayNumber(date) + days) * DAY_MS).toISOString().slice(0, 10);

/**
 * Candidates for the case: found items when it is a lost report, lost reports
 * when it is a found item. Best first, at most `limit`. Staff of the service
 * only (the case is read through the engine, which checks access).
 */
export async function rankMatches(db: AuditExecutor, caseId: string, actor: StaffActor, limit = 5): Promise<MatchCandidate[]> {
  const subjectCase = await getCase(db, caseId, actor);
  if (subjectCase.service !== "lost_found") return [];
  const [subject] = await db.select().from(lostFoundItems).where(eq(lostFoundItems.caseId, caseId));
  if (!subject) return [];
  const subjectIsLost = subjectCase.kind === "lost";

  const textOf = (title: string, description: string) => `${title} ${description}`.trim().toLowerCase();
  const subjectEn = textOf(subject.titleEn, subject.descriptionEn);
  const subjectTh = textOf(subject.titleTh, subject.descriptionTh);
  const similarity = sql<number>`greatest(
    similarity(lower(${lostFoundItems.titleEn} || ' ' || ${lostFoundItems.descriptionEn}), ${subjectEn}::text),
    similarity(lower(${lostFoundItems.titleTh} || ' ' || ${lostFoundItems.descriptionTh}), ${subjectTh}::text)
  )::float8`;

  // Lost on day L, found on day F: F must be in [L, L + window].
  const from = subjectIsLost ? subject.occurredOn : addDays(subject.occurredOn, -MATCH_WINDOW_DAYS);
  const to = subjectIsLost ? addDays(subject.occurredOn, MATCH_WINDOW_DAYS) : subject.occurredOn;

  const rows = await db
    .select({
      caseId: cases.id,
      reference: cases.reference,
      status: cases.status,
      titleTh: lostFoundItems.titleTh,
      titleEn: lostFoundItems.titleEn,
      category: lostFoundItems.category,
      placeId: lostFoundItems.placeId,
      occurredOn: lostFoundItems.occurredOn,
      similarity,
    })
    .from(lostFoundItems)
    .innerJoin(cases, eq(cases.id, lostFoundItems.caseId))
    .where(
      and(
        eq(cases.service, "lost_found"),
        eq(cases.kind, subjectIsLost ? "found" : "lost"),
        inArray(cases.status, subjectIsLost ? [...MATCHABLE_FOUND_STATUSES] : [...MATCHABLE_LOST_STATUSES]),
        gte(lostFoundItems.occurredOn, from),
        lte(lostFoundItems.occurredOn, to),
        sql`(${lostFoundItems.category} = ${subject.category} or ${similarity} >= ${MIN_TEXT_SIMILARITY})`,
      ),
    )
    .orderBy(desc(similarity))
    .limit(100);

  const links = await db
    .select()
    .from(lostFoundCaseLinks)
    .where(and(eq(subjectIsLost ? lostFoundCaseLinks.lostCaseId : lostFoundCaseLinks.foundCaseId, caseId), inArray(lostFoundCaseLinks.status, ["possible", "confirmed"])));
  const linked = new Set(links.map((l) => (subjectIsLost ? l.foundCaseId : l.lostCaseId)));

  const candidates = rows.map((r): MatchCandidate => {
    const reasons: MatchReasons = {
      sameCategory: r.category === subject.category,
      samePlace: r.placeId && subject.placeId ? r.placeId === subject.placeId : null,
      daysApart: Math.abs(dayNumber(r.occurredOn) - dayNumber(subject.occurredOn)),
      textSimilarity: Number(r.similarity) || 0,
    };
    return {
      caseId: r.caseId,
      reference: r.reference,
      kind: subjectIsLost ? "found" : "lost",
      status: r.status,
      title: { th: r.titleTh, en: r.titleEn },
      category: r.category,
      occurredOn: r.occurredOn,
      score: scoreMatch(reasons),
      reasons,
      linked: linked.has(r.caseId),
    };
  });
  return candidates.sort((x, y) => y.score - x.score || x.reference.localeCompare(y.reference)).slice(0, limit);
}
