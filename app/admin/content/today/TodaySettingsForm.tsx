import { asc } from "drizzle-orm";
import { CloudSun, ListOrdered, Thermometer, FileText } from "lucide-react";
import { ContentForm, type ContentRecordInfo } from "@/components/admin/content/ContentForm";
import { BilingualTextarea, CheckboxField, EnumSelect, TextField } from "@/components/admin/content/fields";
import { FormSection } from "@/components/admin/content/FormSection";
import { SectionJumpNav } from "@/components/admin/content/SectionJumpNav";
import { Stack } from "@/components/ui";
import { userNames } from "@/lib/admin/content/list";
import { DEFAULT_LIBRARY_GUIDE_PATH, normaliseTodayRows } from "@/lib/content/today";
import { getDb } from "@/lib/db";
import { HEAT_LEVELS, PM25_LEVELS, TODAY_ROW_KEYS, todaySettings } from "@/lib/db/schema";
import { a, type AdminKey } from "@/lib/i18n/admin";
import { localePath, type Locale } from "@/lib/i18n/config";
import { DEFAULT_HEAT_ADVICE, DEFAULT_PM25_ADVICE } from "@/lib/weather/advice";
import { saveTodaySettings } from "./actions";
import { HEAT_LABEL, PM25_LABEL, ROW_LABEL } from "./validate";

/** The Today settings form. One row: edited in place, created on first save, prefilled with the defaults the site uses until then. */
export async function TodaySettingsForm({ locale, saved }: { locale: Locale; saved?: string }) {
  const db = getDb();
  const L = (key: AdminKey) => a(key, locale);
  const [settings] = await db.select().from(todaySettings).orderBy(asc(todaySettings.createdAt)).limit(1);
  const names = await userNames(db, [settings?.updatedBy]);

  const record: ContentRecordInfo | undefined = settings
    ? {
        id: settings.id,
        status: settings.status,
        updatedAt: settings.updatedAt.toISOString(),
        updatedByName: settings.updatedBy ? names.get(settings.updatedBy) : null,
        viewHref: localePath(locale, "/"),
      }
    : undefined;

  const rows = normaliseTodayRows(settings?.rows ?? []);
  const positionOptions = TODAY_ROW_KEYS.map((_, i) => ({ value: String(i + 1), label: String(i + 1) }));

  return (
    <ContentForm
      key={record?.updatedAt}
      locale={locale}
      action={saveTodaySettings.bind(null, settings?.id ?? null)}
      record={record}
      listHref="/admin/content"
      saved={saved}
      hasStatus={false}
    >
      <p className="m-0">{L("tdsIntro")}</p>
      <SectionJumpNav
        label={L("fmSectionsNav")}
        items={[
          { id: "tds-rows", label: L("tdsGroupRows") },
          { id: "tds-heat", label: L("tdsGroupHeat") },
          { id: "tds-pm25", label: L("tdsGroupPm25") },
          { id: "tds-pages", label: L("tdsGroupPages") },
        ]}
      />

      <FormSection collapsible defaultOpen errorPrefixes={["rows."]} id="tds-rows" icon={ListOrdered} legend={L("tdsGroupRows")} hint={L("tdsHintRows")}>
        <Stack space={4}>
          {rows.map((row, index) => (
            <fieldset key={row.key} className="m-0 grid gap-[var(--space-3)] border-0 border-b border-line p-0 pb-[var(--space-4)] md:grid-cols-[1fr_8rem_auto] md:items-end">
              <legend className="mb-[var(--space-2)] p-0 font-bold">{L(ROW_LABEL[row.key])}</legend>
              <EnumSelect name={`rows.${row.key}.position`} label={L("tdsFieldPosition")} defaultValue={String(index + 1)} options={positionOptions} />
              <CheckboxField name={`rows.${row.key}.visible`} label={L("tdsFieldShow")} defaultChecked={row.visible} />
            </fieldset>
          ))}
        </Stack>
      </FormSection>

      <FormSection collapsible errorPrefixes={["heatAdvice."]} id="tds-heat" icon={Thermometer} legend={L("tdsGroupHeat")} hint={L("tdsHintHeat")}>
        <Stack space={4}>
          {HEAT_LEVELS.map((level) => (
            <BilingualTextarea
              key={level}
              name={`heatAdvice.${level}`}
              label={L(HEAT_LABEL[level])}
              rows={2}
              maxLength={300}
              defaultValue={settings?.heatAdvice[level] ?? DEFAULT_HEAT_ADVICE[level]}
            />
          ))}
        </Stack>
      </FormSection>

      <FormSection collapsible errorPrefixes={["pm25Advice."]} id="tds-pm25" icon={CloudSun} legend={L("tdsGroupPm25")} hint={L("tdsHintPm25")}>
        <Stack space={4}>
          {PM25_LEVELS.map((level) => (
            <BilingualTextarea
              key={level}
              name={`pm25Advice.${level}`}
              label={L(PM25_LABEL[level])}
              rows={2}
              maxLength={300}
              defaultValue={settings?.pm25Advice[level] ?? DEFAULT_PM25_ADVICE[level]}
            />
          ))}
        </Stack>
      </FormSection>

      <FormSection collapsible errorPrefixes={["weatherNote", "librariesIntro", "librariesGuidePath"]} id="tds-pages" icon={FileText} legend={L("tdsGroupPages")}>
        <Stack space={4}>
          <BilingualTextarea
            name="weatherNote"
            label={L("tdsFieldWeatherNote")}
            hint={L("tdsHintWeatherNote")}
            rows={3}
            maxLength={1000}
            defaultValue={{ th: settings?.weatherNoteTh ?? "", en: settings?.weatherNoteEn ?? "" }}
          />
          <BilingualTextarea
            name="librariesIntro"
            label={L("tdsFieldLibrariesIntro")}
            hint={L("tdsHintLibrariesIntro")}
            rows={2}
            maxLength={500}
            defaultValue={{ th: settings?.librariesIntroTh ?? "", en: settings?.librariesIntroEn ?? "" }}
          />
          <TextField
            name="librariesGuidePath"
            label={L("tdsFieldLibrariesGuide")}
            hint={L("tdsHintLibrariesGuide")}
            inputMode="url"
            maxLength={500}
            defaultValue={settings ? (settings.librariesGuidePath ?? "") : DEFAULT_LIBRARY_GUIDE_PATH}
          />
        </Stack>
      </FormSection>
    </ContentForm>
  );
}
