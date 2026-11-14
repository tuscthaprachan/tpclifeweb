"use server";

import { redirect } from "next/navigation";
import { contentActor, requireEditor } from "@/lib/admin/content/access";
import { EMPTY_FORM_STATE, isUuid, type ContentFormState } from "@/lib/admin/content/form-state";
import { getAdminLocale } from "@/lib/admin/locale";
import { revalidateFor } from "@/lib/content/revalidate";
import { getDb } from "@/lib/db";
import { a } from "@/lib/i18n/admin";
import { bulkDeleteImages, bulkUpdateAlt, parseImageIds, type AltEdit } from "@/lib/admin/media/bulk";
import { replaceImageFile } from "@/lib/admin/media/replace";
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

/**
 * Saves the descriptions typed on the bulk edit page. Fields: `id` (many),
 * then `altTh_<id>`, `altEn_<id>` and `decorative_<id>` for each. Pictures
 * that are not described in both languages are not saved and the page opens
 * again with just those.
 */
export async function bulkAltAction(formData: FormData): Promise<void> {
  const staff = await requireEditor();
  const ids = parseImageIds(formData.getAll("id"));
  if (ids.length === 0) redirect(`${LIST}?bulk=none`);
  const edits: AltEdit[] = ids.map((id) => ({
    id,
    altTh: String(formData.get(`altTh_${id}`) ?? ""),
    altEn: String(formData.get(`altEn_${id}`) ?? ""),
    isDecorative: formData.get(`decorative_${id}`) === "on",
  }));
  const result = await bulkUpdateAlt(getDb(), await contentActor(staff), edits);
  if (result.updated.length > 0) revalidateFor("image");
  const incomplete = result.failed.filter((f) => f.reason === "missingAlt").map((f) => f.id);
  if (incomplete.length > 0) {
    const search = new URLSearchParams(incomplete.map((id) => ["id", id]));
    search.set("saved", String(result.updated.length));
    redirect(`${LIST}/bulk/edit?${search.toString()}`);
  }
  redirect(`${LIST}?${new URLSearchParams({ bulk: "edit", ok: String(result.updated.length) }).toString()}`);
}

/** Deletes the unused pictures among the listed ids and their stored files; used ones are refused and reported. */
export async function bulkDeleteImagesAction(formData: FormData): Promise<void> {
  const staff = await requireEditor();
  const ids = parseImageIds(formData.getAll("id"));
  if (ids.length === 0) redirect(`${LIST}?bulk=none`);
  const result = await bulkDeleteImages(getDb(), await contentActor(staff), ids);
  if (result.deleted.length > 0) {
    revalidateFor("image");
    const storage = getStorage();
    for (const { storageKey } of result.deleted) {
      try {
        await storage.delete(storageKey);
      } catch (error) {
        console.error("[content] image file not removed", error);
      }
    }
  }
  const search = new URLSearchParams({ bulk: "delete", ok: String(result.deleted.length) });
  for (const failure of result.failed) if (failure.reason === "inUse") search.append("refused", failure.id);
  redirect(`${LIST}?${search.toString()}`);
}

const REPLACE_ERRORS = ["errUploadChoose", "errUploadTooLarge", "errUploadType", "errStorageNotConfigured", "errUploadFailed", "errNotFound"] as const;

/** Replaces the file behind a picture, keeping its id. Bound with `.bind(null, id)`; works as a plain form post. */
export async function replaceImageAction(id: string, formData: FormData): Promise<void> {
  const locale = await getAdminLocale();
  const staff = await requireEditor();
  if (!isUuid(id)) redirect(LIST);
  const file = formData.get("file");
  const result = await replaceImageFile({ db: getDb(), actor: await contentActor(staff), id, file: file instanceof File ? file : null, locale });
  if (!result.ok) {
    const code = REPLACE_ERRORS.find((key) => a(key, locale) === result.error) ?? "errUploadFailed";
    redirect(`${LIST}/${id}?rerr=${code}`);
  }
  revalidateFor("image");
  redirect(`${LIST}/${id}?replaced=1`);
}
