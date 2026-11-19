import { describe, expect, it } from "vitest";
import { validateTodaySettingsForm } from "@/app/admin/content/today/validate";
import { normaliseTodayRows } from "@/lib/content/today";
import { HEAT_LEVELS, PM25_LEVELS, TODAY_ROW_KEYS } from "@/lib/db/schema/content/today";
import { DEFAULT_HEAT_ADVICE, DEFAULT_PM25_ADVICE } from "@/lib/weather/advice";

function form(overrides: Record<string, string | null> = {}): FormData {
  const fd = new FormData();
  TODAY_ROW_KEYS.forEach((key, i) => {
    fd.set(`rows.${key}.position`, String(i + 1));
    fd.set(`rows.${key}.visible`, "on");
  });
  for (const level of HEAT_LEVELS) {
    fd.set(`heatAdvice.${level}.th`, DEFAULT_HEAT_ADVICE[level].th);
    fd.set(`heatAdvice.${level}.en`, DEFAULT_HEAT_ADVICE[level].en);
  }
  for (const level of PM25_LEVELS) {
    fd.set(`pm25Advice.${level}.th`, DEFAULT_PM25_ADVICE[level].th);
    fd.set(`pm25Advice.${level}.en`, DEFAULT_PM25_ADVICE[level].en);
  }
  fd.set("librariesGuidePath", "/guide/tu-library");
  for (const [name, value] of Object.entries(overrides)) {
    if (value === null) fd.delete(name);
    else fd.set(name, value);
  }
  return fd;
}

describe("validateTodaySettingsForm", () => {
  it("orders the rows by position and keeps visibility", () => {
    const result = validateTodaySettingsForm({
      locale: "en",
      formData: form({ "rows.weather.position": "1", "rows.shuttle.position": "4", "rows.libraries.visible": null }),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.rows).toEqual([
      { key: "weather", visible: true },
      { key: "libraries", visible: false },
      { key: "places", visible: true },
      { key: "shuttle", visible: true },
      { key: "alerts", visible: true },
    ]);
  });

  it("refuses two rows in the same position", () => {
    const result = validateTodaySettingsForm({ locale: "en", formData: form({ "rows.places.position": "1" }) });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors["rows.places.position"]).toBeTruthy();
  });

  it("needs advice in both languages", () => {
    const result = validateTodaySettingsForm({ locale: "en", formData: form({ "heatAdvice.danger.en": "" }) });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors["heatAdvice.danger.en"]).toBeTruthy();
  });
});

describe("normaliseTodayRows", () => {
  it("keeps the stored order, drops unknown and repeated keys, and appends missing ones visible", () => {
    expect(
      normaliseTodayRows([
        { key: "weather", visible: false },
        { key: "nonsense", visible: true },
        { key: "weather", visible: true },
        { key: "shuttle", visible: true },
      ]),
    ).toEqual([
      { key: "weather", visible: false },
      { key: "shuttle", visible: true },
      { key: "libraries", visible: true },
      { key: "places", visible: true },
      { key: "alerts", visible: true },
    ]);
  });
});
