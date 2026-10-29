import type { ReactNode } from "react";
import type { HeadingLevel } from "@/lib/a11y";
import { Button, Heading, InsetText, StatusTag, Tag, type StatusTone } from "@/components/ui";
import type { CalendarDay, DayBooking, MonthAvailability } from "@/lib/borrowing/calendar";
import type { InventoryCategory } from "@/lib/borrowing/availability";
import { statusLabel } from "@/lib/cases/services";
import { pick, type Locale } from "@/lib/i18n/config";
import { formatDate, formatTime, formatNumber } from "@/lib/i18n/format";
import { av, monthLabel, weekdayNames } from "./strings";

export type CalendarVariant = "public" | "staff";

interface AvailabilityMonthProps {
  locale: Locale;
  data: MonthAvailability;
  /** Every item that can be chosen, grouped by category. */
  inventory: InventoryCategory[];
  /** Where the month and chooser links go, for example `/en/borrow/availability`. */
  basePath: string;
  /** The month before and after this one, or null at the edge of what can be shown. */
  previousMonth: string | null;
  nextMonth: string | null;
  variant?: CalendarVariant;
  /** Public only: a link from a day to the every-item view for that day. */
  dayHref?: (day: string) => string;
  /** Outline depth of the item heading; the legend sits one below. */
  headingLevel?: 2 | 3;
}

export const itemName = (row: { nameTh: string; nameEn: string }, locale: Locale) => (locale === "th" ? row.nameTh : row.nameEn);
export const unitName = (row: { unitTh: string; unitEn: string }, locale: Locale) => (locale === "th" ? row.unitTh : row.unitEn);

export function monthHref(basePath: string, slug: string, month: string): string {
  return `${basePath}?${new URLSearchParams({ item: slug, month }).toString()}`;
}

interface DayStatus {
  kind: "past" | "closed" | "tooSoon" | "none" | "free";
  tone: StatusTone;
  label: string;
}

/** The word, number and tone for a day. Past wins over closed, closed over notice, notice over stock. */
export function dayStatus(day: CalendarDay, locale: Locale): DayStatus {
  if (day.past) return { kind: "past", tone: "neutral", label: av("past", locale) };
  if (!day.deskOpen) return { kind: "closed", tone: "neutral", label: av("closed", locale) };
  if (day.tooSoon) return { kind: "tooSoon", tone: "info", label: av("tooSoon", locale) };
  if (day.free === 0) return { kind: "none", tone: "error", label: av("none", locale) };
  return { kind: "free", tone: "success", label: av("free", locale, { count: formatNumber(day.free, locale) }) };
}

/** A month of one item's availability: a table from md up, a list of days below. */
export function AvailabilityMonth({ locale, data, inventory, basePath, previousMonth, nextMonth, variant = "public", dayHref, headingLevel = 2 }: AvailabilityMonthProps) {
  const staff = variant === "staff";
  const name = itemName(data.item, locale);
  const month = monthLabel(data.month, locale);
  const caption = av("captionFor", locale, { item: name, month });
  const slug = data.item.slug;

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <ItemChooser locale={locale} inventory={inventory} basePath={basePath} selected={slug} month={data.month} />

      <div className="flex flex-col gap-[var(--space-2)]">
        <Heading level={headingLevel} className="m-0">
          {name}
        </Heading>
        <p className="m-0 flex flex-wrap items-center gap-[var(--space-2)] text-ink-900">
          <Tag tone="activity">{itemName(data.category, locale)}</Tag>
          <span>{av("lendableStock", locale, { count: formatNumber(data.lendable, locale), unit: unitName(data.item, locale) })}</span>
        </p>
        {staff && (!data.item.active || !data.category.active) ? <p className="m-0 text-ink-600">{av("inactiveNote", locale)}</p> : null}
        {!staff && data.earliest > data.today ? (
          <InsetText>
            <p className="m-0">{av("earliestNote", locale, { date: formatDate(data.earliest, locale) })}</p>
          </InsetText>
        ) : null}
      </div>

      <nav aria-label={av("monthNav", locale)} className="flex flex-wrap items-center justify-between gap-[var(--space-3)]">
        {previousMonth ? (
          <Button href={monthHref(basePath, slug, previousMonth)} variant="secondary" rel="prev">
            <span aria-hidden="true">&larr;</span>
            <span>
              {av("previousMonth", locale)}
              <span className="visually-hidden">: {monthLabel(previousMonth, locale)}</span>
            </span>
          </Button>
        ) : (
          <span />
        )}
        <p className="m-0 font-semibold text-ink-900" aria-live="polite">
          {month}
        </p>
        {nextMonth ? (
          <Button href={monthHref(basePath, slug, nextMonth)} variant="secondary" rel="next">
            <span>
              {av("nextMonth", locale)}
              <span className="visually-hidden">: {monthLabel(nextMonth, locale)}</span>
            </span>
            <span aria-hidden="true">&rarr;</span>
          </Button>
        ) : (
          <span />
        )}
      </nav>

      <MonthTable locale={locale} caption={caption} days={data.days} staff={staff} dayHref={dayHref} />
      <MonthList locale={locale} caption={caption} days={data.days} staff={staff} dayHref={dayHref} />
      <Legend locale={locale} level={(headingLevel + 1) as HeadingLevel} />
    </div>
  );
}

/** A GET form, so choosing an item works without JavaScript. */
export function ItemChooser({ locale, inventory, basePath, selected, month }: { locale: Locale; inventory: InventoryCategory[]; basePath: string; selected?: string; month?: string }) {
  return (
    <form method="get" action={basePath} className="flex flex-wrap items-end gap-[var(--space-3)]">
      {month ? <input type="hidden" name="month" value={month} /> : null}
      <div className="flex min-w-0 max-w-full flex-col gap-[var(--space-1)]">
        <label htmlFor="avail-item" className="text-base font-medium text-ink-900">
          {av("chooserLabel", locale)}
        </label>
        <select
          id="avail-item"
          name="item"
          defaultValue={selected ?? ""}
          className="min-h-[var(--target-min)] max-w-full rounded-control border border-line-strong bg-surface px-[var(--space-3)] py-[var(--space-2)] text-base text-ink-900"
        >
          {selected ? null : <option value="">{av("chooserPlaceholder", locale)}</option>}
          {inventory
            .filter((c) => c.items.length > 0)
            .map((c) => (
              <optgroup key={c.id} label={itemName(c, locale)}>
                {c.items.map((i) => (
                  <option key={i.id} value={i.slug}>
                    {itemName(i, locale)}
                    {i.active && c.active ? "" : ` (${av("inactiveTag", locale)})`}
                  </option>
                ))}
              </optgroup>
            ))}
        </select>
      </div>
      <Button type="submit" variant="secondary">
        {av("chooserSubmit", locale)}
      </Button>
    </form>
  );
}

function DayNumber({ day, locale, dayHref }: { day: CalendarDay; locale: Locale; dayHref?: (day: string) => string }) {
  const n = Number(day.dayKey.slice(8));
  const full = formatDate(day.dayKey, locale);
  if (!dayHref) {
    return (
      <span className="font-semibold text-ink-900">
        {n}
        <span className="visually-hidden"> ({full})</span>
      </span>
    );
  }
  return (
    <a href={dayHref(day.dayKey)} className="font-semibold">
      {n}
      <span className="visually-hidden"> ({full})</span>
    </a>
  );
}

function DayFigures({ day, locale, status }: { day: CalendarDay; locale: Locale; status: DayStatus }) {
  return (
    <>
      <StatusTag tone={status.tone} label={status.label} />
      {status.kind === "free" || status.kind === "none" ? (
        day.held > 0 ? <span className="text-sm text-ink-600">{av("booked", locale, { count: formatNumber(day.held, locale) })}</span> : null
      ) : null}
    </>
  );
}

function Bookings({ bookings, locale }: { bookings: DayBooking[]; locale: Locale }) {
  if (bookings.length === 0) return null;
  return (
    <ul className="m-0 flex list-none flex-col gap-[var(--space-1)] p-0 text-sm">
      {bookings.map((b) => (
        <li key={b.caseId} className="flex flex-col">
          <span>
            <a href={`/admin/cases/${b.caseId}`} className="font-medium">
              {b.reference}
            </a>
            , {av("bookingQuantity", locale, { count: formatNumber(b.quantity, locale) })}
          </span>
          <span className="text-ink-600">
            {pick(statusLabel("borrowing", "loan", b.status), locale)}, {formatTime(b.collectAt, locale)} &ndash; {formatTime(b.returnDueAt, locale)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function MonthTable({ locale, caption, days, staff, dayHref }: { locale: Locale; caption: string; days: CalendarDay[]; staff: boolean; dayHref?: (day: string) => string }) {
  const names = weekdayNames(locale);
  const cells: Array<CalendarDay | null> = [...Array.from({ length: days[0]!.weekday }, () => null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: Array<Array<CalendarDay | null>> = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <table className="hidden w-full table-fixed border-collapse text-left md:table">
      <caption className="mb-[var(--space-2)] text-left text-sm text-ink-600">{caption}</caption>
      <thead>
        <tr>
          {names.map((w) => (
            <th key={w.full} scope="col" className="border border-line-strong bg-surface-alt px-[var(--space-2)] py-[var(--space-2)] text-center font-semibold text-ink-900">
              <abbr title={w.full} className="no-underline">
                {w.short}
              </abbr>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {weeks.map((week) => (
          <tr key={week.find(Boolean)?.dayKey ?? "blank"}>
            {week.map((day, i) => {
              if (!day) return <td key={`blank-${i}`} className="border border-line bg-surface-alt" />;
              const status = dayStatus(day, locale);
              const muted = status.kind === "past" || status.kind === "closed";
              return (
                <td key={day.dayKey} className={`h-full border border-line p-[var(--space-2)] align-top ${muted ? "bg-surface-alt" : ""}`}>
                  <div className="flex flex-col items-start gap-[var(--space-1)]">
                    <DayNumber day={day} locale={locale} dayHref={dayHref} />
                    <DayFigures day={day} locale={locale} status={status} />
                    {staff ? <Bookings bookings={day.bookings ?? []} locale={locale} /> : null}
                  </div>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MonthList({ locale, caption, days, staff, dayHref }: { locale: Locale; caption: string; days: CalendarDay[]; staff: boolean; dayHref?: (day: string) => string }) {
  return (
    <div className="md:hidden">
      <p className="m-0 mb-[var(--space-2)] text-sm text-ink-600" id="avail-list-caption">
        {caption}
      </p>
      <ol aria-labelledby="avail-list-caption" className="m-0 flex list-none flex-col p-0">
        {days.map((day) => {
          const status = dayStatus(day, locale);
          const muted = status.kind === "past" || status.kind === "closed";
          return (
            <li key={day.dayKey} className={`flex flex-col gap-[var(--space-1)] border-b border-line py-[var(--space-3)] ${muted ? "bg-surface-alt" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-x-[var(--space-3)] gap-y-[var(--space-1)]">
                <span className="min-w-0">
                  {dayHref ? (
                    <a href={dayHref(day.dayKey)} className="font-semibold">
                      {formatDate(day.dayKey, locale)}
                    </a>
                  ) : (
                    <span className="font-semibold text-ink-900">{formatDate(day.dayKey, locale)}</span>
                  )}
                </span>
                <span className="flex flex-wrap items-center gap-[var(--space-2)]">
                  <DayFigures day={day} locale={locale} status={status} />
                </span>
              </div>
              {staff ? <Bookings bookings={day.bookings ?? []} locale={locale} /> : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Legend({ locale, level }: { locale: Locale; level: HeadingLevel }): ReactNode {
  const rows: Array<{ tone: StatusTone; label: string; text: string }> = [
    { tone: "success", label: av("free", locale, { count: "n" }), text: av("legendFree", locale) },
    { tone: "error", label: av("none", locale), text: av("legendNone", locale) },
    { tone: "neutral", label: av("closed", locale), text: av("legendClosed", locale) },
    { tone: "info", label: av("tooSoon", locale), text: av("legendTooSoon", locale) },
    { tone: "neutral", label: av("past", locale), text: av("legendPast", locale) },
  ];
  return (
    <section aria-labelledby="avail-legend">
      <Heading level={level} id="avail-legend" className="m-0 mb-[var(--space-2)]">
        {av("legend", locale)}
      </Heading>
      <ul className="m-0 flex list-none flex-col gap-[var(--space-2)] p-0">
        {rows.map((r) => (
          <li key={r.label} className="flex flex-wrap items-center gap-[var(--space-2)]">
            <StatusTag tone={r.tone} label={r.label} />
            <span>{r.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
