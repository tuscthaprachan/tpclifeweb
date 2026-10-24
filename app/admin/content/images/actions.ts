"use server";

import { redirect } from "next/navigation";
import { contentActor, requireEditor } from "@/lib/admin/content/access";
import { EMPTY_FORM_STATE, isUuid, type ContentFormState } from "@/lib/admin/content/form-state";
import { getAdminLocale } from "@/lib/admin/locale";
import { revalidateFor } from "@/lib/content/revalidate";
import { getDb } from "@/lib/db";
import { a } from "@/lib/i18n/admin";
import { getStorage } from "@/lib/storage";
import { deleteImage, updateImage } from "./service";
import { validateImageForm } from "./validate";

const LIST = "/admin/content/images";

/**
 * Saves a picture's description, decorative flag and caption. Bound with
 * `.bind(null, id)`. Uploading goes through the shared `uploadImageAction`.
 */
export async function saveImage(id: string, _prev: ContentFormState, formData: FormData): Promise<ContentFormState> {
  const locale = await getAdminLocale();
  const staff = await requireEditor();
  if (!isUuid(id)) return { errors: {}, formError: a("errNotFound", locale) };

  const checked = validateImageForm({ locale, formData });
  if (!checked.ok) return { ...EMPTY_FORM_STATE, errors: checked.errors };

  const saved = await updateImage(getDb(), await contentActor(staff), id, checked.data);
  if (!saved) return { errors: {}, formError: a("errNotFound", locale) };
  // Pictures appear in news, events, lost and found, the canteen and rich text.
  revalidateFor("image");
  redirect(`${LIST}/${id}?saved=1`);
}

/** Deletes an unused picture and its stored file. If it is used, returns to its page, which lists where. Bound with `.bind(null, id)`. */
export async function deleteImageAction(id: string): Promise<void> {
  const staff = await requireEditor();
  if (!isUuid(id)) redirect(LIST);
  const result = await deleteImage(getDb(), await contentActor(staff), id);
  if (!result.ok && result.reason === "inUse") redirect(`${LIST}/${id}?blocked=1`);
  if (result.ok) {
    revalidateFor("image");
    try {
      await getStorage().delete(result.storageKey);
    } catch (error) {
      // The row is gone; a stray file does no harm and can be cleaned up later.
      console.error("[content] image file not removed", error);
    }
  }
  redirect(`${LIST}?notice=deleted`);
}
