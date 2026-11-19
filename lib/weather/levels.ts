/**
 * Heat index and PM2.5 levels on the Thai government scales.
 *
 * Heat index: the US National Weather Service formula (Rothfusz regression
 * with its adjustments), which the Thai Department of Health also uses, with
 * the department's levels: watch from 27, warning from 33, danger from 42 and
 * extreme danger from 52 degrees Celsius.
 *
 * PM2.5: the Pollution Control Department's bands in force since 1 June 2023,
 * in micrograms per cubic metre. They are set for a 24 hour average; an hourly
 * value is placed on the same bands as a guide.
 */

export type WeatherTone = "success" | "info" | "warning" | "error";

export type HeatLevel = "normal" | "watch" | "warning" | "danger" | "extremeDanger";
export type Pm25Level = "veryGood" | "good" | "moderate" | "startingToAffect" | "affectsHealth";

/** Heat index in degrees Celsius from air temperature (Celsius) and relative humidity (per cent). */
export function heatIndexC(temperatureC: number, humidity: number): number {
  const t = (temperatureC * 9) / 5 + 32;
  const rh = humidity;
  let hi = 0.5 * (t + 61 + (t - 68) * 1.2 + rh * 0.094);
  if ((hi + t) / 2 >= 80) {
    hi =
      -42.379 +
      2.04901523 * t +
      10.14333127 * rh -
      0.22475541 * t * rh -
      0.00683783 * t * t -
      0.05481717 * rh * rh +
      0.00122874 * t * t * rh +
      0.00085282 * t * rh * rh -
      0.00000199 * t * t * rh * rh;
    if (rh < 13 && t >= 80 && t <= 112) hi -= ((13 - rh) / 4) * Math.sqrt((17 - Math.abs(t - 95)) / 17);
    else if (rh > 85 && t >= 80 && t <= 87) hi += ((rh - 85) / 10) * ((87 - t) / 5);
  }
  return ((hi - 32) * 5) / 9;
}

export function heatLevel(heatIndex: number): HeatLevel {
  if (heatIndex >= 52) return "extremeDanger";
  if (heatIndex >= 42) return "danger";
  if (heatIndex >= 33) return "warning";
  if (heatIndex >= 27) return "watch";
  return "normal";
}

export function pm25Level(pm25: number): Pm25Level {
  if (pm25 > 75) return "affectsHealth";
  if (pm25 > 37.5) return "startingToAffect";
  if (pm25 > 25) return "moderate";
  if (pm25 > 15) return "good";
  return "veryGood";
}

export const HEAT_TONE: Record<HeatLevel, WeatherTone> = {
  normal: "success",
  watch: "info",
  warning: "warning",
  danger: "error",
  extremeDanger: "error",
};

export const PM25_TONE: Record<Pm25Level, WeatherTone> = {
  veryGood: "success",
  good: "success",
  moderate: "info",
  startingToAffect: "warning",
  affectsHealth: "error",
};

export const HEAT_ORDER: readonly HeatLevel[] = ["normal", "watch", "warning", "danger", "extremeDanger"];
export const PM25_ORDER: readonly Pm25Level[] = ["veryGood", "good", "moderate", "startingToAffect", "affectsHealth"];

/** Inclusive lower and exclusive upper bound of each heat level, in degrees Celsius. */
export const HEAT_RANGE: Record<HeatLevel, { from?: number; below?: number }> = {
  normal: { below: 27 },
  watch: { from: 27, below: 33 },
  warning: { from: 33, below: 42 },
  danger: { from: 42, below: 52 },
  extremeDanger: { from: 52 },
};

/** Exclusive lower and inclusive upper bound of each PM2.5 band, in micrograms per cubic metre. */
export const PM25_RANGE: Record<Pm25Level, { above?: number; upTo?: number }> = {
  veryGood: { upTo: 15 },
  good: { above: 15, upTo: 25 },
  moderate: { above: 25, upTo: 37.5 },
  startingToAffect: { above: 37.5, upTo: 75 },
  affectsHealth: { above: 75 },
};

/** Levels at which the home page repeats the advice under the reading. */
export const HEAT_ADVISE_FROM: HeatLevel = "danger";
export const PM25_ADVISE_FROM: Pm25Level = "startingToAffect";

export function atOrAbove<L extends string>(order: readonly L[], level: L, threshold: L): boolean {
  return order.indexOf(level) >= order.indexOf(threshold);
}
