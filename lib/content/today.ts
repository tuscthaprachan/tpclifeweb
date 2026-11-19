import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import type { AuditExecutor } from "@/lib/db/audit";
import { TODAY_ROW_KEYS, todaySettings, type TodayRowKey } from "@/lib/db/schema";
import type { LocaleString } from "@/lib/i18n/config";
import { DEFAULT_HEAT_ADVICE, DEFAULT_PM25_ADVICE } from "@/lib/weather/advice";
import type { HeatLevel, Pm25Level } from "@/lib/weather/levels";
import { CACHE_TAGS, REVALIDATE, cachedRead } from "./cache";
import { lsOpt, opt } from "./map";
import { safeFetch } from "./safe-fetch";

export const DEFAULT_LIBRARY_GUIDE_PATH = "/guide/tu-library";

export interface TodaySettings {
  /** Every row key once, in display order. */
  rows: { key: TodayRowKey; visible: boolean }[];
  heatAdvice: Record<HeatLevel, LocaleString>;
  pm25Advice: Record<Pm25Level, LocaleString>;
  weatherNote?: LocaleString;
  librariesIntro?: LocaleString;
  librariesGuidePath: string;
}

/** Stored rows first, in their order, then any key they leave out, visible. */
export function normaliseTodayRows(stored: readonly { key: string; visible: boolean }[]): TodaySettings["rows"] {
  const seen = new Set<TodayRowKey>();
  const out: TodaySettings["rows"] = [];
  for (const row of stored) {
    const key = row.key as TodayRowKey;
    if (!TODAY_ROW_KEYS.includes(key) || seen.has(key)) continue;
    seen.add(key);
    out.push({ key, visible: row.visible });
  }
  for (const key of TODAY_ROW_KEYS) if (!seen.has(key)) out.push({ key, visible: true });
  return out;
}

function mergeAdvice<K extends string>(defaults: Record<K, LocaleString>, stored: Partial<Record<K, { th: string; en: string }>>): Record<K, LocaleString> {
  const out = { ...defaults };
  for (const key of Object.keys(defaults) as K[]) {
    const value = stored[key];
    if (value?.th && value?.en) out[key] = { th: value.th, en: value.en };
  }
  return out;
}

export const DEFAULT_TODAY_SETTINGS: TodaySettings = {
  rows: normaliseTodayRows([]),
  heatAdvice: DEFAULT_HEAT_ADVICE,
  pm25Advice: DEFAULT_PM25_ADVICE,
  librariesGuidePath: DEFAULT_LIBRARY_GUIDE_PATH,
};

export async function readTodaySettings(db: AuditExecutor): Promise<TodaySettings> {
  const [row] = await db.select().from(todaySettings).where(eq(todaySettings.status, "published")).limit(1);
  if (!row) return DEFAULT_TODAY_SETTINGS;
  return {
    rows: normaliseTodayRows(row.rows),
    heatAdvice: mergeAdvice(DEFAULT_HEAT_ADVICE, row.heatAdvice),
    pm25Advice: mergeAdvice(DEFAULT_PM25_ADVICE, row.pm25Advice),
    weatherNote: lsOpt(row.weatherNoteTh, row.weatherNoteEn),
    librariesIntro: lsOpt(row.librariesIntroTh, row.librariesIntroEn),
    librariesGuidePath: opt(row.librariesGuidePath) ?? DEFAULT_LIBRARY_GUIDE_PATH,
  };
}

const cachedTodaySettings = cachedRead(["today-settings"], [CACHE_TAGS.today], REVALIDATE.content, () => readTodaySettings(getDb()));

export async function getTodaySettings(): Promise<TodaySettings> {
  return safeFetch<TodaySettings>("getTodaySettings", () => cachedTodaySettings(), DEFAULT_TODAY_SETTINGS);
}
