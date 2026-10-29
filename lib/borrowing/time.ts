/**
 * Bangkok calendar arithmetic for loans. Bangkok is UTC+7 all year, so a
 * fixed offset is exact. Day keys are `YYYY-MM-DD`; times are `HH:MM`.
 */

import { DESK_CLOSES, DESK_DAYS, DESK_OPENS, SLOT_MINUTES } from "./constants";

const OFFSET_MS = 7 * 60 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;

const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isDayKey(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const m = DAY_KEY.exec(value);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
}

/** The Bangkok day containing `at`. */
export function dayKeyOf(at: Date): string {
  return new Date(at.getTime() + OFFSET_MS).toISOString().slice(0, 10);
}

/** Midnight at the start of a Bangkok day, as an instant. */
export function dayStart(key: string): Date {
  return new Date(Date.parse(`${key}T00:00:00Z`) - OFFSET_MS);
}

export function addDays(key: string, days: number): string {
  return new Date(Date.parse(`${key}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** 0 = Sunday ... 6 = Saturday. */
export function weekdayOf(key: string): number {
  return new Date(`${key}T00:00:00Z`).getUTCDay();
}

export function isDeskDay(key: string): boolean {
  return DESK_DAYS.includes(weekdayOf(key));
}

/** A Bangkok day and time as an instant, or null if either is malformed. */
export function bangkokInstant(day: string, time: string): Date | null {
  if (!isDayKey(day) || !TIME.test(time)) return null;
  return new Date(Date.parse(`${day}T${time}:00Z`) - OFFSET_MS);
}

/** The Bangkok `HH:MM` of an instant. */
export function timeOf(at: Date): string {
  return new Date(at.getTime() + OFFSET_MS).toISOString().slice(11, 16);
}

function minutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h! * 60 + m!;
}

/** The collection and return times offered at the desk, `HH:MM`. */
export function deskSlots(): string[] {
  const out: string[] = [];
  for (let t = minutes(DESK_OPENS); t <= minutes(DESK_CLOSES); t += SLOT_MINUTES) {
    out.push(`${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`);
  }
  return out;
}

/**
 * The first day a request made at `now` may collect on: `workingDays` desk
 * days after today, so a request on Monday with 3 days' notice collects on
 * Thursday at the earliest. Public holidays are not modelled.
 */
export function earliestCollectionDay(now: Date, workingDays: number): string {
  let key = dayKeyOf(now);
  let left = Math.max(0, workingDays);
  if (left === 0) return key;
  while (left > 0) {
    key = addDays(key, 1);
    if (isDeskDay(key)) left -= 1;
  }
  return key;
}

/** `YYYY-MM` of a day key. */
export function monthKeyOf(day: string): string {
  return day.slice(0, 7);
}

export function isMonthKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

/** Every day key in a month. */
export function daysOfMonth(month: string): string[] {
  const [y, m] = month.split("-").map(Number);
  const count = new Date(Date.UTC(y!, m!, 0)).getUTCDate();
  return Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
}

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y!, m! - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}
