/**
 * Pure "is this place open right now" logic for the home page's key opening
 * hours list. Kept alongside the one component that uses it rather than in
 * `lib/`, since `lib/` is outside this agent's owned directories and this
 * logic is specific to this single at-a-glance surface.
 *
 * All time maths goes through `lib/i18n/format.ts`'s Asia/Bangkok helpers,
 * the same ones `lib/shuttle/schedule.ts` uses for the shuttle panel, so
 * "today" and "now" always mean the campus's own clock, never the reader's
 * device or the server's.
 *
 * A row with `validFrom` or `validUntil` covers only those dates, and on any
 * date a dated row covers, the undated rows do not apply. A row whose closing
 * time is not after its opening time runs past midnight into the next day.
 */

import { bangkokDateKey, bangkokDayOfWeek, bangkokMinutesOfDay, formatClockTime, parseClockTime } from "@/lib/i18n/format";
import type { CampusPlace, LocaleString, OpeningHours } from "@/lib/content/types";

export type PlaceHoursStatus =
  | { kind: "open"; closes: string; closesNextDay: boolean; note?: LocaleString }
  | { kind: "closed"; opensNext?: string; note?: LocaleString }
  | { kind: "noHours" };

const DAY_MS = 24 * 60 * 60 * 1000;

function isDated(entry: OpeningHours): boolean {
  return Boolean(entry.validFrom || entry.validUntil);
}

function covers(entry: OpeningHours, dateKey: string): boolean {
  if (entry.validFrom && dateKey < entry.validFrom) return false;
  if (entry.validUntil && dateKey > entry.validUntil) return false;
  return true;
}

/** The rows that apply on the Bangkok calendar date of `at`. */
export function entriesForDate(entries: OpeningHours[], at: Date): OpeningHours[] {
  const dateKey = bangkokDateKey(at);
  const dated = entries.filter((entry) => isDated(entry) && covers(entry, dateKey));
  return dated.length > 0 ? dated : entries.filter((entry) => !isDated(entry));
}

function entryForDay(entries: OpeningHours[], at: Date): OpeningHours | undefined {
  const day = bangkokDayOfWeek(at);
  return entriesForDate(entries, at).find((entry) => entry.daysOfWeek.includes(day));
}

function span(entry: OpeningHours): { opens: number; closes: number } | null {
  const opens = parseClockTime(entry.opens);
  const closes = parseClockTime(entry.closes);
  if (opens === null || closes === null) return null;
  return { opens, closes: closes <= opens ? closes + 1440 : closes };
}

/**
 * Whether `place` is open right now, computed only from its published
 * `openingHours`. Never inferred from category, name, or anything else: a
 * place with no hours configured is `noHours`, not a guess.
 */
export function getPlaceHoursStatus(place: CampusPlace, now: Date): PlaceHoursStatus {
  if (!place.openingHours || place.openingHours.length === 0) return { kind: "noHours" };

  const nowMinutes = bangkokMinutesOfDay(now);

  const yesterday = entryForDay(place.openingHours, new Date(now.getTime() - DAY_MS));
  const carried = yesterday ? span(yesterday) : null;
  if (yesterday && carried && carried.closes > 1440 && nowMinutes < carried.closes - 1440) {
    return { kind: "open", closes: formatClockTime(carried.closes), closesNextDay: false, note: yesterday.note };
  }

  const entry = entryForDay(place.openingHours, now);
  if (!entry) return { kind: "closed" };

  const today = span(entry);
  if (!today) return { kind: "closed", note: entry.note };

  if (nowMinutes >= today.opens && nowMinutes < today.closes) {
    return { kind: "open", closes: formatClockTime(today.closes), closesNextDay: today.closes > 1440, note: entry.note };
  }
  return {
    kind: "closed",
    opensNext: nowMinutes < today.opens ? formatClockTime(today.opens) : undefined,
    note: entry.note,
  };
}

/** Libraries are the places whose slug names them one. */
export function isLibrary(place: CampusPlace): boolean {
  return /(^|-)library(-|$)/.test(place.slug.current);
}

export type LibrariesSummary = {
  total: number;
  open: number;
  /** The open library that stays open longest. */
  latest?: { place: CampusPlace; closes: string; closesNextDay: boolean };
  /** With none open: the next to open today. */
  nextOpening?: { place: CampusPlace; opens: string };
};

/** How many of `libraries` are open now, and which closes last. */
export function summariseLibraries(libraries: CampusPlace[], now: Date): LibrariesSummary {
  const withHours = libraries.filter((place) => place.openingHours && place.openingHours.length > 0);
  const summary: LibrariesSummary = { total: withHours.length, open: 0 };
  let latestMinutes = -1;
  let nextMinutes = Infinity;
  for (const place of withHours) {
    const status: PlaceHoursStatus = place.closureNote ? { kind: "closed" } : getPlaceHoursStatus(place, now);
    if (status.kind === "open") {
      summary.open += 1;
      const minutes = (parseClockTime(status.closes) ?? 0) + (status.closesNextDay ? 1440 : 0);
      if (minutes > latestMinutes) {
        latestMinutes = minutes;
        summary.latest = { place, closes: status.closes, closesNextDay: status.closesNextDay };
      }
    } else if (status.kind === "closed" && status.opensNext) {
      const minutes = parseClockTime(status.opensNext) ?? Infinity;
      if (minutes < nextMinutes) {
        nextMinutes = minutes;
        summary.nextOpening = { place, opens: status.opensNext };
      }
    }
  }
  if (summary.open > 0) delete summary.nextOpening;
  return summary;
}
