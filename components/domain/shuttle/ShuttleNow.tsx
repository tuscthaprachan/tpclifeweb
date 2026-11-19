"use client";

import { fillText } from "@/components/domain/open-data/fill";
import { StatusTag, Timestamp } from "@/components/ui";
import { pick, type Locale } from "@/lib/i18n/config";
import { bangkokDateKey } from "@/lib/i18n/format";
import { UI } from "@/lib/i18n/strings";
import { addDaysToDateKey, originDepartures } from "@/lib/shuttle/schedule";
import type { ShuttleRoute } from "@/lib/content/types";
import { useShuttleStatus } from "./useShuttleStatus";

/**
 * The next three departures from the first stop, large, for the route's own
 * page. Server-rendered from the server's clock and moved on each minute,
 * like the home page row. Scheduled times only.
 */
export function ShuttleNow({ locale, route, serverNowIso }: { locale: Locale; route: ShuttleRoute; serverNowIso: string }) {
  const { status, now } = useShuttleStatus(route, serverNowIso, 3);
  const origin = route.stops[0];

  if (status.kind === "noTimetable") return <p className="m-0">{UI.shuttleNoTimetable[locale]}</p>;

  if (status.kind === "running") {
    const [next, ...rest] = status.departures;
    if (!next) return null;
    return (
      <div className="flex flex-col gap-[var(--space-2)]">
        {origin ? <p className="m-0 text-ink-600">{fillText(UI.tdShuttleFrom[locale], { stop: pick(origin.name, locale) })}</p> : null}
        <p className="m-0 flex flex-wrap items-baseline gap-x-[var(--space-3)]">
          <span className="text-4xl font-bold tabular-nums text-ink-900">
            <span className="visually-hidden">{UI.nextDeparture[locale]}: </span>
            {next.stopTime}
          </span>
          <span className="text-lg">{next.minutesUntil <= 0 ? UI.departingNow[locale] : fillText(UI.homeInMinutes[locale], { n: next.minutesUntil })}</span>
        </p>
        {rest.length > 0 ? (
          <p className="m-0">
            {UI.tdShuttleThen[locale]}: <strong className="tabular-nums">{rest.map((d) => d.stopTime).join(", ")}</strong>
          </p>
        ) : null}
      </div>
    );
  }

  const first = originDepartures(route)[0];
  const tomorrow = status.nextServiceDate === addDaysToDateKey(bangkokDateKey(now), 1);
  return (
    <div className="flex flex-col items-start gap-[var(--space-2)]">
      <StatusTag tone="neutral" label={status.kind === "finishedForToday" ? UI.lastDeparted[locale] : UI.noServiceToday[locale]} />
      {status.nextServiceDate && first ? (
        <p className="m-0 text-lg">
          {tomorrow ? UI.firstDepartureTomorrow[locale] : UI.nextDeparture[locale]}:{" "}
          {tomorrow ? null : (
            <>
              <Timestamp value={`${status.nextServiceDate}T12:00:00+07:00`} locale={locale} />{" "}
            </>
          )}
          <strong className="tabular-nums">{first.time}</strong>
        </p>
      ) : null}
    </div>
  );
}
