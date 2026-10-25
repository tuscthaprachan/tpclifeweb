import NextLink from "next/link";

import { StatusTag, Tag, Timestamp } from "@/components/ui";
import { TODAY_LINK_CLASS, TodayRow } from "@/components/domain/home/TodayRow";
import { localePath, pick, type Locale } from "@/lib/i18n/config";
import { bangkokDateKey } from "@/lib/i18n/format";
import { UI } from "@/lib/i18n/strings";
import { addDaysToDateKey, getShuttleStatus, originDepartures, type ShuttleStatus } from "@/lib/shuttle/schedule";
import type { ShuttleRoute } from "@/lib/content/types";
import { ShuttleCountdown } from "./ShuttleCountdown";

interface ShuttleTodayRowsProps {
  locale: Locale;
  routes: ShuttleRoute[];
  now: Date;
}

/**
 * One row per route for the home page's Today list. Every time is computed on
 * the server from the published timetable, so each row is complete without
 * JavaScript, and every row carries the "Scheduled" tag: there is no vehicle
 * position behind any of it (CONTRIBUTING.md, Honesty).
 */
export function ShuttleTodayRows({ locale, routes, now }: ShuttleTodayRowsProps) {
  return routes.map((route) => (
    <ShuttleRow key={route._id} locale={locale} route={route} status={getShuttleStatus(route, now, { count: 2 })} now={now} />
  ));
}

function ShuttleRow({ locale, route, status, now }: { locale: Locale; route: ShuttleRoute; status: ShuttleStatus; now: Date }) {
  const title = (
    <NextLink href={localePath(locale, "/getting-around")} className={TODAY_LINK_CLASS}>
      {pick(route.name, locale)}
    </NextLink>
  );
  const scheduled = <Tag tone="transport">{UI.scheduled[locale]}</Tag>;

  switch (status.kind) {
    case "running": {
      const [next, ...rest] = status.departures;
      if (!next) return null;
      return (
        <TodayRow
          title={title}
          status={
            <span className="text-2xl font-bold tabular-nums text-ink-900">
              <span className="visually-hidden">{UI.nextDeparture[locale]}: </span>
              {next.stopTime}
            </span>
          }
        >
          {scheduled}
          <ShuttleCountdown locale={locale} targetStopMinutesOfDay={next.stopMinutesOfDay} initialMinutesUntil={next.minutesUntil} />
          {rest[0] ? <span>· {rest[0].stopTime}</span> : null}
        </TodayRow>
      );
    }

    case "finishedForToday":
      return (
        <TodayRow title={title} status={<StatusTag tone="neutral" label={UI.lastDeparted[locale]} />}>
          {scheduled}
          <NextServiceNote locale={locale} route={route} nextServiceDate={status.nextServiceDate} now={now} />
        </TodayRow>
      );

    case "notToday":
      return (
        <TodayRow title={title} status={<StatusTag tone="neutral" label={UI.noServiceToday[locale]} />}>
          {scheduled}
          <NextServiceNote locale={locale} route={route} nextServiceDate={status.nextServiceDate} now={now} />
        </TodayRow>
      );

    case "noTimetable":
      return (
        <TodayRow title={title}>
          <span>{UI.shuttleNoTimetable[locale]}</span>
        </TodayRow>
      );
  }
}

/**
 * "First departure tomorrow" only when the next service date genuinely is
 * tomorrow. A route back from a week-long holiday break should not borrow
 * that label for a date several days out.
 */
function NextServiceNote({ locale, route, nextServiceDate, now }: { locale: Locale; route: ShuttleRoute; nextServiceDate: string | null; now: Date }) {
  if (!nextServiceDate) return null;

  const firstDeparture = originDepartures(route)[0];
  if (!firstDeparture) return null;

  if (nextServiceDate === addDaysToDateKey(bangkokDateKey(now), 1)) {
    return (
      <span>
        {UI.firstDepartureTomorrow[locale]}: {firstDeparture.time}
      </span>
    );
  }

  return (
    <span>
      {UI.nextDeparture[locale]}: <Timestamp value={`${nextServiceDate}T00:00:00.000Z`} locale={locale} /> {firstDeparture.time}
    </span>
  );
}
