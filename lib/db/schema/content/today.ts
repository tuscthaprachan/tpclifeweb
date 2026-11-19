import { sql } from "drizzle-orm";
import { check, jsonb, pgTable, text, unique } from "drizzle-orm/pg-core";
import { contentColumns, type LocaleStringJson } from "./common";

export const TODAY_ROW_KEYS = ["shuttle", "libraries", "places", "weather", "alerts"] as const;
export type TodayRowKey = (typeof TODAY_ROW_KEYS)[number];

export const HEAT_LEVELS = ["normal", "watch", "warning", "danger", "extremeDanger"] as const;
export const PM25_LEVELS = ["veryGood", "good", "moderate", "startingToAffect", "affectsHealth"] as const;

export interface TodayRowSettingJson {
  key: TodayRowKey;
  visible: boolean;
}

export type LevelAdviceJson<K extends string> = Partial<Record<K, LocaleStringJson>>;

/**
 * Settings for the home page's Today block and the pages its rows open: the
 * order and visibility of the rows, the advice shown for each heat index and
 * PM2.5 level, and the editorial notes on the libraries and weather pages.
 * One row, like the canteen settings. The level thresholds stay in code
 * (lib/weather/levels.ts): they are the Thai government's published scales.
 */
export const todaySettings = pgTable(
  "today_settings",
  {
    ...contentColumns(),
    singletonKey: text("singleton_key").notNull().default("today"),
    rows: jsonb("rows").$type<TodayRowSettingJson[]>().notNull().default(sql`'[]'::jsonb`),
    heatAdvice: jsonb("heat_advice").$type<LevelAdviceJson<(typeof HEAT_LEVELS)[number]>>().notNull().default(sql`'{}'::jsonb`),
    pm25Advice: jsonb("pm25_advice").$type<LevelAdviceJson<(typeof PM25_LEVELS)[number]>>().notNull().default(sql`'{}'::jsonb`),
    weatherNoteTh: text("weather_note_th"),
    weatherNoteEn: text("weather_note_en"),
    librariesIntroTh: text("libraries_intro_th"),
    librariesIntroEn: text("libraries_intro_en"),
    librariesGuidePath: text("libraries_guide_path"),
  },
  (t) => [check("today_settings_singleton", sql`${t.singletonKey} = 'today'`), unique("today_settings_singleton_key").on(t.singletonKey)],
);

export type TodaySettingsRow = typeof todaySettings.$inferSelect;
