import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { fillText } from "@/components/domain/open-data/fill";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container, DataTable, Heading, InsetText, Stack, StatusTag } from "@/components/ui";
import { getTodaySettings, type TodaySettings } from "@/lib/content";
import { DEFAULT_LOCALE, isLocale, pick, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI, type UiKey } from "@/lib/i18n/strings";
import {
  HEAT_ORDER,
  HEAT_RANGE,
  HEAT_TONE,
  PM25_ORDER,
  PM25_RANGE,
  PM25_TONE,
  heatLevel,
  pm25Level,
  type HeatLevel,
  type Pm25Level,
} from "@/lib/weather/levels";
import { getCampusWeather, getCampusWeatherToday, type HourlyReading } from "@/lib/weather/read";

export const revalidate = 60;

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

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return { alternates: alternatesFor(locale, "/weather"), title: UI.tdWeatherTitle[locale], description: UI.tdWeatherIntro[locale] };
}

function heatRangeText(level: HeatLevel, locale: Locale): string {
  const { from, below } = HEAT_RANGE[level];
  if (from === undefined) return fillText(UI.tdBelow[locale], { n: `${below}°C` });
  if (below === undefined) return fillText(UI.tdAtLeast[locale], { n: `${from}°C` });
  return `${fillText(UI.tdFromTo[locale], { from, to: below - 1 })}°C`;
}

function pm25RangeText(level: Pm25Level, locale: Locale): string {
  const { above, upTo } = PM25_RANGE[level];
  if (above === undefined) return fillText(UI.tdUpTo[locale], { n: upTo! });
  if (upTo === undefined) return fillText(UI.tdAbove[locale], { n: above });
  return fillText(UI.tdFromTo[locale], { from: Math.round((above + 0.1) * 10) / 10, to: upTo });
}

function peak<K extends "heatIndex" | "pm25">(hours: HourlyReading[], key: K): HourlyReading | null {
  let best: HourlyReading | null = null;
  for (const hour of hours) if (hour[key] !== null && (best === null || hour[key]! > best[key]!)) best = hour;
  return best;
}

/**
 * The full picture behind the home page's weather row: the readings now with
 * what to do, the rest of today hour by hour with the peak called out, what
 * every level means, and where the numbers come from. Tables, no charts.
 */
export default async function WeatherPage({ params }: Props) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const now = new Date();
  const [weather, today, settings] = await Promise.all([getCampusWeather(), getCampusWeatherToday(now), getTodaySettings()]);
  const heatAt = weather.heat ? heatLevel(weather.heat.index) : null;
  const pmAt = weather.pm25 ? pm25Level(weather.pm25.value) : null;
  const hottest = peak(today.hours, "heatIndex");
  const dustiest = peak(today.hours, "pm25");
  const unit = UI.homePm25Unit[locale];

  return (
    <Container>
      <Breadcrumbs locale={locale} items={[{ label: UI.home[locale], path: "/" }, { label: UI.tdWeatherTitle[locale] }]} />

      <Stack space={8} className="pb-[var(--space-12)]">
        <Stack space={3}>
          <Heading level={1} className="m-0">
            {UI.tdWeatherTitle[locale]}
          </Heading>
          <p className="m-0 max-w-[var(--measure-en)] text-lg text-ink-900">{UI.tdWeatherIntro[locale]}</p>
        </Stack>

        <div className="grid gap-[var(--space-8)] sm:grid-cols-2">
          <Stack space={3} as="section">
            <Heading level={2}>{UI.tdHeatNow[locale]}</Heading>
            {weather.heat && heatAt ? (
              <>
                <p className="m-0 flex flex-wrap items-baseline gap-x-[var(--space-3)]">
                  <span className="text-4xl font-bold tabular-nums text-ink-900">{Math.round(weather.heat.index)}°C</span>
                  <StatusTag tone={HEAT_TONE[heatAt]} label={UI[HEAT_LABEL[heatAt]][locale]} />
                </p>
                <p className="m-0 text-ink-600">
                  {fillText(UI.tdFeelsLike[locale], { t: Math.round(weather.heat.temperature), h: Math.round(weather.heat.humidity) })}.{" "}
                  {weather.heat.time ? fillText(UI.tdReadingAt[locale], { time: weather.heat.time }) : null}
                </p>
                <InsetText>
                  <strong>{UI.tdWhatToDo[locale]}: </strong>
                  {pick(settings.heatAdvice[heatAt], locale)}
                </InsetText>
              </>
            ) : (
              <p className="m-0">{UI.tdWeatherUnavailable[locale]}</p>
            )}
          </Stack>

          <Stack space={3} as="section">
            <Heading level={2}>{UI.tdPm25Now[locale]}</Heading>
            {weather.pm25 && pmAt ? (
              <>
                <p className="m-0 flex flex-wrap items-baseline gap-x-[var(--space-3)]">
                  <span className="text-4xl font-bold tabular-nums text-ink-900">
                    {Math.round(weather.pm25.value)} <span className="text-lg font-normal">{unit}</span>
                  </span>
                  <StatusTag tone={PM25_TONE[pmAt]} label={UI[PM25_LABEL[pmAt]][locale]} />
                </p>
                {weather.pm25.time ? <p className="m-0 text-ink-600">{fillText(UI.tdReadingAt[locale], { time: weather.pm25.time })}</p> : null}
                <InsetText>
                  <strong>{UI.tdWhatToDo[locale]}: </strong>
                  {pick(settings.pm25Advice[pmAt], locale)}
                </InsetText>
              </>
            ) : (
              <p className="m-0">{UI.tdWeatherUnavailable[locale]}</p>
            )}
          </Stack>
        </div>

        {today.hours.length > 0 ? (
          <Stack space={3} as="section">
            <Heading level={2}>{UI.tdRestOfToday[locale]}</Heading>
            {hottest?.heatIndex != null || dustiest?.pm25 != null ? (
              <ul className="m-0 flex flex-col gap-[var(--space-1)] ps-[var(--space-6)]">
                {hottest?.heatIndex != null ? (
                  <li>
                    {fillText(UI.tdPeakHeat[locale], {
                      time: hottest.time,
                      value: Math.round(hottest.heatIndex),
                      level: UI[HEAT_LABEL[heatLevel(hottest.heatIndex)]][locale],
                    })}
                  </li>
                ) : null}
                {dustiest?.pm25 != null ? (
                  <li>
                    {fillText(UI.tdPeakPm25[locale], {
                      time: dustiest.time,
                      value: Math.round(dustiest.pm25),
                      unit,
                      level: UI[PM25_LABEL[pm25Level(dustiest.pm25)]][locale],
                    })}
                  </li>
                ) : null}
              </ul>
            ) : null}
            <HourlyTable locale={locale} hours={today.hours} />
          </Stack>
        ) : null}

        <Stack space={4} as="section">
          <Heading level={2}>{UI.tdLevels[locale]}</Heading>
          <LevelTable locale={locale} kind="heat" current={heatAt} settings={settings} />
          <LevelTable locale={locale} kind="pm25" current={pmAt} settings={settings} />
        </Stack>

        <Stack space={2} as="section">
          <Heading level={2}>{UI.tdWeatherSource[locale]}</Heading>
          <p className="m-0 max-w-[var(--measure-en)]">{UI.tdWeatherSourceBody[locale]}</p>
          {settings.weatherNote ? <p className="m-0 max-w-[var(--measure-en)] whitespace-pre-line">{pick(settings.weatherNote, locale)}</p> : null}
        </Stack>
      </Stack>
    </Container>
  );
}

function HourlyTable({ locale, hours }: { locale: Locale; hours: HourlyReading[] }) {
  return (
    <DataTable
      caption={UI.tdRestOfTodayCaption[locale]}
      rows={hours}
      getRowKey={(hour) => hour.time}
      columns={[
        { id: "time", header: UI.tdTime[locale], rowHeader: true, cell: (hour) => <span className="tabular-nums">{hour.time}</span> },
        {
          id: "heat",
          header: UI.homeHeatIndex[locale],
          cell: (hour) =>
            hour.heatIndex === null ? (
              ""
            ) : (
              <span className="flex flex-wrap items-baseline gap-x-[var(--space-2)]">
                <span className="tabular-nums">{Math.round(hour.heatIndex)}°C</span>
                <StatusTag tone={HEAT_TONE[heatLevel(hour.heatIndex)]} label={UI[HEAT_LABEL[heatLevel(hour.heatIndex)]][locale]} />
              </span>
            ),
        },
        {
          id: "pm25",
          header: `${UI.homePm25[locale]} (${UI.homePm25Unit[locale]})`,
          cell: (hour) =>
            hour.pm25 === null ? (
              ""
            ) : (
              <span className="flex flex-wrap items-baseline gap-x-[var(--space-2)]">
                <span className="tabular-nums">{Math.round(hour.pm25)}</span>
                <StatusTag tone={PM25_TONE[pm25Level(hour.pm25)]} label={UI[PM25_LABEL[pm25Level(hour.pm25)]][locale]} />
              </span>
            ),
        },
      ]}
    />
  );
}

function LevelTable({
  locale,
  kind,
  current,
  settings,
}: {
  locale: Locale;
  kind: "heat" | "pm25";
  current: HeatLevel | Pm25Level | null;
  settings: TodaySettings;
}) {
  const levels = (kind === "heat" ? HEAT_ORDER : PM25_ORDER) as readonly string[];
  return (
    <DataTable
      caption={kind === "heat" ? UI.tdHeatLevelsCaption[locale] : UI.tdPm25LevelsCaption[locale]}
      rows={[...levels]}
      getRowKey={(level) => level}
      columns={[
        {
          id: "level",
          header: UI.tdLevel[locale],
          rowHeader: true,
          cell: (level) => (
            <span className="flex flex-wrap items-baseline gap-x-[var(--space-2)]">
              <StatusTag
                tone={kind === "heat" ? HEAT_TONE[level as HeatLevel] : PM25_TONE[level as Pm25Level]}
                label={UI[kind === "heat" ? HEAT_LABEL[level as HeatLevel] : PM25_LABEL[level as Pm25Level]][locale]}
              />
              {level === current ? <strong>{UI.tdCurrentLevel[locale]}</strong> : null}
            </span>
          ),
        },
        {
          id: "range",
          header: kind === "heat" ? UI.tdRange[locale] : `${UI.tdRange[locale]} (${UI.homePm25Unit[locale]})`,
          cell: (level) => (kind === "heat" ? heatRangeText(level as HeatLevel, locale) : pm25RangeText(level as Pm25Level, locale)),
        },
        {
          id: "advice",
          header: UI.tdAdvice[locale],
          cell: (level) => pick(kind === "heat" ? settings.heatAdvice[level as HeatLevel] : settings.pm25Advice[level as Pm25Level], locale),
        },
      ]}
    />
  );
}
