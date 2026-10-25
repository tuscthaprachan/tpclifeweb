/**
 * Working days for response targets: Monday to Friday in Bangkok time. Public
 * holidays are not modelled (there is no holiday calendar in the system yet),
 * so a target can be a day or two shorter than a desk expects around a
 * holiday. A target falls due at the END of its working day, 23:59:59 in
 * Bangkok, so "within 2 working days" never expires mid-afternoon.
 *
 * Bangkok has no daylight saving (UTC+7 all year), so the arithmetic is on a
 * fixed offset. Pure functions of their inputs; pass `now` in tests.
 */

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Midnight at the start of the Bangkok day containing `at`, as a UTC instant. */
function startOfBangkokDay(at: Date): number {
  const local = at.getTime() + BANGKOK_OFFSET_MS;
  return Math.floor(local / DAY_MS) * DAY_MS - BANGKOK_OFFSET_MS;
}

/** 0 = Sunday ... 6 = Saturday, in Bangkok. */
function bangkokWeekday(dayStart: number): number {
  return new Date(dayStart + BANGKOK_OFFSET_MS).getUTCDay();
}

function isWorkingDay(dayStart: number): boolean {
  const d = bangkokWeekday(dayStart);
  return d !== 0 && d !== 6;
}

/**
 * The end of the `days`th working day after `from`. A submission on a Saturday
 * counts from Monday, so "1 working day" from Saturday is the end of Monday
 * (the first working day after it starts on Monday and ends the same day).
 */
export function addWorkingDays(from: Date, days: number): Date {
  let day = startOfBangkokDay(from);
  let left = Math.max(0, Math.floor(days));
  while (left > 0) {
    day += DAY_MS;
    if (isWorkingDay(day)) left -= 1;
  }
  // `days` of 0 means the end of the same day.
  return new Date(day + DAY_MS - 1000);
}

/**
 * Working days after `from`'s day up to and including `to`'s day; negative
 * when `to` is on an earlier day. Zero on the same day.
 */
export function workingDaysUntil(from: Date, to: Date): number {
  const a = startOfBangkokDay(from);
  const b = startOfBangkokDay(to);
  const [lo, hi, sign] = b >= a ? [a, b, 1] : [b, a, -1];
  let count = 0;
  for (let day = lo + DAY_MS; day <= hi; day += DAY_MS) if (isWorkingDay(day)) count += 1;
  return sign * count;
}
