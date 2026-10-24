/**
 * `<input type="datetime-local">` carries no time zone. Staff mean Thailand
 * time, which has no daylight saving, so a fixed +07:00 offset is exact.
 */

const OFFSET_MS = 7 * 60 * 60 * 1000;
const PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** "2026-10-23T14:30" in Bangkok time to a `Date`, or null if it is not a real moment. */
export function parseBangkokDateTime(value: string): Date | null {
  const m = PATTERN.exec(value.trim());
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number) as [number, number, number, number, number];
  const date = new Date(Date.UTC(y, mo - 1, d, h, mi) - OFFSET_MS);
  return formatBangkokDateTime(date) === value.trim() ? date : null;
}

/** A `Date` as the value a `datetime-local` input expects, in Bangkok time. Empty for null. */
export function formatBangkokDateTime(date: Date | string | null | undefined): string {
  if (!date) return "";
  const time = new Date(date).getTime();
  return Number.isNaN(time) ? "" : new Date(time + OFFSET_MS).toISOString().slice(0, 16);
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True for a real calendar date written "YYYY-MM-DD". */
export function isCalendarDate(value: string): boolean {
  const m = DATE_PATTERN.exec(value);
  if (!m) return false;
  const [y, mo, d] = m.slice(1).map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}
