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
 */

import { bangkokDayOfWeek, bangkokMinutesOfDay, formatClockTime, parseClockTime } from "@/lib/i18n/format";
import type { CampusPlace, LocaleString, OpeningHours } from "@/lib/sanity/types";

export type PlaceHoursStatus =
  | { kind: "open"; closes: string; note?: LocaleString }
  | { kind: "closed"; opensNext?: string; note?: LocaleString }
  | { kind: "noHours" };

function todaysEntry(place: CampusPlace, now: Date): OpeningHours | undefined {
  const day = bangkokDayOfWeek(now);
  return place.openingHours?.find((entry) => entry.daysOfWeek.includes(day));
}

/**
 * Whether `place` is open right now, computed only from its published
 * weekly `openingHours`. Never inferred from category, name, or anything
 * else: a place with no hours configured is `noHours`, not a guess.
 */
export function getPlaceHoursStatus(place: CampusPlace, now: Date): PlaceHoursStatus {
  if (!place.openingHours || place.openingHours.length === 0) return { kind: "noHours" };

  const entry = todaysEntry(place, now);
  if (!entry) return { kind: "closed" };

  const opensMinutes = parseClockTime(entry.opens);
  const closesMinutes = parseClockTime(entry.closes);
  if (opensMinutes === null || closesMinutes === null) return { kind: "closed", note: entry.note };

  const nowMinutes = bangkokMinutesOfDay(now);
  if (nowMinutes >= opensMinutes && nowMinutes < closesMinutes) {
    return { kind: "open", closes: formatClockTime(closesMinutes), note: entry.note };
  }
  return {
    kind: "closed",
    opensNext: nowMinutes < opensMinutes ? formatClockTime(opensMinutes) : undefined,
    note: entry.note,
  };
}
