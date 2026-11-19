import { fillText } from "@/components/domain/open-data/fill";
import type { Locale } from "@/lib/i18n/config";
import { formatDate, formatWeekday } from "@/lib/i18n/format";
import { UI } from "@/lib/i18n/strings";

const SUNDAY = "2024-01-07";

function dayName(day: number, locale: Locale): string {
  const date = new Date(`${SUNDAY}T12:00:00+07:00`);
  date.setUTCDate(date.getUTCDate() + day);
  return formatWeekday(date, locale);
}

/** Days of the week as a person says them: "Every day", "Monday to Friday", "Saturday, Sunday". */
export function formatDays(days: readonly number[], locale: Locale): string {
  const set = new Set(days);
  if (set.size === 7) return UI.tdEveryDay[locale];
  const order = [1, 2, 3, 4, 5, 6, 0].filter((day) => set.has(day));
  const runs: number[][] = [];
  for (const day of order) {
    const last = runs[runs.length - 1];
    const prev = last?.[last.length - 1];
    if (last && prev !== undefined && (prev + 1) % 7 === day && day !== 1) last.push(day);
    else runs.push([day]);
  }
  return runs
    .map((run) =>
      run.length >= 3 ? fillText(UI.tdDaySpan[locale], { from: dayName(run[0]!, locale), to: dayName(run[run.length - 1]!, locale) }) : run.map((d) => dayName(d, locale)).join(", "),
    )
    .join(", ");
}

export function formatSpan(span: { opens: string; closes: string; overnight: boolean }, locale: Locale): string {
  return fillText(UI[span.overnight ? "tdUntilNextDay" : "tdTimeRange"][locale], { opens: span.opens, closes: span.closes });
}

/** "Thursday 19 November 2026" for a Bangkok date key. */
export function formatDateKey(dateKey: string, locale: Locale): string {
  const at = `${dateKey}T12:00:00+07:00`;
  return `${formatWeekday(at, locale)} ${formatDate(at, locale)}`;
}

export function formatDateRange(from: string | undefined, until: string | undefined, locale: Locale): string {
  const f = from ? formatDate(`${from}T12:00:00+07:00`, locale) : "";
  const u = until ? formatDate(`${until}T12:00:00+07:00`, locale) : "";
  if (f && u) return fillText(UI.tdDateRange[locale], { from: f, until: u });
  if (f) return fillText(UI.tdFromDate[locale], { from: f });
  return fillText(UI.tdUntilDate[locale], { until: u });
}
