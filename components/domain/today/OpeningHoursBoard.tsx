import NextLink from "next/link";
import { BookOpen, Coffee, Dumbbell, GraduationCap, HeartPulse, MapPin, type LucideIcon } from "lucide-react";

import { fillText } from "@/components/domain/open-data/fill";
import { isLibrary } from "@/components/domain/home/openingHours";
import { DecorativeIcon, Details, Heading, StatusTag, Tag, cx } from "@/components/ui";
import { localePath, pick, type Locale } from "@/lib/i18n/config";
import { bangkokDateKey, bangkokMinutesOfDay, formatClockTime, formatWeekday, parseClockTime } from "@/lib/i18n/format";
import { UI } from "@/lib/i18n/strings";
import type { CampusPlace } from "@/lib/content/types";
import { hoursOnDate, minutesUntilClock, nextOpeningAfterToday, usualHours, type PlaceHoursStatus, type UsualHoursRow } from "@/components/domain/home/openingHours";
import { formatDateKey, formatDays, formatSpan } from "./format";
import { placeStatus, placeStatusLine } from "./PlaceHours";

export type PlaceGroupId = "libraries" | "health" | "sport" | "study" | "food" | "other";

const GROUP_ORDER: PlaceGroupId[] = ["libraries", "health", "sport", "study", "food", "other"];

const GROUP_OF_SLUG: Record<string, PlaceGroupId> = {
  "tu-virtual-clinic": "health",
  "tha-prachan-fitness": "sport",
  "tha-prachan-gymnasium": "sport",
  "tha-prachan-computer-service-center": "study",
  "student-lounge": "study",
  "tu-bookshop-tha-prachan": "food",
  "thammasat-60-years-canteen": "food",
};

const GROUP_META: Record<PlaceGroupId, { icon: LucideIcon; label: (locale: Locale) => string }> = {
  libraries: { icon: BookOpen, label: (l) => UI.homeLibraries[l] },
  health: { icon: HeartPulse, label: (l) => UI.ohGroupHealth[l] },
  sport: { icon: Dumbbell, label: (l) => UI.ohGroupSport[l] },
  study: { icon: GraduationCap, label: (l) => UI.ohGroupStudy[l] },
  food: { icon: Coffee, label: (l) => UI.ohGroupFood[l] },
  other: { icon: MapPin, label: (l) => UI.tdOtherPlaces[l] },
};

const CLOSING_SOON_MINUTES = 30;

export function placeGroup(place: CampusPlace): PlaceGroupId {
  if (isLibrary(place)) return "libraries";
  return GROUP_OF_SLUG[place.slug.current] ?? "other";
}

const hasHours = (place: CampusPlace) => Boolean(place.openingHours && place.openingHours.length > 0);

interface Row {
  place: CampusPlace;
  status: PlaceHoursStatus;
}

interface Group {
  id: PlaceGroupId;
  rows: Row[];
  open: number;
}

function buildGroups(places: CampusPlace[], now: Date, locale: Locale): Group[] {
  const byName = (a: CampusPlace, b: CampusPlace) =>
    Number(Boolean(b.isKeyLocation)) - Number(Boolean(a.isKeyLocation)) || pick(a.name, locale).localeCompare(pick(b.name, locale), locale);
  return GROUP_ORDER.map((id) => {
    const rows = places
      .filter((place) => placeGroup(place) === id)
      .sort(byName)
      .map((place) => ({ place, status: placeStatus(place, now) }));
    return { id, rows, open: rows.filter((row) => row.status.kind === "open").length };
  }).filter((group) => group.rows.length > 0);
}

/** Usual rows that share the same days become one line: "Every day 07:00 to 11:00, 15:00 to 21:00". */
function usualLines(place: CampusPlace, locale: Locale): { days: string; spans: string }[] {
  const merged = new Map<string, UsualHoursRow[]>();
  for (const row of usualHours(place.openingHours ?? [])) {
    const key = row.days.join(",");
    merged.set(key, [...(merged.get(key) ?? []), row]);
  }
  return [...merged.values()].map((rows) => ({
    days: formatDays(rows[0]!.days, locale),
    spans: rows.map((row) => formatSpan(row, locale)).join(", "),
  }));
}

function usualNote(place: CampusPlace, locale: Locale): string {
  const notes = new Set(usualHours(place.openingHours ?? []).map((row) => (row.note ? pick(row.note, locale) : "")).filter(Boolean));
  return [...notes].join(". ");
}

function statusLine(place: CampusPlace, status: PlaceHoursStatus, now: Date, locale: Locale): string {
  if (status.kind === "closed" && status.opensNext) return "";
  if (status.kind !== "closed") return placeStatusLine(place, status, now, locale);
  const next = nextOpeningAfterToday(place.openingHours ?? [], now, 7);
  if (!next) return placeStatusLine(place, status, now, locale);
  const tomorrow = bangkokDateKey(new Date(now.getTime() + 24 * 60 * 60 * 1000));
  if (next.dateKey === tomorrow) return fillText(UI.ohOpensTomorrow[locale], { time: next.opens });
  return fillText(UI.ohOpensOnDay[locale], { day: formatWeekday(`${next.dateKey}T12:00:00+07:00`, locale), time: next.opens });
}

function StatusBadge({ status, now, locale }: { status: PlaceHoursStatus; now: Date; locale: Locale }) {
  if (status.kind === "open") {
    const soon = minutesUntilClock(status.closes, status.closesNextDay, now) <= CLOSING_SOON_MINUTES;
    return soon ? <StatusTag tone="warning" label={UI.ohClosingSoon[locale]} /> : <StatusTag tone="success" label={UI.openNow[locale]} />;
  }
  if (status.kind === "closed" && status.opensNext) return <StatusTag tone="info" label={fillText(UI.ohOpensLaterTag[locale], { time: status.opensNext })} />;
  return <StatusTag tone="neutral" label={UI.closedNow[locale]} />;
}

function PlaceRow({ row, now, locale }: { row: Row; now: Date; locale: Locale }) {
  const { place, status } = row;
  const today = hoursOnDate(place.openingHours ?? [], bangkokDateKey(now));
  const todayText = today.spans.length === 0 ? UI.tdClosedToday[locale] : today.spans.map((span) => formatSpan(span, locale)).join(", ");
  const todayNote = today.special ? [...new Set(today.spans.map((span) => (span.note ? pick(span.note, locale) : "")).filter(Boolean))].join(". ") : "";
  const lines = usualLines(place, locale);
  const note = usualNote(place, locale);
  const line = statusLine(place, status, now, locale);

  return (
    <li
      className={cx(
        "grid grid-cols-1 gap-y-[var(--space-2)] py-[var(--space-4)]",
        "sm:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1.35fr)] sm:gap-x-[var(--space-6)]",
      )}
    >
      <div className="min-w-0">
        <NextLink href={localePath(locale, `/places/${place.slug.current}`)} className="font-bold text-action">
          {pick(place.name, locale)}
        </NextLink>
        {place.building ? <p className="m-0 mt-[var(--space-1)] text-sm leading-snug text-ink-600">{pick(place.building, locale)}</p> : null}
      </div>

      <div className="flex flex-wrap items-center gap-x-[var(--space-2)] gap-y-[var(--space-1)] sm:flex-col sm:items-start">
        <StatusBadge status={status} now={now} locale={locale} />
        {line ? <span className="text-sm leading-snug text-ink-600">{line}</span> : null}
      </div>

      <div>
        <p className="m-0 flex flex-wrap items-baseline gap-x-[var(--space-2)]">
          <span className="text-sm font-semibold text-ink-600">{UI.tdToday[locale]}</span>
          <span className="font-semibold tabular-nums text-ink-900">{todayText}</span>
        </p>
        {today.special && today.spans.length > 0 ? (
          <p className="m-0 mt-[var(--space-1)]">
            <Tag tone="neutral" icon={false}>
              {todayNote || UI.tdSpecialHours[locale]}
            </Tag>
          </p>
        ) : null}
        {lines.length > 0 ? (
          <dl className="m-0 mt-[var(--space-1)] grid grid-cols-[auto_minmax(0,1fr)] gap-x-[var(--space-2)] text-sm leading-snug text-ink-600">
            {today.special && today.spans.length > 0 ? <dt className="col-span-2 font-semibold">{UI.ohUsual[locale]}</dt> : null}
            {lines.map((line) => (
              <div key={line.days} className="contents">
                <dt>{line.days}</dt>
                <dd className="m-0 tabular-nums">{line.spans}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {note ? <p className="m-0 mt-[var(--space-1)] text-sm leading-snug text-ink-600">{note}</p> : null}
      </div>
    </li>
  );
}

function latestToday(places: CampusPlace[], now: Date): { place: CampusPlace; closes: string; overnight: boolean } | null {
  let best: { place: CampusPlace; closes: string; overnight: boolean; minutes: number } | null = null;
  const nowMinutes = bangkokMinutesOfDay(now);
  for (const place of places) {
    if (place.closureNote) continue;
    for (const span of hoursOnDate(place.openingHours ?? [], bangkokDateKey(now)).spans) {
      const minutes = (parseClockTime(span.closes) ?? 0) + (span.overnight ? 1440 : 0);
      if (minutes <= nowMinutes) continue;
      if (!best || minutes > best.minutes) best = { place, closes: span.closes, overnight: span.overnight, minutes };
    }
  }
  return best;
}

interface BoardProps {
  locale: Locale;
  places: CampusPlace[];
  now: Date;
  openOnly: boolean;
  basePath: string;
}

export function OpeningHoursBoard({ locale, places, now, openOnly, basePath }: BoardProps) {
  const withHours = places.filter(hasHours);
  const withoutHours = places.filter((place) => !hasHours(place)).sort((a, b) => pick(a.name, locale).localeCompare(pick(b.name, locale), locale));
  const groups = buildGroups(withHours, now, locale);
  const openTotal = groups.reduce((sum, group) => sum + group.open, 0);
  const shown = openOnly
    ? groups.map((group) => ({ ...group, rows: group.rows.filter((row) => row.status.kind === "open") })).filter((group) => group.rows.length > 0)
    : groups;
  const latest = latestToday(withHours, now);
  const toggleHref = localePath(locale, openOnly ? basePath : `${basePath}?open=1`);

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <section aria-labelledby="oh-summary" className="rounded-[var(--radius-block)] bg-surface-alt px-[var(--space-4)] py-[var(--space-4)] sm:px-[var(--space-6)]">
        <h2 id="oh-summary" className="m-0 text-[length:var(--text-xl)] font-bold text-ink-900">
          {fillText(UI.ohOpenCount[locale], { open: String(openTotal), total: String(withHours.length) })}
        </h2>
        <p className="m-0 mt-[var(--space-1)] text-sm text-ink-600">
          {fillText(UI.ohAsOf[locale], { time: formatClockTime(bangkokMinutesOfDay(now)), day: formatDateKey(bangkokDateKey(now), locale) })}
        </p>
        {latest ? (
          <p className="m-0 mt-[var(--space-3)] text-ink-900">
            {fillText(UI.ohOpenLatest[locale], {
              place: pick(latest.place.name, locale),
              time: latest.overnight ? fillText(UI.ohNextDay[locale], { time: latest.closes }) : latest.closes,
            })}
          </p>
        ) : null}
        <p className="m-0 mt-[var(--space-3)]">
          <NextLink href={toggleHref} className="inline-flex min-h-[var(--target-min)] items-center font-semibold text-action" aria-describedby={openOnly ? "oh-filter-state" : undefined}>
            {openOnly ? UI.ohShowAll[locale] : UI.ohOpenOnly[locale]}
          </NextLink>
          {openOnly ? (
            <span id="oh-filter-state" className="ml-[var(--space-2)] text-sm text-ink-600">
              ({UI.ohShowingOpen[locale]})
            </span>
          ) : null}
        </p>
      </section>

      {shown.length > 1 ? (
        <nav aria-labelledby="oh-jump">
          <p id="oh-jump" className="m-0 mb-[var(--space-2)] text-sm font-semibold text-ink-600">
            {UI.ohJumpTo[locale]}
          </p>
          <ul className="m-0 flex list-none flex-wrap gap-[var(--space-2)] p-0">
            {shown.map((group) => {
              const full = groups.find((g) => g.id === group.id)!;
              return (
                <li key={group.id}>
                  <a
                    href={`#oh-${group.id}`}
                    className="inline-flex min-h-[var(--target-min)] items-center gap-[var(--space-2)] rounded-pill border border-line bg-surface px-[var(--space-3)] text-sm font-semibold text-action no-underline hover:underline"
                  >
                    <DecorativeIcon icon={GROUP_META[group.id].icon} size={16} />
                    {GROUP_META[group.id].label(locale)}
                    <span className="font-normal text-ink-600">{fillText(UI.ohGroupOpen[locale], { open: String(full.open), total: String(full.rows.length) })}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}

      {shown.length === 0 ? <p className="m-0 text-lg text-ink-900">{UI.ohNoneOpen[locale]}</p> : null}

      {shown.map((group) => {
        const full = groups.find((g) => g.id === group.id)!;
        return (
          <section key={group.id} aria-labelledby={`oh-${group.id}`} className="scroll-mt-[var(--space-6)]">
            <div className="flex flex-wrap items-baseline justify-between gap-x-[var(--space-4)] border-b-2 border-ink-900 pb-[var(--space-2)]">
              <Heading level={2} id={`oh-${group.id}`} className="m-0 flex items-center gap-[var(--space-2)]">
                <DecorativeIcon icon={GROUP_META[group.id].icon} size={22} />
                {GROUP_META[group.id].label(locale)}
              </Heading>
              <span className="text-sm text-ink-600">{fillText(UI.ohGroupOpen[locale], { open: String(full.open), total: String(full.rows.length) })}</span>
            </div>
            <ul className="m-0 list-none divide-y divide-line p-0">
              {group.rows.map((row) => (
                <PlaceRow key={row.place._id} row={row} now={now} locale={locale} />
              ))}
            </ul>
          </section>
        );
      })}

      {!openOnly && withoutHours.length > 0 ? (
        <Details summary={fillText(UI.ohNoHours[locale], { count: String(withoutHours.length) })}>
          <p className="m-0 mb-[var(--space-2)] text-sm text-ink-600">{UI.ohNoHoursBody[locale]}</p>
          <ul className="m-0 grid list-none gap-x-[var(--space-6)] gap-y-[var(--space-1)] p-0 sm:grid-cols-2">
            {withoutHours.map((place) => (
              <li key={place._id}>
                <NextLink href={localePath(locale, `/places/${place.slug.current}`)} className="inline-flex min-h-[var(--target-min)] items-center text-action">
                  {pick(place.name, locale)}
                </NextLink>
              </li>
            ))}
          </ul>
        </Details>
      ) : null}
    </div>
  );
}
