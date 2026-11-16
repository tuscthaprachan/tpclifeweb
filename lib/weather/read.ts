import "server-only";

import { heatIndexC } from "./levels";

/** Thammasat University, Tha Prachan. */
const CAMPUS = { latitude: 13.7565, longitude: 100.4903 };
const REVALIDATE_SECONDS = 1800;
const TIMEOUT_MS = 4000;

export const WEATHER_SOURCE_URL = "https://open-meteo.com/";

export interface CampusWeather {
  heat: { index: number; temperature: number; humidity: number; time: string } | null;
  pm25: { value: number; time: string } | null;
}

async function fetchCurrent(base: string, fields: string): Promise<Record<string, unknown> | null> {
  const url = `${base}?latitude=${CAMPUS.latitude}&longitude=${CAMPUS.longitude}&current=${fields}&timezone=Asia%2FBangkok`;
  try {
    const response = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS, tags: ["weather"] }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) {
      console.error(`[weather] ${base} responded ${response.status}`);
      return null;
    }
    const body = (await response.json()) as { current?: Record<string, unknown> };
    return body.current ?? null;
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
