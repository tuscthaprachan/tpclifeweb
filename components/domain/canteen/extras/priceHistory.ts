/**
 * The price tracker's maths. Pure: no I/O, no clock.
 *
 * SEMESTERS. Thai university semesters, by the calendar month a survey falls in:
 *
 *   semester 1   August to December   (starts the academic year)
 *   semester 2   January to May       (the same academic year)
 *   summer       June to July         (the same academic year)
 *
 * An academic year is named after the Gregorian year its semester 1 starts
 * in, so January to July 2027 belongs to the academic year that began in
 * August 2026. Labels:
 *
 *   Thai     "1/2569", "2/2569", "ฤดูร้อน/2569"   (Buddhist year, which is the Gregorian year plus 543)
 *   English  "1/2026-27", "2/2026-27", "Summer/2026-27"
 *
 * Months are read from the "YYYY-MM-DD" string itself. A survey date is a
 * calendar day on the Bangkok wall, so no time zone conversion is needed or
 * wanted.
 *
 * HONESTY. Only surveyed figures are used, each with its date. A semester
 * with no survey has NO value: nothing is carried forward, interpolated or
 * projected. The median for a semester only counts dishes surveyed in that
 * semester, and says how many.
 */

import { ricePlates } from "@/lib/canteen/derive";
import type { Locale } from "@/lib/i18n/config";
import type { CanteenData, CanteenDish, DishPriceRecord } from "@/lib/sanity/types";

/** 1 and 2 are the two main semesters, 3 is the summer session. */
export type Term = 1 | 2 | 3;

export interface Semester {
  /** Gregorian year the academic year starts in (semester 1's year). */
  academicYear: number;
  term: Term;
}

/** The Buddhist era is the Gregorian year plus 543. */
export const BUDDHIST_OFFSET = 543;

/** The semester a "YYYY-MM-DD" date falls in, or null when the date cannot be read. */
export function semesterOf(dateKey: string): Semester | null {
  const match = /^(\d{4})-(\d{2})-\d{2}/.exec(dateKey);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  if (month >= 8) return { academicYear: year, term: 1 };
  if (month >= 6) return { academicYear: year - 1, term: 3 };
  return { academicYear: year - 1, term: 2 };
}

/** Chronological position within an academic year: semester 1, then 2, then summer. */
const TERM_ORDER: Record<Term, number> = { 1: 0, 2: 1, 3: 2 };

/** A number that sorts semesters in time order. Equal for equal semesters. */
export function semesterRank(semester: Semester): number {
  return semester.academicYear * 3 + TERM_ORDER[semester.term];
}

export function compareSemesters(a: Semester, b: Semester): number {
  return semesterRank(a) - semesterRank(b);
}

/** A stable key, for example "2026-1". */
export function semesterKey(semester: Semester): string {
  return `${semester.academicYear}-${semester.term}`;
}

/** "1/2569" in Thai, "1/2026-27" in English. Summer is "ฤดูร้อน/2569" and "Summer/2026-27". */
export function semesterLabel(semester: Semester, locale: Locale): string {
  const termWord = semester.term === 3 ? (locale === "th" ? "ฤดูร้อน" : "Summer") : String(semester.term);
  if (locale === "th") return `${termWord}/${semester.academicYear + BUDDHIST_OFFSET}`;
  const next = String((semester.academicYear + 1) % 100).padStart(2, "0");
  return `${termWord}/${semester.academicYear}-${next}`;
}

/* ------------------------------------------------------------------ *
 * Per dish
 * ------------------------------------------------------------------ */

export interface PricePoint {
  price: number;
  /** "YYYY-MM-DD". */
  checkedOn: string;
}

/**
 * Every surveyed price of one dish, oldest first, one per survey date. The
 * dish's current price and date count as a survey even when the history
 * array does not repeat it, so a dish with an empty history still has its
 * one known point. If the history and the current price disagree about the
 * same day, the history wins because it is the append-only record.
 */
export function dishPricePoints(dish: CanteenDish): PricePoint[] {
  const byDate = new Map<string, number>();
  for (const record of dish.priceHistory ?? ([] as DishPriceRecord[])) {
    if (record?.checkedOn && Number.isFinite(record.price)) byDate.set(record.checkedOn, record.price);
  }
  if (dish.checkedOn && Number.isFinite(dish.price) && !byDate.has(dish.checkedOn)) {
    byDate.set(dish.checkedOn, dish.price);
  }
  return [...byDate.entries()]
    .map(([checkedOn, price]) => ({ checkedOn, price }))
    .sort((a, b) => a.checkedOn.localeCompare(b.checkedOn));
}

/** The price of a dish as last surveyed within one semester, or null when it was not surveyed in it. */
export function priceInSemester(dish: CanteenDish, semester: Semester): number | null {
  let found: PricePoint | null = null;
  for (const point of dishPricePoints(dish)) {
    const own = semesterOf(point.checkedOn);
    if (own && compareSemesters(own, semester) === 0) found = point;
  }
  return found ? found.price : null;
}

/** True when a dish has at least two surveyed prices, so a history is worth drawing. */
export function hasHistory(dishes: readonly CanteenDish[]): boolean {
  return dishes.some((dish) => dishPricePoints(dish).length >= 2);
}

/* ------------------------------------------------------------------ *
 * Per semester
 * ------------------------------------------------------------------ */

export interface SemesterMedian {
  semester: Semester;
  /** Median of the plates surveyed in this semester. Can end in .5. */
  median: number;
  /** How many plates were surveyed in the semester. */
  count: number;
  /** The newest survey date inside the semester, "YYYY-MM-DD". */
  latestCheckedOn: string;
}

/** Median of a non-empty list. With an even count, the mean of the two middle values. */
export function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/**
 * The median price of a plate of rice in each semester that has any survey,
 * oldest first. Rice plates are the dishes `ricePlates` picks (a main course
 * of a rice type). Each dish contributes the price it was last surveyed at
 * within the semester.
 */
export function ricePlateMedians(data: CanteenData): SemesterMedian[] {
  const plates = ricePlates(data);
  const buckets = new Map<string, { semester: Semester; prices: number[]; latest: string }>();

  for (const dish of plates) {
    const lastInSemester = new Map<string, PricePoint & { semester: Semester }>();
    for (const point of dishPricePoints(dish)) {
      const semester = semesterOf(point.checkedOn);
      if (semester) lastInSemester.set(semesterKey(semester), { ...point, semester });
    }
    for (const [key, point] of lastInSemester) {
      const bucket = buckets.get(key) ?? { semester: point.semester, prices: [], latest: point.checkedOn };
      bucket.prices.push(point.price);
      if (point.checkedOn > bucket.latest) bucket.latest = point.checkedOn;
      buckets.set(key, bucket);
    }
  }

  return [...buckets.values()]
    .sort((a, b) => compareSemesters(a.semester, b.semester))
    .map((bucket) => ({
      semester: bucket.semester,
      median: median(bucket.prices),
      count: bucket.prices.length,
      latestCheckedOn: bucket.latest,
    }));
}

/**
 * The hub's one-line comparison: the first and the latest semester that has
 * a surveyed median. Null unless at least two semesters exist, because one
 * figure is not a trend.
 */
export function ricePlateSummary(medians: readonly SemesterMedian[]): { first: SemesterMedian; latest: SemesterMedian } | null {
  if (medians.length < 2) return null;
  return { first: medians[0]!, latest: medians[medians.length - 1]! };
}

/* ------------------------------------------------------------------ *
 * Chart rows
 * ------------------------------------------------------------------ */

/** One plotted and tabulated point. */
export interface ChartPoint {
  /** Short axis label, for example "1/2569" or "Aug 26". */
  label: string;
  value: number;
  /** "YYYY-MM-DD", the survey date the value is dated by. */
  checkedOn: string;
  /** Extra text for the table, for example "12 plates". */
  note?: string;
}

/** Month and two digit year, in the locale's calendar: "ส.ค. 69" / "Aug 26". */
export function monthYearLabel(dateKey: string, locale: Locale): string {
  const date = new Date(`${dateKey.slice(0, 10)}T12:00:00Z`);
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH-u-ca-buddhist" : "en-GB", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).format(date);
}
