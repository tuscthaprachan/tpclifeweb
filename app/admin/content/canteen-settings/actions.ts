"use server";

import { redirect } from "next/navigation";
import { contentActor, requireEditor } from "@/lib/admin/content/access";
import { EMPTY_FORM_STATE, isUuid, type ContentFormState } from "@/lib/admin/content/form-state";
import { ContentNotFoundError, saveContent } from "@/lib/admin/content/save";
import { getAdminLocale } from "@/lib/admin/locale";
import { getDb } from "@/lib/db";
import { canteenSettings } from "@/lib/db/schema";
import { a } from "@/lib/i18n/admin";
import { validateCanteenSettingsForm } from "./validate";

const PAGE = "/admin/content/canteen-settings";

/**
 * Updates the one canteen settings row (id null creates it the first time).
 * Always saved as published: the floor plan has no draft. Bound with `.bind(null, id)`.
 */
export async function saveCanteenSettings(id: string | null, _prev: ContentFormState, formData: FormData): Promise<ContentFormState> {
  const locale = await getAdminLocale();
  const staff = await requireEditor();
  const db = getDb();

  if (id !== null && !isUuid(id)) return { errors: {}, formError: a("errNotFound", locale) };
  const checked = await validateCanteenSettingsForm(db, { locale, formData });
  if (!checked.ok) return { ...EMPTY_FORM_STATE, errors: checked.errors };
  const { data } = checked;

  try {
    await saveContent({
      entityType: "canteenSettings",
      table: canteenSettings,
      actor: await contentActor(staff),
      id: id ?? undefined,
      status: "published",
      values: {
        singletonKey: "canteen",
        canteenPlaceId: data.canteenPlace,
        gridCols: data.gridCols,
        gridRows: data.gridRows,
        riverSide: data.riverSide,
        entrances: data.entrances,
        seatingZones: data.seatingZones,
        outline: data.outline,
        landmarks: data.landmarks,
      },
    });
  } catch (error) {
    if (error instanceof ContentNotFoundError) return { errors: {}, formError: a("errNotFound", locale) };
    throw error;
  }
  redirect(`${PAGE}?saved=updated`);
}
