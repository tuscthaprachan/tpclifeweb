import NextLink from "next/link";
import { Cross, Sun, type LucideIcon } from "lucide-react";
import { Fragment, type ReactNode } from "react";

import { fillText } from "@/components/domain/open-data/fill";
import { ShuttleTodayRows } from "@/components/domain/shuttle/ShuttleTodayRows";
import { StatusTag, type StatusTone } from "@/components/ui";
import { localePath, pick, type Locale } from "@/lib/i18n/config";
import { bangkokDateKey, formatDateShort, formatTime, formatWeekday } from "@/lib/i18n/format";
import { UI, type UiKey } from "@/lib/i18n/strings";
import type { AlertSeverity, CampusPlace, ServiceAlert, ShuttleRoute } from "@/lib/content/types";
import type { TodaySettings } from "@/lib/content/today";
import type { TodayRowKey } from "@/lib/db/schema/content/today";
import {
  HEAT_ADVISE_FROM,
  HEAT_ORDER,
  HEAT_TONE,
  PM25_ADVISE_FROM,
  PM25_ORDER,
  PM25_TONE,
  atOrAbove,
  heatLevel,
  pm25Level,
  type HeatLevel,
  type Pm25Level,
} from "@/lib/weather/levels";
import type { CampusWeather } from "@/lib/weather/read";
import { getPlaceHoursStatus, nextOpenFor, summariseLibraries, type PlaceHoursStatus } from "./openingHours";
import { SectionBar } from "./SectionBar";
import { TodayRow } from "./TodayRow";

const HEADING_ID = "home-today-heading";

const HEAT_LABEL: Record<HeatLevel, UiKey> = {
  normal: "homeHeatNormal",
  watch: "homeHeatWatch",
  warning: "homeHeatWarning",
  danger: "homeHeatDanger",
  extremeDanger: "homeHeatExtremeDanger",
};
const PM25_LABEL: Record<Pm25Level, UiKey> = {
  veryGood: "homePm25VeryGood",
  good: "homePm25Good",
  moderate: "homePm25Moderate",
  startingToAffect: "homePm25StartingToAffect",
  affectsHealth: "homePm25AffectsHealth",
};

const SEVERITY_TONE: Record<AlertSeverity, StatusTone> = { info: "info", warning: "warning", critical: "error" };
const SEVERITY_LABEL: Record<AlertSeverity, UiKey> = {
  info: "alertSeverityInfo",
  warning: "alertSeverityWarning",
  critical: "alertSeverityCritical",
};

interface TodayListProps {
  locale: Locale;
  alerts: ServiceAlert[];
  routes: ShuttleRoute[];
  /** Key places that are not libraries. */
  places: CampusPlace[];
  libraries: CampusPlace[];
  weather: CampusWeather;
  settings: TodaySettings;
  now: Date;
  /** Reads that failed, as opposed to returning nothing. */
  unavailable?: { shuttle?: boolean; hours?: boolean; weather?: boolean };
}

/**
 * The rows in the order and with the visibility set in the console (Today
 * settings): by default shuttles, with any alert about them straight after,
 * the libraries as one row, the other key places, the heat index and PM2.5
 * as one row, and the remaining alerts. Every row title opens the page with
 * everything about it. A read that failed shows a row saying so rather than nothing.
 */
export function TodayList({ locale, alerts, routes, places, libraries, weather, settings, now, unavailable = {} }: TodayListProps) {
  const visible = settings.rows.filter((row) => row.visible).map((row) => row.key);
  const showsShuttle = visible.includes("shuttle");
  const shuttleAlerts = showsShuttle ? alerts.filter((alert) => alert.affects?.includes("shuttle")) : [];
  const otherAlerts = alerts.filter((alert) => !shuttleAlerts.includes(alert));
  const nothingWithHours = places.length === 0 && libraries.length === 0;
  const showsHours = visible.includes("libraries") || visible.includes("places");
  let hoursEmptyShown = false;

  const render: Record<TodayRowKey, () => ReactNode> = {
    shuttle: () => (
      <>
        {unavailable.shuttle ? <ShuttleUnavailableRow locale={locale} /> : <ShuttleTodayRows locale={locale} routes={routes} now={now} />}
        {shuttleAlerts.map((alert) => (
          <AlertRow key={alert._id} locale={locale} alert={alert} />
        ))}
      </>
    ),
    libraries: () => (libraries.length > 0 ? <LibrariesRow locale={locale} libraries={libraries} now={now} /> : hoursEmpty()),
    places: () =>
      places.length > 0
        ? places.map((place) => (
            <PlaceRow
              key={place._id}
              locale={locale}
              place={place}
              now={now}
              status={place.closureNote ? { kind: "closed", note: place.closureNote } : getPlaceHoursStatus(place, now)}
            />
          ))
        : hoursEmpty(),
    weather: () => <WeatherRows locale={locale} weather={weather} settings={settings} unavailable={Boolean(unavailable.weather)} />,
    alerts: () =>
      otherAlerts.map((alert) => (
        <AlertRow key={alert._id} locale={locale} alert={alert} />
      )),
  };

  function hoursEmpty() {
    if (!nothingWithHours || !showsHours || hoursEmptyShown) return null;
    hoursEmptyShown = true;
    if (unavailable.hours) {
      return (
        <TodayRow title={UI.keyHoursTitle[locale]} href={localePath(locale, "/places")}>
          <span>{UI.htdHoursUnavailable[locale]}</span>
          <NextLink href={localePath(locale, "/places")} className="font-semibold">
            {UI.htdSeeHours[locale]}
          </NextLink>
        </TodayRow>
      );
    }
    return (
      <TodayRow title={UI.keyHoursTitle[locale]} href={localePath(locale, "/places")}>
        <span>{UI.keyHoursNotPublished[locale]}</span>
      </TodayRow>
    );
  }

  return (
    <section aria-labelledby={HEADING_ID}>
      <SectionBar id={HEADING_ID} tone="transport" icon={Sun}>
        {UI.homeToday[locale]}
      </SectionBar>

      <dl className="m-0 mt-[var(--space-2)]">
        {visible.map((key) => (
          <Fragment key={key}>{render[key]()}</Fragment>
        ))}
      </dl>

      {showsShuttle ? (
        <NextLink
          href={localePath(locale, "/getting-around")}
          className="mt-[var(--space-2)] inline-flex min-h-[var(--target-min)] items-center font-semibold"
        >
          {UI.homeFullTimetable[locale]}
        </NextLink>
      ) : null}

      <p className="m-0 mt-[var(--space-2)] text-sm text-ink-600">{fillText(UI.htdUpdated[locale], { time: formatTime(now, locale) })}</p>
    </section>
  );
}

function ShuttleUnavailableRow({ locale }: { locale: Locale }) {
  const href = localePath(locale, "/getting-around");
  return (
    <TodayRow title={UI.htdShuttleUnavailable[locale]} href={href}>
      <NextLink href={href} className="font-semibold">
        {UI.htdSeeFullTimetable[locale]}
      </NextLink>
    </TodayRow>
  );
}

function WeatherRows({ locale, weather, settings, unavailable }: { locale: Locale; weather: CampusWeather; settings: TodaySettings; unavailable: boolean }) {
  const { heat, pm25 } = weather;
  if (!heat && !pm25) {
    return unavailable ? (
      <TodayRow title={UI.homeWeather[locale]} href={localePath(locale, "/weather")}>
        <span>{UI.htdWeatherUnavailable[locale]}</span>
      </TodayRow>
    ) : null;
  }
  const heatAt = heat ? heatLevel(heat.index) : null;
  const pmAt = pm25 ? pm25Level(pm25.value) : null;
  const advice: string[] = [];
  if (heatAt && atOrAbove(HEAT_ORDER, heatAt, HEAT_ADVISE_FROM)) advice.push(pick(settings.heatAdvice[heatAt], locale));
  if (pmAt && atOrAbove(PM25_ORDER, pmAt, PM25_ADVISE_FROM)) advice.push(pick(settings.pm25Advice[pmAt], locale));
  return (
    <TodayRow title={UI.homeWeather[locale]} href={localePath(locale, "/weather")}>
      {heat && heatAt ? (
        <span className="inline-flex flex-wrap items-baseline gap-x-[var(--space-2)]">
          <span>
            {UI.homeHeatIndex[locale]} <strong className="text-ink-900">{Math.round(heat.index)}°C</strong>
          </span>
          <StatusTag tone={HEAT_TONE[heatAt]} label={UI[HEAT_LABEL[heatAt]][locale]} />
        </span>
      ) : null}
      {pm25 && pmAt ? (
        <span className="inline-flex flex-wrap items-baseline gap-x-[var(--space-2)]">
          <span>
            {UI.homePm25[locale]} <strong className="text-ink-900">{Math.round(pm25.value)}</strong> {UI.homePm25Unit[locale]}
          </span>
          <StatusTag tone={PM25_TONE[pmAt]} label={UI[PM25_LABEL[pmAt]][locale]} />
        </span>
      ) : null}
      {advice.map((line) => (
        <span key={line}>{line}</span>
      ))}
    </TodayRow>
  );
}

function AlertRow({ locale, alert }: { locale: Locale; alert: ServiceAlert }) {
  return (
    <TodayRow
      title={pick(alert.title, locale)}
      href={localePath(locale, `/alerts/${alert._id}`)}
      status={<StatusTag tone={SEVERITY_TONE[alert.severity]} label={UI[SEVERITY_LABEL[alert.severity]][locale]} />}
    >
      <span>{pick(alert.body, locale)}</span>
    </TodayRow>
  );
}

function LibrariesRow({ locale, libraries, now }: { locale: Locale; libraries: CampusPlace[]; now: Date }) {
  const summary = summariseLibraries(libraries, now);
  const title = UI.homeLibraries[locale];
  const href = localePath(locale, "/places/libraries");

  if (summary.total === 0) {
    return (
      <TodayRow title={title} href={href}>
        <span>{UI.keyHoursNotPublished[locale]}</span>
      </TodayRow>
    );
  }

  const status =
    summary.open > 0 ? (
      <StatusTag tone="success" label={fillText(UI.homeLibrariesOpen[locale], { open: summary.open, total: summary.total })} />
    ) : (
      <StatusTag tone="neutral" label={UI.homeLibrariesAllClosed[locale]} />
    );

  return (
    <TodayRow title={title} href={href} status={status}>
      {summary.latest ? (
        <span>
          {fillText(UI[summary.latest.closesNextDay ? "homeLibrariesLatestTomorrow" : "homeLibrariesLatest"][locale], {
            name: pick(summary.latest.place.name, locale),
            time: summary.latest.closes,
          })}
        </span>
      ) : null}
      {summary.nextOpening ? (
        <span>
          {fillText(UI.homeLibrariesNext[locale], { name: pick(summary.nextOpening.place.name, locale), time: summary.nextOpening.opens })}
        </span>
      ) : null}
    </TodayRow>
  );
}

/** Places whose row needs a more specific icon than the one for /places. */
const PLACE_ICON: Record<string, LucideIcon> = { "tu-virtual-clinic": Cross };

function PlaceRow({ locale, place, status, now }: { locale: Locale; place: CampusPlace; status: PlaceHoursStatus; now: Date }) {
  const title = pick(place.name, locale);
  const href = localePath(locale, `/places/${place.slug.current}`);
  const icon = PLACE_ICON[place.slug.current];
  const nextOpen = place.closureNote ? null : nextOpenFor(place, now, status);

  switch (status.kind) {
    case "open":
      return (
        <TodayRow title={title} href={href} icon={icon} status={<StatusTag tone="success" label={UI.openNow[locale]} />}>
          <span>
            {status.closesNextDay
              ? fillText(UI.homeClosesTomorrow[locale], { time: status.closes })
              : `${UI.closesAt[locale]} ${status.closes}`}
          </span>
          {status.note ? <span>{pick(status.note, locale)}</span> : null}
        </TodayRow>
      );
    case "closed":
      return (
        <TodayRow title={title} href={href} icon={icon} status={<StatusTag tone="neutral" label={UI.closedNow[locale]} />}>
          {nextOpen ? <span>{nextOpenLine(locale, nextOpen, now)}</span> : null}
          {status.note ? <span>{pick(status.note, locale)}</span> : null}
        </TodayRow>
      );
    case "noHours":
      return (
        <TodayRow title={title} href={href} icon={icon}>
          <span>{UI.keyHoursNotPublished[locale]}</span>
        </TodayRow>
      );
  }
}

function nextOpenLine(locale: Locale, next: NonNullable<ReturnType<typeof nextOpenFor>>, now: Date): string {
  if (next.when === "today") return fillText(UI.htdOpensToday[locale], { time: next.opens });
  if (next.when === "tomorrow") return fillText(UI.htdOpensTomorrow[locale], { time: next.opens });
  const at = `${next.dateKey}T00:00:00.000Z`;
  const withinWeek = Date.parse(at) - Date.parse(`${bangkokDateKey(now)}T00:00:00.000Z`) < 7 * 24 * 60 * 60 * 1000;
  return fillText(UI.htdOpensOn[locale], { day: withinWeek ? formatWeekday(at, locale) : formatDateShort(at, locale), time: next.opens });
}
