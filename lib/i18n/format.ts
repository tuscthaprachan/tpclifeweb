/**
 * Date, time and number formatting.
 *
 * Everything on this site happens in Asia/Bangkok. A student reading the page
 * from abroad still needs to know when the shuttle leaves Thammasat Tha Prachan, not when
 * it leaves in their own timezone, so every format here pins the zone
 * explicitly rather than trusting the device.
 *
 * Thai dates use the Buddhist calendar, which is what Thai readers expect on an
 * official page. English dates use the Gregorian calendar. This is a real
 * difference between the two locales, not a translation.
 *
 * This file is a shared contract. Treat it as fixed.
 */

import { TIME_ZONE, type Locale } from "./config";

const LOCALE_TAG: Record<Locale, string> = {
  // -u-ca-buddhist selects the Buddhist era, so 2026 renders as 2569.
  th: "th-TH-u-ca-buddhist",
  en: "en-GB",
};

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

/** "7 สิงหาคม 2569" / "7 August 2026" */
export function formatDate(value: string | Date, locale: Locale): string {
  return new Intl.DateTimeFormat(LOCALE_TAG[locale], {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TIME_ZONE,
  }).format(toDate(value));
}

/** "7 ส.ค. 2569" / "7 Aug 2026" */
export function formatDateShort(value: string | Date, locale: Locale): string {
  return new Intl.DateTimeFormat(LOCALE_TAG[locale], {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: TIME_ZONE,
  }).format(toDate(value));
}

/** "14:30". 24 hour in both languages, because a timetable is not ambiguous. */
export function formatTime(value: string | Date, locale: Locale): string {
  return new Intl.DateTimeFormat(LOCALE_TAG[locale], {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: TIME_ZONE,
  }).format(toDate(value));
}

export function formatDateTime(value: string | Date, locale: Locale): string {
  return `${formatDate(value, locale)} ${formatTime(value, locale)}`;
}

/** Weekday name, for timetables and opening hours. */
export function formatWeekday(value: string | Date, locale: Locale, style: "long" | "short" = "long"): string {
  return new Intl.DateTimeFormat(LOCALE_TAG[locale], {
    weekday: style,
    timeZone: TIME_ZONE,
  }).format(toDate(value));
}

/**
 * The machine-readable value for a `<time datetime="">` attribute. Always the
 * full ISO instant, regardless of how the visible text is formatted, so
 * assistive technology and search engines get something unambiguous.
 */
export function isoDateTime(value: string | Date): string {
  return toDate(value).toISOString();
}

/**
 * "3 เดือนที่แล้ว" / "3 months ago".
 *
 * Used on the policy dashboard so a stale item reads as stale. Deliberately
 * coarse: the point is to make neglect visible, not to be precise.
 */
export function formatRelative(value: string | Date, locale: Locale, now: Date = new Date()): string {
  const then = toDate(value);
  const seconds = Math.round((then.getTime() - now.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
  ];

  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) {
      return rtf.format(Math.round(seconds / size), unit);
    }
  }
  return rtf.format(0, "minute");
}

/**
 * A duration in minutes, said the way a person would say it.
 * 90 becomes "1 ชั่วโมง 30 นาที" / "1 hr 30 min".
 */
export function formatDuration(totalMinutes: number, locale: Locale): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const hourLabel = locale === "th" ? "ชั่วโมง" : "hr";
  const minuteLabel = locale === "th" ? "นาที" : "min";

  if (hours === 0) return `${minutes} ${minuteLabel}`;
  if (minutes === 0) return `${hours} ${hourLabel}`;
  return `${hours} ${hourLabel} ${minutes} ${minuteLabel}`;
}

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(LOCALE_TAG[locale]).format(value);
}

/**
 * Today's date in Asia/Bangkok as YYYY-MM-DD, regardless of where the server
 * or the reader's device happens to be. The shuttle schedule engine depends on
 * this being the campus date and not UTC's date.
 */
export function bangkokDateKey(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: TIME_ZONE,
  }).format(now);
  return parts;
}

/** Minutes since midnight in Asia/Bangkok. Used to find the next departure. */
export function bangkokMinutesOfDay(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: TIME_ZONE,
  }).formatToParts(now);

  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

/** Day of week in Asia/Bangkok, 0 = Sunday, matching ServiceCalendar. */
export function bangkokDayOfWeek(now: Date = new Date()): number {
  const short = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: TIME_ZONE,
  }).format(now);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(short);
}

/** Parses "HH:mm" into minutes since midnight. Returns null if malformed. */
export function parseClockTime(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

/** Formats minutes since midnight back to "HH:mm". */
export function formatClockTime(minutesOfDay: number): string {
  const wrapped = ((minutesOfDay % 1440) + 1440) % 1440;
  const hour = Math.floor(wrapped / 60);
  const minute = wrapped % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
