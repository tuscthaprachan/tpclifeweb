import { TIME_ZONE, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { bangkokDateKey, formatTime, formatWeekday } from "@/lib/i18n/format";

const DAY_MS = 86_400_000;

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");
}

function dayIndex(key: string): number {
  return Math.round(Date.parse(`${key}T00:00:00Z`) / DAY_MS);
}

function dayAndMonth(value: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", { day: "numeric", month: "long", timeZone: TIME_ZONE }).format(value);
}

function atPhrase(value: Date, now: Date, locale: Locale): string {
  const time = formatTime(value, locale);
  const diff = dayIndex(bangkokDateKey(value)) - dayIndex(bangkokDateKey(now));
  if (diff === 0) return fill(UI.sabToday[locale], { time });
  if (diff === 1) return fill(UI.sabTomorrow[locale], { time });
  const date = fill(UI.sabDate[locale], { weekday: formatWeekday(value, locale), day: dayAndMonth(value, locale) });
  return fill(UI.sabOnDate[locale], { date, time });
}

/**
 * The alert window as a person would say it, in Bangkok time:
 * "Until 20:30 today", "Until Monday 24 November, 20:30",
 * "From 06:00 today until 20:30".
 */
export function alertTimePhrase(startsAt: string | Date, endsAt: string | Date | null | undefined, locale: Locale, now: Date = new Date()): string {
  const start = new Date(startsAt);
  const end = endsAt ? new Date(endsAt) : null;
  const started = start.getTime() <= now.getTime();

  if (end && end.getTime() < now.getTime()) return fill(UI.sabEnded[locale], { end: atPhrase(end, now, locale) });
  if (started) return end ? fill(UI.sabUntil[locale], { end: atPhrase(end, now, locale) }) : UI.sabOngoing[locale];
  if (!end) return fill(UI.sabFromOnly[locale], { start: atPhrase(start, now, locale) });

  const sameDay = bangkokDateKey(start) === bangkokDateKey(end);
  return fill(UI.sabFrom[locale], { start: atPhrase(start, now, locale), end: sameDay ? formatTime(end, locale) : atPhrase(end, now, locale) });
}
