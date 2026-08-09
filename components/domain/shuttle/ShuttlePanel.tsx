import type { ReactNode } from "react";
import type { HeadingLevel } from "@/lib/a11y";
import { pick, type Locale, type LocaleString } from "@/lib/i18n/config";
import { bangkokDateKey } from "@/lib/i18n/format";
import { UI } from "@/lib/i18n/strings";
import { addDaysToDateKey, getShuttleStatus, originDepartures, type ShuttleStatus } from "@/lib/shuttle/schedule";
import type { ShuttleRoute } from "@/lib/sanity/types";
import { Cluster, EmptyState, Heading, Stack, Tag, Timestamp } from "@/components/ui";
import { ShuttleCountdown } from "./ShuttleCountdown";

/*
 * TODO: add to UI strings. There is no shared string yet for "this route's
 * timetable has not been published". The only published Tha Prachan shuttle
 * timetable is an image in an Instagram post (see
 * data/harvested-inventory.ts, TRANSPORT.shuttle.needsVerification); a
 * `shuttleRoute` document can genuinely exist with an empty `departures`
 * array until an editor transcribes it, and inventing a time would be worse
 * than saying so plainly. Using a local literal until strings.ts gets a real
 * entry; reported in the shuttle agent's final report.
 */
const NO_TIMETABLE_NOTE: LocaleString = {
  th: "ยังไม่มีการเผยแพร่ตารางเวลาสำหรับเส้นทางนี้",
  en: "A timetable for this route has not been published yet",
};

interface ShuttlePanelProps {
  locale: Locale;
  routes: ShuttleRoute[];
  /** Depth of each route's own heading in the page outline (1.3.1, 2.4.6). */
  headingLevel: HeadingLevel;
  /** Overridable for tests and for a caller that wants a specific instant. Defaults to the real current time. */
  now?: Date;
}

/**
 * The home page "at a glance" shuttle block. A Server Component: every time
 * shown is computed once, on the server, from the CMS timetable and `now`.
 * The only client-side code is `ShuttleCountdown`, which re-ticks the number
 * already rendered here; with JavaScript off, the server-rendered "next
 * departure at HH:MM" line is already complete and correct on its own.
 */
export function ShuttlePanel({ locale, routes, headingLevel, now = new Date() }: ShuttlePanelProps) {
  if (routes.length === 0) {
    return (
      <EmptyState title={UI.nothingHere[locale]}>{pick(NO_TIMETABLE_NOTE, locale)}</EmptyState>
    );
  }

  return (
    <Stack space={6}>
      <Stack space={4} as="ul">
        {routes.map((route) => (
          <li key={route._id}>
            <Stack space={2} className="rounded-panel border border-line px-[var(--space-4)] py-[var(--space-4)]">
              <Cluster justify="between" space={2}>
                <Heading level={headingLevel} className="m-0">
                  {pick(route.name, locale)}
                </Heading>
                {/* --fill-transport, the fixed category fill for shuttle content (CONTRIBUTING.md). "Scheduled", never "live": see lib/shuttle/schedule.ts. */}
                <Tag tone="transport">{UI.scheduled[locale]}</Tag>
              </Cluster>
              <RouteStatus locale={locale} route={route} status={getShuttleStatus(route, now, { count: 2 })} now={now} />
            </Stack>
          </li>
        ))}
      </Stack>
      {/* Visible near the panel, not hidden in a tooltip or Details (CONTRIBUTING.md, Honesty). */}
      <p className="m-0 text-sm text-ink-600">{UI.scheduledExplainer[locale]}</p>
    </Stack>
  );
}

function RouteStatus({ locale, route, status, now }: { locale: Locale; route: ShuttleRoute; status: ShuttleStatus; now: Date }): ReactNode {
  switch (status.kind) {
    case "running": {
      const [next, ...rest] = status.departures;
      if (!next) return null; // unreachable: "running" never carries an empty list.
      return (
        <Stack space={1}>
          <p className="m-0">
            {UI.nextDeparture[locale]}: <strong>{next.stopTime}</strong>{" "}
            <ShuttleCountdown locale={locale} targetStopMinutesOfDay={next.stopMinutesOfDay} initialMinutesUntil={next.minutesUntil} />
          </p>
          {rest.length > 0 ? (
            <p className="m-0 text-sm text-ink-600">{rest.map((departure) => departure.stopTime).join(", ")}</p>
          ) : null}
        </Stack>
      );
    }

    case "finishedForToday":
      return (
        <Stack space={1}>
          <p className="m-0">{UI.lastDeparted[locale]}</p>
          <NextServiceNote locale={locale} route={route} nextServiceDate={status.nextServiceDate} now={now} />
        </Stack>
      );

    case "notToday":
      return (
        <Stack space={1}>
          <p className="m-0">{UI.noServiceToday[locale]}</p>
          <NextServiceNote locale={locale} route={route} nextServiceDate={status.nextServiceDate} now={now} />
        </Stack>
      );

    case "noTimetable":
      return <p className="m-0 text-ink-600">{pick(NO_TIMETABLE_NOTE, locale)}</p>;
  }
}

/**
 * "First departure tomorrow" only when the next service date genuinely is
 * tomorrow. A route back from a week-long holiday break should not borrow
 * that label for a date several days out: that would say something nobody
 * confirmed.
 */
function NextServiceNote({ locale, route, nextServiceDate, now }: { locale: Locale; route: ShuttleRoute; nextServiceDate: string | null; now: Date }) {
  if (!nextServiceDate) return null;

  const firstDeparture = originDepartures(route)[0];
  if (!firstDeparture) return null;

  const isTomorrow = nextServiceDate === addDaysToDateKey(bangkokDateKey(now), 1);

  if (isTomorrow) {
    return (
      <p className="m-0 text-sm text-ink-600">
        {UI.firstDepartureTomorrow[locale]}: {firstDeparture.time}
      </p>
    );
  }

  return (
    <p className="m-0 text-sm text-ink-600">
      {UI.nextDeparture[locale]}: <Timestamp value={`${nextServiceDate}T00:00:00.000Z`} locale={locale} /> {firstDeparture.time}
    </p>
  );
}
