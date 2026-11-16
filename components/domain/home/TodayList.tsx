import NextLink from "next/link";

import { fillText } from "@/components/domain/open-data/fill";
import { ShuttleTodayRows } from "@/components/domain/shuttle/ShuttleTodayRows";
import { Link as UiLink, StatusTag, Tag, type StatusTone } from "@/components/ui";
import { localePath, pick, type Locale } from "@/lib/i18n/config";
import { UI, type UiKey } from "@/lib/i18n/strings";
import type { AlertSeverity, CampusPlace, ServiceAlert, ShuttleRoute } from "@/lib/content/types";
import { HEAT_TONE, PM25_TONE, heatLevel, pm25Level, type HeatLevel, type Pm25Level } from "@/lib/weather/levels";
import type { CampusWeather } from "@/lib/weather/read";
import { getPlaceHoursStatus, summariseLibraries, type PlaceHoursStatus } from "./openingHours";
import { SectionBar } from "./SectionBar";
import { TODAY_LINK_CLASS, TodayRow } from "./TodayRow";

const HEADING_ID = "home-today-heading";
const LIBRARY_GUIDE_PATH = "/guide/tu-library";

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
  weatherSourceUrl: string;
  now: Date;
}

/**
 * Shuttles first, with any alert about them straight after; then the
 * libraries as one row, the other key places, the heat index and PM2.5 as
 * one row, and any remaining alert. The "Scheduled" tag sits once in the heading bar, with its
 * explainer under the list.
 */
export function TodayList({ locale, alerts, routes, places, libraries, weather, weatherSourceUrl, now }: TodayListProps) {
  const shuttleAlerts = alerts.filter((alert) => alert.affects?.includes("shuttle"));
  const otherAlerts = alerts.filter((alert) => !alert.affects?.includes("shuttle"));
  const nothingWithHours = places.length === 0 && libraries.length === 0;

  return (
    <section aria-labelledby={HEADING_ID}>
      <SectionBar id={HEADING_ID} tone="transport" aside={routes.length > 0 ? <Tag tone="neutral">{UI.scheduled[locale]}</Tag> : undefined}>
        {UI.homeToday[locale]}
      </SectionBar>

      <dl className="m-0 mt-[var(--space-2)]">
        <ShuttleTodayRows locale={locale} routes={routes} now={now} />
        {shuttleAlerts.map((alert) => (
          <AlertRow key={alert._id} locale={locale} alert={alert} />
        ))}

        {libraries.length > 0 ? <LibrariesRow locale={locale} libraries={libraries} now={now} /> : null}

        {places.map((place) => (
          <PlaceRow
            key={place._id}
            locale={locale}
            place={place}
            status={place.closureNote ? { kind: "closed", note: place.closureNote } : getPlaceHoursStatus(place, now)}
          />
        ))}

        {nothingWithHours ? (
          <TodayRow title={UI.keyHoursTitle[locale]}>
            <span>{UI.keyHoursNotPublished[locale]}</span>
          </TodayRow>
        ) : null}

        <WeatherRows locale={locale} weather={weather} />

        {otherAlerts.map((alert) => (
          <AlertRow key={alert._id} locale={locale} alert={alert} />
        ))}
      </dl>

      {routes.length > 0 ? (
        <p className="mb-0 mt-[var(--space-3)] text-[length:var(--text-sm)] text-ink-600">
          {UI.scheduled[locale]}: {UI.scheduledExplainer[locale]}
        </p>
      ) : null}
      {weather.heat || weather.pm25 ? (
        <WeatherSource locale={locale} url={weatherSourceUrl} time={weather.heat?.time || weather.pm25?.time || ""} />
      ) : null}
      <NextLink
        href={localePath(locale, "/getting-around")}
        className="inline-flex min-h-[var(--target-min)] items-center font-semibold"
      >
        {UI.homeFullTimetable[locale]}
      </NextLink>
    </section>
  );
}

function WeatherRows({ locale, weather }: { locale: Locale; weather: CampusWeather }) {
  const { heat, pm25 } = weather;
  if (!heat && !pm25) return null;
  const heatAt = heat ? heatLevel(heat.index) : null;
  const pmAt = pm25 ? pm25Level(pm25.value) : null;
  const advice: string[] = [];
  if (heat && heat.index >= 42) advice.push(UI.homeHeatAdvice[locale]);
  if (pm25 && pm25.value > 37.5) advice.push(UI.homePm25Advice[locale]);
  return (
    <TodayRow title={UI.homeWeather[locale]}>
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

function WeatherSource({ locale, url, time }: { locale: Locale; url: string; time: string }) {
  const [before, after] = fillText(UI.homeWeatherSource[locale], { time }).split("{source}");
  return (
    <p className="mb-0 mt-[var(--space-1)] text-[length:var(--text-sm)] text-ink-600">
      {before}
      <UiLink href={url} locale={locale}>
        Open-Meteo
      </UiLink>
      {after}
    </p>
  );
}

function AlertRow({ locale, alert }: { locale: Locale; alert: ServiceAlert }) {
  return (
    <TodayRow
      title={
        alert.moreInfoUrl ? (
          <UiLink href={alert.moreInfoUrl} locale={locale} className={TODAY_LINK_CLASS}>
            {pick(alert.title, locale)}
          </UiLink>
        ) : (
          pick(alert.title, locale)
        )
      }
      status={<StatusTag tone={SEVERITY_TONE[alert.severity]} label={UI[SEVERITY_LABEL[alert.severity]][locale]} />}
    >
      <span>{pick(alert.body, locale)}</span>
    </TodayRow>
  );
}

function LibrariesRow({ locale, libraries, now }: { locale: Locale; libraries: CampusPlace[]; now: Date }) {
  const summary = summariseLibraries(libraries, now);
  const title = (
    <NextLink href={localePath(locale, LIBRARY_GUIDE_PATH)} className={TODAY_LINK_CLASS}>
      {UI.homeLibraries[locale]}
    </NextLink>
  );

  if (summary.total === 0) {
    return (
      <TodayRow title={title}>
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
    <TodayRow title={title} status={status}>
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

function PlaceRow({ locale, place, status }: { locale: Locale; place: CampusPlace; status: PlaceHoursStatus }) {
  const title = pick(place.name, locale);

  switch (status.kind) {
    case "open":
      return (
        <TodayRow title={title} status={<StatusTag tone="success" label={UI.openNow[locale]} />}>
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
        <TodayRow title={title} status={<StatusTag tone="neutral" label={UI.closedNow[locale]} />}>
          {status.opensNext ? (
            <span>
              {UI.opensAt[locale]} {status.opensNext}
            </span>
          ) : null}
          {status.note ? <span>{pick(status.note, locale)}</span> : null}
        </TodayRow>
      );
    case "noHours":
      return (
        <TodayRow title={title}>
          <span>{UI.keyHoursNotPublished[locale]}</span>
        </TodayRow>
      );
  }
}
