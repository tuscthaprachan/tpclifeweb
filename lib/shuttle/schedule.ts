/**
 * Pure shuttle schedule engine. No React, no I/O, fully testable.
 *
 * There is no GPS feed and no API for the Thammasat Tha Prachan shuttle. Every time
 * this module computes comes from the timetable published in the CMS
 * (`ShuttleRoute.departures`), never from a live vehicle position. Callers
 * must label everything this returns as "scheduled" (`UI.scheduled`), never
 * "live", and must not animate it in a way that implies tracking. See
 * CONTRIBUTING.md's Honesty section and `ShuttleRoute.realtimeFeedUrl`'s
 * doc comment in `lib/content/types.ts`.
 *
 * All time maths happens in Asia/Bangkok, exclusively through
 * `lib/i18n/format.ts`. This file never reads the server's or the browser's
 * local timezone.
 */

import { bangkokDateKey, bangkokMinutesOfDay, formatClockTime, parseClockTime } from "@/lib/i18n/format";
import type { ServiceCalendar, ShuttleRoute, ShuttleStop } from "@/lib/content/types";

/**
 * How many days ahead `findNextServiceDate` will search before giving up.
 * Generous enough to span a semester break, small enough that a route with
 * no future service day (an expired `validUntil` and nothing scheduled after
 * it) resolves to `null` in a bounded amount of work rather than searching
 * forever.
 */
const MAX_LOOKAHEAD_DAYS = 400;

/** One origin departure, resolved to a particular stop. */
export interface StopDeparture {
  /** "HH:mm" the vehicle leaves the origin, Asia/Bangkok. */
  originTime: string;
  /** Minutes since midnight the vehicle leaves the origin, Asia/Bangkok. */
  originMinutesOfDay: number;
  /** "HH:mm" the vehicle reaches the requested stop (origin time plus that stop's `offsetMinutes`, or the origin time itself when no stop was given). */
  stopTime: string;
  /** Minutes since midnight the vehicle reaches the requested stop, Asia/Bangkok. */
  stopMinutesOfDay: number;
  /** Minutes from `now` until the vehicle reaches the requested stop. Never negative: `nextDepartures` only returns departures that have not yet reached the stop. */
  minutesUntil: number;
}

/** One configured departure, parsed and reformatted, independent of any particular day or `now`. */
export interface OriginDeparture {
  /** The raw "HH:mm" string as stored on the route. */
  raw: string;
  /** Minutes since midnight the vehicle leaves the origin. */
  minutesOfDay: number;
  /** "HH:mm", reformatted through `formatClockTime` so a malformed but parseable raw value (e.g. "7:5") still renders consistently. */
  time: string;
}

/**
 * The one discriminated union every caller renders from. Every branch is a
 * distinct, honest thing to tell a student, and TypeScript will not let a
 * `switch` over `kind` forget one:
 *
 * - `running`: the route operates today and at least one departure has not
 *   yet reached the requested stop. `departures` is never empty.
 * - `finishedForToday`: the route operates today, but every departure has
 *   already reached the requested stop.
 * - `notToday`: the route does not operate on today's Asia/Bangkok calendar
 *   date (weekend, excluded date, or outside the calendar's validity
 *   window).
 * - `noTimetable`: the route has no departures configured at all. This is
 *   the expected state for a freshly-created `shuttleRoute` document before
 *   an editor has transcribed the published timetable, and must be handled
 *   as a first-class state, not treated as an error.
 */
export type ShuttleStatus =
  | { kind: "running"; departures: StopDeparture[] }
  | { kind: "finishedForToday"; nextServiceDate: string | null }
  | { kind: "notToday"; nextServiceDate: string | null }
  | { kind: "noTimetable" };

/* ------------------------------------------------------------------ *
 * Calendar date-key arithmetic.
 *
 * A calendar date's day of the week is a property of the date itself, not
 * of a timezone: 10 August 2026 is a Monday everywhere on Earth. So once a
 * "YYYY-MM-DD" key has been produced from a real instant via
 * `bangkokDateKey`, every further step (advancing days, reading the day of
 * week) is plain date arithmetic and does not need to touch Asia/Bangkok, or
 * any timezone, again. Building the intermediate `Date` at UTC midnight
 * keeps that arithmetic free of local-timezone drift.
 * ------------------------------------------------------------------ */

function dateKeyToUtcDate(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
}

/**
 * Exported so UI code that needs "is this the very next service day"
 * (`ShuttlePanel`'s "first departure tomorrow" wording) can reuse this exact
 * arithmetic instead of reimplementing calendar-date maths in a component.
 */
export function addDaysToDateKey(dateKey: string, days: number): string {
  const date = dateKeyToUtcDate(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** 0 = Sunday through 6 = Saturday, matching `ServiceCalendar.daysOfWeek` and `Date#getDay`. */
function dayOfWeekFromDateKey(dateKey: string): number {
  return dateKeyToUtcDate(dateKey).getUTCDay();
}

function isServiceDay(calendar: ServiceCalendar, dateKey: string): boolean {
  // The validity window is the outer bound of the whole service (for
  // example a semester's dates). It takes priority over everything else,
  // including addedDates: an exception date only makes sense inside the
  // period the service actually exists.
  if (calendar.validFrom && dateKey < calendar.validFrom) return false;
  if (calendar.validUntil && dateKey > calendar.validUntil) return false;

  if (calendar.excludedDates?.includes(dateKey)) return false;
  if (calendar.addedDates?.includes(dateKey)) return true;

  return calendar.daysOfWeek.includes(dayOfWeekFromDateKey(dateKey));
}

/** Whether `route` operates on the Asia/Bangkok calendar date of `now`. */
export function isRunningToday(route: ShuttleRoute, now: Date): boolean {
  return isServiceDay(route.calendar, bangkokDateKey(now));
}

/**
 * The next Asia/Bangkok date ("YYYY-MM-DD") on or after `startOffsetDays`
 * days from the Bangkok calendar date of `now` on which `route` operates.
 *
 * Returns `null` if none is found within the lookahead window. That is an
 * honest answer, not a bug: a route whose `validUntil` has passed with no
 * `addedDates` beyond it genuinely has no next service date.
 */
export function findNextServiceDate(route: ShuttleRoute, now: Date, startOffsetDays = 0): string | null {
  const startKey = addDaysToDateKey(bangkokDateKey(now), startOffsetDays);
  for (let offset = 0; offset <= MAX_LOOKAHEAD_DAYS; offset += 1) {
    const candidate = addDaysToDateKey(startKey, offset);
    if (isServiceDay(route.calendar, candidate)) return candidate;
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * Departures.
 * ------------------------------------------------------------------ */

function stopOffset(stop: ShuttleStop | undefined): number {
  return stop?.offsetMinutes ?? 0;
}

/**
 * Every departure configured on `route`, parsed and reformatted, in the
 * order they are stored (the schema guarantees ascending). Malformed
 * "HH:mm" entries are skipped rather than thrown on: this is a pure function
 * over stored content, and content that has not yet passed validation
 * should degrade, not crash a render.
 */
export function originDepartures(route: ShuttleRoute): OriginDeparture[] {
  const result: OriginDeparture[] = [];
  for (const raw of route.departures) {
    const minutesOfDay = parseClockTime(raw);
    if (minutesOfDay === null) continue;
    result.push({ raw, minutesOfDay, time: formatClockTime(minutesOfDay) });
  }
  return result;
}

/** The Asia/Bangkok minute-of-day and "HH:mm" a departure reaches `stop`, given the minute-of-day it leaves the origin. Omit `stop` (or pass the origin stop, whose `offsetMinutes` is 0) to get the origin time back. */
export function resolveStopTime(originMinutesOfDay: number, stop?: ShuttleStop): { minutesOfDay: number; time: string } {
  const minutesOfDay = originMinutesOfDay + stopOffset(stop);
  return { minutesOfDay, time: formatClockTime(minutesOfDay) };
}

/**
 * The next `count` departures of `route`, resolved to `stop` (the origin, if
 * omitted), that have not yet reached that stop as of `now`.
 *
 * Only considers today's Asia/Bangkok timetable: it does not roll over to
 * tomorrow's first departure. An empty result here can therefore mean either
 * "finished for today" or "not a service day today"; `getShuttleStatus`
 * disambiguates those with `findNextServiceDate`.
 */
export function nextDepartures(route: ShuttleRoute, now: Date, count: number, stop?: ShuttleStop): StopDeparture[] {
  if (count <= 0 || !isRunningToday(route, now)) return [];

  const nowMinutes = bangkokMinutesOfDay(now);
  const offset = stopOffset(stop);
  const results: StopDeparture[] = [];

  for (const departure of originDepartures(route)) {
    const stopMinutesOfDay = departure.minutesOfDay + offset;
    if (stopMinutesOfDay < nowMinutes) continue;

    results.push({
      originTime: departure.time,
      originMinutesOfDay: departure.minutesOfDay,
      stopTime: formatClockTime(stopMinutesOfDay),
      stopMinutesOfDay,
      minutesUntil: stopMinutesOfDay - nowMinutes,
    });
    if (results.length >= count) break;
  }

  return results;
}

/**
 * The single entry point every UI component should call. Combines
 * `isRunningToday`, `nextDepartures` and `findNextServiceDate` into the
 * discriminated union described on `ShuttleStatus`, so a component cannot
 * forget a case.
 */
export function getShuttleStatus(route: ShuttleRoute, now: Date, options: { stop?: ShuttleStop; count?: number } = {}): ShuttleStatus {
  if (route.departures.length === 0) return { kind: "noTimetable" };

  const { stop, count = 3 } = options;

  if (!isRunningToday(route, now)) {
    return { kind: "notToday", nextServiceDate: findNextServiceDate(route, now, 1) };
  }

  const departures = nextDepartures(route, now, count, stop);
  if (departures.length === 0) {
    return { kind: "finishedForToday", nextServiceDate: findNextServiceDate(route, now, 1) };
  }

  return { kind: "running", departures };
}
