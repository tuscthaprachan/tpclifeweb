"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { contentActor, requireEditor } from "@/lib/admin/content/access";
import { EMPTY_FORM_STATE, isUuid, type ContentFormState } from "@/lib/admin/content/form-state";
import { ContentConflictError, ContentInUseError, ContentNotFoundError, deleteContent, saveContent } from "@/lib/admin/content/save";
import { getAdminLocale } from "@/lib/admin/locale";
import { getDb } from "@/lib/db";
import { places } from "@/lib/db/schema";
import { a } from "@/lib/i18n/admin";
import { placeUsage } from "./usage";
import { validatePlaceForm } from "./validate";

const LIST = "/admin/content/places";

/**
 * Create (id null) or update a place. Bound to the page with `.bind(null, id)`;
 * returns field errors, or redirects to the edit page when saved.
 */
export async function savePlace(id: string | null, _prev: ContentFormState, formData: FormData): Promise<ContentFormState> {
  const locale = await getAdminLocale();
  const staff = await requireEditor();
  const db = getDb();
  const L = (key: Parameters<typeof a>[0]) => a(key, locale);

  if (id !== null && !isUuid(id)) return { errors: {}, formError: L("errNotFound") };
  const [existing] = id ? await db.select({ status: places.status }).from(places).where(eq(places.id, id)) : [];
  if (id && !existing) return { errors: {}, formError: L("errNotFound") };

  const checked = await validatePlaceForm(db, { locale, id, formData, existingStatus: existing?.status });
  if (!checked.ok) return { ...EMPTY_FORM_STATE, errors: checked.errors };
  const { status, intent } = checked;
  const { slug, name, building, description, category, openingHours, closureNote, lat, lng, isKeyLocation } = checked.data;

  let saved;
  try {
    saved = await saveContent({
      entityType: "place",
      table: places,
      actor: await contentActor(staff),
      id: id ?? undefined,
      status,
      values: {
        slug,
        nameTh: name.th,
        nameEn: name.en,
        buildingTh: building.th || null,
        buildingEn: building.en || null,
        descriptionTh: description.th || null,
        descriptionEn: description.en || null,
        category,
        openingHours,
        closureNoteTh: closureNote.th || null,
        closureNoteEn: closureNote.en || null,
        lat,
        lng,
        isKeyLocation,
      },
    });
  } catch (error) {
    if (error instanceof ContentConflictError) return { errors: { slug: L("errSlugTaken") } };
    if (error instanceof ContentNotFoundError) return { errors: {}, formError: L("errNotFound") };
    throw error;
  }
  const notice = intent === "publish" ? "published" : intent === "unpublish" ? "unpublished" : existing?.status === "published" ? "updated" : "saved";
  redirect(`${LIST}/${saved.id}?saved=${notice}`);
}

/**
 * Deletes a place and returns to the list. A place that events, lost and found
 * items or the canteen settings still use is kept: the edit page opens with a
 * message saying what uses it. Bound with `.bind(null, id)`.
 */
export async function deletePlace(id: string): Promise<void> {
  const staff = await requireEditor();
  if (!isUuid(id)) redirect(LIST);
  const db = getDb();
  try {
    if ((await placeUsage(db, id)).total > 0) throw new ContentInUseError();
    await deleteContent({ entityType: "place", table: places, actor: await contentActor(staff), id });
  } catch (error) {
    if (error instanceof ContentInUseError) redirect(`${LIST}/${id}?error=inUse`);
    if (!(error instanceof ContentNotFoundError)) throw error;
  }
  redirect(`${LIST}?notice=deleted`);
}
