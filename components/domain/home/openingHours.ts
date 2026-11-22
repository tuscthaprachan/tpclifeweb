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

function entriesForDay(entries: OpeningHours[], at: Date): OpeningHours[] {
  const day = bangkokDayOfWeek(at);
  return entriesForDate(entries, at).filter((entry) => entry.daysOfWeek.includes(day));
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

  for (const entry of entriesForDay(place.openingHours, new Date(now.getTime() - DAY_MS))) {
    const carried = span(entry);
    if (carried && carried.closes > 1440 && nowMinutes < carried.closes - 1440) {
      return { kind: "open", closes: formatClockTime(carried.closes), closesNextDay: false, note: entry.note };
    }
  }

  const today = entriesForDay(place.openingHours, now)
    .map((entry) => ({ entry, span: span(entry) }))
    .filter((item): item is { entry: OpeningHours; span: { opens: number; closes: number } } => item.span !== null)
    .sort((a, b) => a.span.opens - b.span.opens);
  if (today.length === 0) return { kind: "closed" };

  const current = today.find((item) => nowMinutes >= item.span.opens && nowMinutes < item.span.closes);
  if (current) {
    return { kind: "open", closes: formatClockTime(current.span.closes), closesNextDay: current.span.closes > 1440, note: current.entry.note };
  }
  const later = today.find((item) => nowMinutes < item.span.opens);
  return {
    kind: "closed",
    opensNext: later ? formatClockTime(later.span.opens) : undefined,
    note: (later ?? today[today.length - 1]!).entry.note,
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

export interface HoursSpan {
  opens: string;
  closes: string;
  /** Closes after midnight, on the next day. */
  overnight: boolean;
  note?: LocaleString;
}

export interface DayHours {
  dateKey: string;
  spans: HoursSpan[];
  /** Dated rows set these hours rather than the usual ones. */
  special: boolean;
}

function dayOfDateKey(dateKey: string): number {
  return new Date(`${dateKey}T00:00:00Z`).getUTCDay();
}

function addDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Every span that applies on a Bangkok calendar date, earliest first. */
export function hoursOnDate(entries: OpeningHours[], dateKey: string): DayHours {
  const dated = entries.filter((entry) => isDated(entry) && covers(entry, dateKey));
  const applying = dated.length > 0 ? dated : entries.filter((entry) => !isDated(entry));
  const day = dayOfDateKey(dateKey);
  const spans = applying
    .filter((entry) => entry.daysOfWeek.includes(day))
    .flatMap((entry): HoursSpan[] => {
      const s = span(entry);
      if (!s) return [];
      return [{ opens: formatClockTime(s.opens), closes: formatClockTime(s.closes % 1440), overnight: s.closes > 1440, note: entry.note }];
    })
    .sort((x, y) => (parseClockTime(x.opens) ?? 0) - (parseClockTime(y.opens) ?? 0));
  return { dateKey, spans, special: dated.length > 0 };
}

/** The hours for `count` days starting with today. */
export function hoursForDays(entries: OpeningHours[], now: Date, count = 7): DayHours[] {
  const today = bangkokDateKey(now);
  return Array.from({ length: count }, (_, i) => hoursOnDate(entries, addDays(today, i)));
}

export interface UsualHoursRow {
  days: number[];
  opens: string;
  closes: string;
  overnight: boolean;
  note?: LocaleString;
}

/** The undated rows, as entered, in the order of their first day (Monday first). */
export function usualHours(entries: OpeningHours[]): UsualHoursRow[] {
  const mondayFirst = (day: number) => (day + 6) % 7;
  return entries
    .filter((entry) => !isDated(entry))
    .flatMap((entry): UsualHoursRow[] => {
      const s = span(entry);
      if (!s || entry.daysOfWeek.length === 0) return [];
      const days = [...entry.daysOfWeek].sort((x, y) => mondayFirst(x) - mondayFirst(y));
      return [{ days, opens: formatClockTime(s.opens), closes: formatClockTime(s.closes % 1440), overnight: s.closes > 1440, note: entry.note }];
    })
    .sort((x, y) => mondayFirst(x.days[0]!) - mondayFirst(y.days[0]!) || (parseClockTime(x.opens) ?? 0) - (parseClockTime(y.opens) ?? 0));
}

export interface SpecialHoursRow extends UsualHoursRow {
  validFrom?: string;
  validUntil?: string;
}

/**
 * Dated rows that have not ended and start after the `afterDays` already
 * shown day by day, soonest first.
 */
export function upcomingSpecialHours(entries: OpeningHours[], now: Date, afterDays = 7): SpecialHoursRow[] {
  const today = bangkokDateKey(now);
  const shownUntil = addDays(today, afterDays - 1);
  const mondayFirst = (day: number) => (day + 6) % 7;
  return entries
    .filter((entry) => isDated(entry) && (!entry.validUntil || entry.validUntil >= today) && (entry.validFrom ?? today) > shownUntil)
    .flatMap((entry): SpecialHoursRow[] => {
      const s = span(entry);
      if (!s) return [];
      const days = [...entry.daysOfWeek].sort((x, y) => mondayFirst(x) - mondayFirst(y));
      return [
        {
          days,
          opens: formatClockTime(s.opens),
          closes: formatClockTime(s.closes % 1440),
          overnight: s.closes > 1440,
          note: entry.note,
          validFrom: entry.validFrom,
          validUntil: entry.validUntil,
        },
      ];
    })
    .sort((x, y) => (x.validFrom ?? "").localeCompare(y.validFrom ?? ""));
}

/** The next day, after today, on which the place opens, within `horizon` days. */
export function nextOpeningAfterToday(entries: OpeningHours[], now: Date, horizon = 30): { dateKey: string; opens: string } | null {
  const today = bangkokDateKey(now);
  for (let i = 1; i <= horizon; i += 1) {
    const day = hoursOnDate(entries, addDays(today, i));
    if (day.spans[0]) return { dateKey: day.dateKey, opens: day.spans[0].opens };
  }
  return null;
}

/** Minutes from now until a "HH:mm" closing time, today or after midnight. */
export function minutesUntilClock(time: string, nextDay: boolean, now: Date): number {
  const target = (parseClockTime(time) ?? 0) + (nextDay ? 1440 : 0);
  const current = bangkokMinutesOfDay(now);
  return Math.max(0, target < current ? target + 1440 - current : target - current);
}
