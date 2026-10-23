import type { HeadingLevel } from "@/lib/a11y";
import { pick, type Locale, type LocaleString } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { getShuttleStatus, originDepartures, resolveStopTime, type ShuttleStatus } from "@/lib/shuttle/schedule";
import type { ShuttleRoute } from "@/lib/content/types";
import { DataTable, type DataTableColumn, EmptyState, Heading, Stack, Tag } from "@/components/ui";

/*
 * TODO: add to UI strings. Same gap as ShuttlePanel.tsx: no shared string yet
 * for "this route's timetable has not been published". Kept as a duplicated
 * local literal rather than importing it across domain components, since
 * neither file owns the other; both report the same gap.
 */
const NO_TIMETABLE_NOTE: LocaleString = {
  th: "ยังไม่มีการเผยแพร่ตารางเวลาสำหรับเส้นทางนี้",
  en: "A timetable for this route has not been published yet",
};

interface ShuttleRouteTableProps {
  locale: Locale;
  route: ShuttleRoute;
  /** Depth of the route's own heading in the page outline. */
  headingLevel: HeadingLevel;
  now?: Date;
}

/**
 * The full timetable for one route: every configured departure, arrival time
 * at every stop, with the next departure marked.
 *
 * Mobile behaviour, decided deliberately rather than defaulting to
 * DataTable's usual stacked variant or reaching for a scroll region:
 *
 * Rows are departures (potentially many across a service day), columns are
 * stops (typically two to four: the origin plus a handful of pickup
 * points). DataTable's default stacked-below-`sm` layout turns each
 * departure into its own short list of "stop name: time" pairs, one line per
 * stop. With only a few stops that stays perfectly readable; it does not
 * turn into the "maze of repeated labels with no shared axis to scan"
 * CONTRIBUTING.md warns a wide table can become. So this deliberately keeps
 * DataTable's default stacking rather than invoking the horizontal-scroll
 * exception: there is no genuine wide grid here to protect. If a future
 * route ever needs many stops as columns, that decision should be
 * revisited, at which point the scroll-region exception is the documented
 * fallback.
 */
export function ShuttleRouteTable({ locale, route, headingLevel, now = new Date() }: ShuttleRouteTableProps) {
  const departures = originDepartures(route);
  const routeName = pick(route.name, locale);

  if (departures.length === 0 || route.stops.length === 0) {
    return (
      <Stack space={2}>
        <Heading level={headingLevel}>{routeName}</Heading>
        <EmptyState title={UI.nothingHere[locale]}>{pick(NO_TIMETABLE_NOTE, locale)}</EmptyState>
      </Stack>
    );
  }

  const status = getShuttleStatus(route, now, { count: 1 });
  const nextOriginMinutes = status.kind === "running" ? status.departures[0]?.originMinutesOfDay : undefined;

  const columns: DataTableColumn<(typeof departures)[number]>[] = route.stops.map((stop) => ({
    id: stop._key,
    header: pick(stop.name, locale),
    cell: (departure) => {
      const { time } = resolveStopTime(departure.minutesOfDay, stop);
      const isNext = departure.minutesOfDay === nextOriginMinutes;
      return (
        <span className={isNext ? "font-semibold text-action" : undefined}>
          {time}
          {isNext ? <span className="visually-hidden"> ({UI.nextDeparture[locale]})</span> : null}
        </span>
      );
    },
  }));

  return (
    <Stack space={3}>
      <Heading level={headingLevel} className="m-0">
        {routeName}
      </Heading>
      <RouteStatusLine locale={locale} status={status.kind} />
      <DataTable
        columns={columns}
        rows={departures}
        getRowKey={(departure) => departure.raw}
        caption={<>{routeName}. {UI.scheduled[locale]}.</>}
      />
      {/* Visible near the table, not hidden in a tooltip or Details (CONTRIBUTING.md, Honesty). */}
      <p className="m-0 text-sm text-ink-600">{UI.scheduledExplainer[locale]}</p>
    </Stack>
  );
}

function RouteStatusLine({ locale, status }: { locale: Locale; status: ShuttleStatus["kind"] }) {
  switch (status) {
    case "running":
      return (
        <div>
          <Tag tone="transport">{UI.scheduled[locale]}</Tag>
        </div>
      );
    case "notToday":
      return <p className="m-0 text-sm text-ink-600">{UI.noServiceToday[locale]}</p>;
    case "finishedForToday":
      return <p className="m-0 text-sm text-ink-600">{UI.lastDeparted[locale]}</p>;
    case "noTimetable":
      // Unreachable: this component only renders past the `departures.length
      // === 0` guard above, so `getShuttleStatus` never returns this branch
      // here. Handled anyway so the switch stays exhaustive.
      return null;
  }
}
