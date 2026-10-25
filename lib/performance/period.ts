/**
 * The reporting periods. The public page and the staff dashboard offer the
 * same three, chosen by a plain link (`?period=`) so they work without
 * JavaScript. Pure functions of the clock, so tests pin the date.
 *
 * `30d` is the last 30 days to now. `12m` is the current calendar month and
 * the eleven before it (Bangkok), so every month in a monthly table is whole
 * except the latest. `all` has no start.
 */

export const PERIODS = ["30d", "12m", "all"] as const;
export type Period = (typeof PERIODS)[number];
export const DEFAULT_PERIOD: Period = "12m";

export function parsePeriod(raw: string | string[] | undefined | null): Period {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return (PERIODS as readonly string[]).includes(value ?? "") ? (value as Period) : DEFAULT_PERIOD;
}

/** `from` is null for "all time". Both ends are inclusive instants. */
export interface Range {
  from: Date | null;
  to: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** Bangkok is UTC+7 all year. */
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

/** The first instant of the Bangkok calendar month `monthsBack` months before the one containing `now`. */
export function bangkokMonthStart(now: Date, monthsBack = 0): Date {
  const local = new Date(now.getTime() + BANGKOK_OFFSET_MS);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() - monthsBack, 1) - BANGKOK_OFFSET_MS);
}

export function rangeFor(period: Period, now: Date): Range {
  if (period === "30d") return { from: new Date(now.getTime() - 30 * DAY_MS), to: now };
  if (period === "12m") return { from: bangkokMonthStart(now, 11), to: now };
  return { from: null, to: now };
}

/** `YYYY-MM` in Bangkok. */
export function bangkokMonthKey(date: Date): string {
  const local = new Date(date.getTime() + BANGKOK_OFFSET_MS);
  return `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Every month key from `fromKey` to `toKey` inclusive, oldest first. */
export function monthKeysBetween(fromKey: string, toKey: string): string[] {
  const keys: string[] = [];
  let [y, m] = fromKey.split("-").map(Number) as [number, number];
  const [ty, tm] = toKey.split("-").map(Number) as [number, number];
  while (y < ty || (y === ty && m <= tm)) {
    keys.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return keys;
}
