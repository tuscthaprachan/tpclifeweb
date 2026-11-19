import { z } from "zod";
import { fieldKit, formDataToObject, parseForm } from "@/lib/admin/content/fields";
import type { FieldErrors } from "@/lib/admin/content/form-state";
import { HEAT_LEVELS, PM25_LEVELS, TODAY_ROW_KEYS, type TodayRowSettingJson } from "@/lib/db/schema/content/today";
import { a, type AdminKey } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";

export const ROW_LABEL: Record<(typeof TODAY_ROW_KEYS)[number], AdminKey> = {
  shuttle: "tdsRowShuttle",
  libraries: "tdsRowLibraries",
  places: "tdsRowPlaces",
  weather: "tdsRowWeather",
  alerts: "tdsRowAlerts",
};

export const HEAT_LABEL: Record<(typeof HEAT_LEVELS)[number], AdminKey> = {
  normal: "tdsHeatNormal",
  watch: "tdsHeatWatch",
  warning: "tdsHeatWarning",
  danger: "tdsHeatDanger",
  extremeDanger: "tdsHeatExtremeDanger",
};

export const PM25_LABEL: Record<(typeof PM25_LEVELS)[number], AdminKey> = {
  veryGood: "tdsPm25VeryGood",
  good: "tdsPm25Good",
  moderate: "tdsPm25Moderate",
  startingToAffect: "tdsPm25StartingToAffect",
  affectsHealth: "tdsPm25AffectsHealth",
};

/** Everything the Today settings form must satisfy. Always live, like the canteen settings, so every advice line needs both languages. */
export function validateTodaySettingsForm(input: { locale: Locale; formData: FormData }) {
  const { locale, formData } = input;
  const L = (key: AdminKey) => a(key, locale);
  const k = fieldKit(locale, true);

  const rowShape = (key: (typeof TODAY_ROW_KEYS)[number]) =>
    z.object({ position: k.integer(`${L("tdsFieldPosition")}: ${L(ROW_LABEL[key])}`, { min: 1, max: TODAY_ROW_KEYS.length, required: true }), visible: k.checkbox() });
  const advice = <K extends string>(levels: readonly K[], labels: Record<K, AdminKey>) =>
    z.object(Object.fromEntries(levels.map((level) => [level, k.bilingual(L(labels[level]), { required: true, max: 300 })])) as Record<K, ReturnType<typeof k.bilingual>>);

  const schema = z.object({
    rows: z.object(Object.fromEntries(TODAY_ROW_KEYS.map((key) => [key, rowShape(key)])) as Record<(typeof TODAY_ROW_KEYS)[number], ReturnType<typeof rowShape>>),
    heatAdvice: advice(HEAT_LEVELS, HEAT_LABEL),
    pm25Advice: advice(PM25_LEVELS, PM25_LABEL),
    weatherNote: k.bilingual(L("tdsFieldWeatherNote"), { max: 1000 }),
    librariesIntro: k.bilingual(L("tdsFieldLibrariesIntro"), { max: 500 }),
    librariesGuidePath: k.href(L("tdsFieldLibrariesGuide")),
  });

  const parsed = parseForm(schema, formDataToObject(formData));
  const errors: FieldErrors = parsed.ok ? {} : { ...parsed.errors };

  if (parsed.ok) {
    const seen = new Map<number, string>();
    for (const key of TODAY_ROW_KEYS) {
      const position = parsed.data.rows[key].position;
      if (position === null) continue;
      if (seen.has(position)) errors[`rows.${key}.position`] = L("tdsErrPositionTaken");
      else seen.set(position, key);
    }
  }

  if (!parsed.ok || Object.keys(errors).length > 0) return { ok: false as const, errors };
  const { data } = parsed;
  const rows: TodayRowSettingJson[] = [...TODAY_ROW_KEYS]
    .sort((x, y) => (data.rows[x].position ?? 0) - (data.rows[y].position ?? 0))
    .map((key) => ({ key, visible: data.rows[key].visible }));
  return { ok: true as const, data: { ...data, rows } };
}
