"use server";

import { redirect } from "next/navigation";
import { contentActor, requireEditor } from "@/lib/admin/content/access";
import { EMPTY_FORM_STATE, isUuid, type ContentFormState } from "@/lib/admin/content/form-state";
import { ContentNotFoundError, saveContent } from "@/lib/admin/content/save";
import { getAdminLocale } from "@/lib/admin/locale";
import { todaySettings } from "@/lib/db/schema";
import { a } from "@/lib/i18n/admin";
import { validateTodaySettingsForm } from "./validate";

const PAGE = "/admin/content/today";

/** Updates the one Today settings row (id null creates it the first time). Always live. Bound with `.bind(null, id)`. */
export async function saveTodaySettings(id: string | null, _prev: ContentFormState, formData: FormData): Promise<ContentFormState> {
  const locale = await getAdminLocale();
  const staff = await requireEditor();

  if (id !== null && !isUuid(id)) return { errors: {}, formError: a("errNotFound", locale) };
  const checked = validateTodaySettingsForm({ locale, formData });
  if (!checked.ok) return { ...EMPTY_FORM_STATE, errors: checked.errors };
  const { data } = checked;

  try {
    await saveContent({
      entityType: "todaySettings",
      table: todaySettings,
      actor: await contentActor(staff),
      id: id ?? undefined,
      status: "published",
      values: {
        singletonKey: "today",
        rows: data.rows,
        heatAdvice: data.heatAdvice,
        pm25Advice: data.pm25Advice,
        weatherNoteTh: data.weatherNote.th || null,
        weatherNoteEn: data.weatherNote.en || null,
        librariesIntroTh: data.librariesIntro.th || null,
        librariesIntroEn: data.librariesIntro.en || null,
        librariesGuidePath: data.librariesGuidePath,
      },
    });
  } catch (error) {
    if (error instanceof ContentNotFoundError) return { errors: {}, formError: a("errNotFound", locale) };
    throw error;
  }
  redirect(`${PAGE}?saved=updated`);
}
