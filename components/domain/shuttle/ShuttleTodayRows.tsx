"use client";

import { StatusTag, Timestamp } from "@/components/ui";
import { fillText } from "@/components/domain/open-data/fill";
import { TodayRow } from "@/components/domain/home/TodayRow";
import { localePath, pick, type Locale } from "@/lib/i18n/config";
import { bangkokDateKey } from "@/lib/i18n/format";
import { UI } from "@/lib/i18n/strings";
import { addDaysToDateKey, originDepartures } from "@/lib/shuttle/schedule";
import type { ShuttleRoute } from "@/lib/content/types";
import { useShuttleStatus } from "./useShuttleStatus";

interface ShuttleTodayRowsProps {
  locale: Locale;
  routes: ShuttleRoute[];
  now: Date;
}

/**
 * One row per route for the home page's Today list. The first render comes
 * from the server's `now`, so each row is complete without JavaScript; with it,
 * each row re-evaluates on the minute. There is no vehicle position behind any
 * of it, so the Today list carries the "Scheduled" tag and its explainer once,
 * above these rows (CONTRIBUTING.md, Honesty).
 */
export function ShuttleTodayRows({ locale, routes, now }: ShuttleTodayRowsProps) {
  const serverNowIso = now.toISOString();
  return routes.map((route) => <ShuttleRow key={route._id} locale={locale} route={route} serverNowIso={serverNowIso} />);
}

/**
 * Each line's own colour on its bus icon, keyed by the seeded slug. A route
 * not listed here keeps the Today list's orange.
 */
const LINE_ICON_CLASS: Record<string, string> = {
  "pinklao-line": "text-[#ffd13f]",
  "sanam-chai-line": "text-[#c3002f]",
};

function ShuttleRow({ locale, route, serverNowIso }: { locale: Locale; route: ShuttleRoute; serverNowIso: string }) {
  const { status, now } = useShuttleStatus(route, serverNowIso);
  const title = pick(route.name, locale);
  const href = localePath(locale, `/getting-around/shuttle/${route.slug.current}`);
  const iconClassName = LINE_ICON_CLASS[route.slug.current];

  switch (status.kind) {
    case "running": {
      const [next, ...rest] = status.departures;
      if (!next) return null;
      return (
        <TodayRow
          title={title}
          href={href}
          iconClassName={iconClassName}
          status={
            <span className="text-2xl font-bold tabular-nums text-ink-900">
              <span className="visually-hidden">{UI.nextDeparture[locale]}: </span>
              {next.stopTime}
            </span>
          }
        >
          <span>{next.minutesUntil <= 0 ? UI.departingNow[locale] : fillText(UI.homeInMinutes[locale], { n: next.minutesUntil })}</span>
          {rest[0] ? <span>{UI.homeThenDeparture[locale]} {rest[0].stopTime}</span> : null}
        </TodayRow>
      );
    }

    case "finishedForToday":
      return (
        <TodayRow title={title} href={href} iconClassName={iconClassName} status={<StatusTag tone="neutral" label={UI.lastDeparted[locale]} />}>
          <NextServiceNote locale={locale} route={route} nextServiceDate={status.nextServiceDate} now={now} />
        </TodayRow>
      );

    case "notToday":
      return (
        <TodayRow title={title} href={href} iconClassName={iconClassName} status={<StatusTag tone="neutral" label={UI.noServiceToday[locale]} />}>
          <NextServiceNote locale={locale} route={route} nextServiceDate={status.nextServiceDate} now={now} />
        </TodayRow>
      );

    case "noTimetable":
      return (
        <TodayRow title={title} href={href} iconClassName={iconClassName}>
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
