import "server-only";

import { heatIndexC } from "./levels";

/** Thammasat University, Tha Prachan. */
const CAMPUS = { latitude: 13.7565, longitude: 100.4903 };
const REVALIDATE_SECONDS = 1800;
const TIMEOUT_MS = 4000;

export interface CampusWeather {
  heat: { index: number; temperature: number; humidity: number; time: string } | null;
  pm25: { value: number; time: string } | null;
}

async function fetchCurrent(base: string, fields: string): Promise<Record<string, unknown> | null> {
  const body = await fetchOpenMeteo(base, `current=${fields}`);
  return (body?.current as Record<string, unknown> | undefined) ?? null;
}

async function fetchOpenMeteo(base: string, query: string): Promise<Record<string, unknown> | null> {
  const url = `${base}?latitude=${CAMPUS.latitude}&longitude=${CAMPUS.longitude}&${query}&timezone=Asia%2FBangkok`;
  try {
    const response = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS, tags: ["weather"] }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) {
      console.error(`[weather] ${base} responded ${response.status}`);
      return null;
    }
    return (await response.json()) as Record<string, unknown>;
  } catch (error) {
    console.error(`[weather] ${base} failed`, error);
    return null;
  }
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const clock = (v: unknown): string => (typeof v === "string" ? v.slice(11, 16) : "");

/**
 * Model estimates for the campus from Open-Meteo (CC BY 4.0): the current
 * temperature and humidity, turned into a heat index, and the current PM2.5.
 * Either half is null when its request fails, so the page shows what it has.
 */
export async function getCampusWeather(): Promise<CampusWeather> {
  const [forecast, air] = await Promise.all([
    fetchCurrent("https://api.open-meteo.com/v1/forecast", "temperature_2m,relative_humidity_2m"),
    fetchCurrent("https://air-quality-api.open-meteo.com/v1/air-quality", "pm2_5"),
  ]);

  const temperature = num(forecast?.temperature_2m);
  const humidity = num(forecast?.relative_humidity_2m);
  const pm25 = num(air?.pm2_5);

  return {
    heat:
      temperature !== null && humidity !== null
        ? { index: heatIndexC(temperature, humidity), temperature, humidity, time: clock(forecast?.time) }
        : null,
    pm25: pm25 !== null ? { value: pm25, time: clock(air?.time) } : null,
  };
}

export interface HourlyReading {
  /** "HH:mm", Asia/Bangkok. */
  time: string;
  heatIndex: number | null;
  temperature: number | null;
  humidity: number | null;
  pm25: number | null;
}

export interface CampusWeatherToday {
  /** The rest of today, from the current hour, one row per hour. */
  hours: HourlyReading[];
}

const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/**
 * Hourly model estimates for the rest of today (Asia/Bangkok): temperature,
 * humidity and the heat index from them, and PM2.5. Empty when both requests
 * fail.
 */
export async function getCampusWeatherToday(now: Date = new Date()): Promise<CampusWeatherToday> {
  const [forecast, air] = await Promise.all([
    fetchOpenMeteo("https://api.open-meteo.com/v1/forecast", "hourly=temperature_2m,relative_humidity_2m&forecast_days=1"),
    fetchOpenMeteo("https://air-quality-api.open-meteo.com/v1/air-quality", "hourly=pm2_5&forecast_days=1"),
  ]);
  const fh = (forecast?.hourly ?? {}) as Record<string, unknown>;
  const ah = (air?.hourly ?? {}) as Record<string, unknown>;
  const pmByTime = new Map<string, number | null>();
  list(ah.time).forEach((t, i) => typeof t === "string" && pmByTime.set(t, num(list(ah.pm2_5)[i])));

  const times = list(fh.time).length > 0 ? list(fh.time) : list(ah.time);
  const currentHour = bangkokHourKey(now);
  const hours: HourlyReading[] = [];
  times.forEach((t, i) => {
    if (typeof t !== "string" || t.slice(0, 13) < currentHour) return;
    const temperature = num(list(fh.temperature_2m)[i]);
    const humidity = num(list(fh.relative_humidity_2m)[i]);
    hours.push({
      time: clock(t),
      temperature,
      humidity,
      heatIndex: temperature !== null && humidity !== null ? heatIndexC(temperature, humidity) : null,
      pm25: pmByTime.get(t) ?? null,
    });
  });
  return { hours };
}

/** "YYYY-MM-DDTHH" in Asia/Bangkok, the prefix Open-Meteo's hourly times share. */
function bangkokHourKey(now: Date): string {
  const shifted = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 13);
}
