import { fillText } from "@/components/domain/open-data/fill";
import { DataTable, StatusTag } from "@/components/ui";
import { pick, type Locale } from "@/lib/i18n/config";
import { bangkokDateKey, formatDuration } from "@/lib/i18n/format";
import { UI } from "@/lib/i18n/strings";
import type { CampusPlace, OpeningHours } from "@/lib/content/types";
import {
  getPlaceHoursStatus,
  hoursForDays,
  hoursOnDate,
  minutesUntilClock,
  nextOpeningAfterToday,
  usualHours,
  type DayHours,
  type PlaceHoursStatus,
  type SpecialHoursRow,
  type UsualHoursRow,
} from "@/components/domain/home/openingHours";
import { formatDateKey, formatDateRange, formatDays, formatSpan } from "./format";

export function placeStatus(place: CampusPlace, now: Date): PlaceHoursStatus {
  return place.closureNote ? { kind: "closed", note: place.closureNote } : getPlaceHoursStatus(place, now);
}

export function PlaceStatusTag({ locale, status }: { locale: Locale; status: PlaceHoursStatus }) {
  if (status.kind === "open") return <StatusTag tone="success" label={UI.openNow[locale]} />;
  if (status.kind === "closed") return <StatusTag tone="neutral" label={UI.closedNow[locale]} />;
  return null;
}

/** One line under the status: when it closes, or when it next opens. */
export function placeStatusLine(place: CampusPlace, status: PlaceHoursStatus, now: Date, locale: Locale): string {
  if (status.kind === "noHours") return UI.tdHoursNotPublished[locale];
  if (status.kind === "open") {
    const time = status.closesNextDay ? fillText(UI.homeClosesTomorrow[locale], { time: status.closes }) : `${UI.closesAt[locale]} ${status.closes}`;
    return `${time}, ${fillText(UI.tdClosesIn[locale], { time: formatDuration(minutesUntilClock(status.closes, status.closesNextDay, now), locale) })}`;
  }
  if (status.opensNext) return fillText(UI.tdOpensLater[locale], { time: status.opensNext });
  const next = place.openingHours ? nextOpeningAfterToday(place.openingHours, now) : null;
  if (!next) return UI.tdNoMoreToday[locale];
  return fillText(UI.tdNextOpen[locale], { day: formatDateKey(next.dateKey, locale), time: next.opens });
}

export function todayHoursText(entries: OpeningHours[] | undefined, now: Date, locale: Locale): string {
  if (!entries || entries.length === 0) return UI.tdHoursNotPublished[locale];
  const day = hoursOnDate(entries, bangkokDateKey(now));
  if (day.spans.length === 0) return UI.tdClosedToday[locale];
  return day.spans.map((span) => formatSpan(span, locale)).join(", ");
}

function spansCell(day: DayHours, locale: Locale) {
  if (day.spans.length === 0) return UI.tdClosedToday[locale];
  return day.spans.map((span) => formatSpan(span, locale)).join(", ");
}

function notesOf(day: DayHours, locale: Locale): string {
  const notes = day.spans.map((span) => (span.note ? pick(span.note, locale) : "")).filter(Boolean);
  const parts = day.special ? [UI.tdSpecialHours[locale], ...notes] : notes;
  return parts.join(". ");
}

/** The next seven days, today first and marked, so special hours land on real dates. */
export function NextDaysTable({ locale, entries, now, caption }: { locale: Locale; entries: OpeningHours[]; now: Date; caption?: string }) {
  const days = hoursForDays(entries, now);
  const hasNotes = days.some((day) => notesOf(day, locale));
  return (
    <DataTable
      caption={caption ?? UI.tdNext7DaysCaption[locale]}
      rows={days}
      getRowKey={(day) => day.dateKey}
      columns={[
        {
          id: "day",
          header: UI.tdDay[locale],
          rowHeader: true,
          cell: (day) =>
            day.dateKey === days[0]!.dateKey ? (
              <strong>
                {UI.tdToday[locale]}, {formatDateKey(day.dateKey, locale)}
              </strong>
            ) : (
              formatDateKey(day.dateKey, locale)
            ),
        },
        { id: "hours", header: UI.tdHours[locale], cell: (day) => (day.dateKey === days[0]!.dateKey ? <strong>{spansCell(day, locale)}</strong> : spansCell(day, locale)) },
        ...(hasNotes ? [{ id: "note", header: UI.tdNote[locale], cell: (day: DayHours) => notesOf(day, locale) }] : []),
      ]}
    />
  );
}

export function UsualHoursTable({ locale, entries }: { locale: Locale; entries: OpeningHours[] }) {
  const rows = usualHours(entries);
  if (rows.length === 0) return null;
  const hasNotes = rows.some((row) => row.note);
  return (
    <DataTable
      caption={UI.tdUsualHoursCaption[locale]}
      rows={rows}
      getRowKey={(row) => `${row.days.join("")}-${row.opens}`}
      columns={[
        { id: "days", header: UI.tdDay[locale], rowHeader: true, cell: (row: UsualHoursRow) => formatDays(row.days, locale) },
        { id: "hours", header: UI.tdHours[locale], cell: (row: UsualHoursRow) => formatSpan(row, locale) },
        ...(hasNotes ? [{ id: "note", header: UI.tdNote[locale], cell: (row: UsualHoursRow) => (row.note ? pick(row.note, locale) : "") }] : []),
      ]}
    />
  );
}

export function SpecialHoursList({ locale, rows }: { locale: Locale; rows: SpecialHoursRow[] }) {
  return (
    <ul className="m-0 flex flex-col gap-[var(--space-2)] p-0" style={{ listStyle: "none" }}>
      {rows.map((row) => (
        <li key={`${row.validFrom}-${row.validUntil}-${row.days.join("")}-${row.opens}`} className="border-b border-line pb-[var(--space-2)]">
          <strong className="block">{formatDateRange(row.validFrom, row.validUntil, locale)}</strong>
          <span className="text-ink-900">
            {formatDays(row.days, locale)}: {formatSpan(row, locale)}
          </span>
          {row.note ? <span className="block text-ink-600">{pick(row.note, locale)}</span> : null}
        </li>
      ))}
    </ul>
  );
}
