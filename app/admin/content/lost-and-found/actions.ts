"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { contentActor, requireEditor } from "@/lib/admin/content/access";
import { EMPTY_FORM_STATE, isUuid, type ContentFormState } from "@/lib/admin/content/form-state";
import { ContentConflictError, ContentInUseError, ContentNotFoundError, deleteContent } from "@/lib/admin/content/save";
import { getAdminLocale } from "@/lib/admin/locale";
import { getDb } from "@/lib/db";
import { lostFoundItems } from "@/lib/db/schema";
import { a } from "@/lib/i18n/admin";
import { auditedLostFoundItems, saveLostFoundItem } from "./service";
import { validateLostFoundForm } from "./validate";

const LIST = "/admin/content/lost-and-found";

/**
 * Create (id null) or update a lost and found listing. Bound to the page with
 * `.bind(null, id)`. Redirects to the edit page when saved.
 */
export async function saveLostFound(id: string | null, _prev: ContentFormState, formData: FormData): Promise<ContentFormState> {
  const locale = await getAdminLocale();
  const staff = await requireEditor();
  const db = getDb();
  const L = (key: Parameters<typeof a>[0]) => a(key, locale);

  if (id !== null && !isUuid(id)) return { errors: {}, formError: L("errNotFound") };
  const [existing] = id ? await db.select({ status: lostFoundItems.status }).from(lostFoundItems).where(eq(lostFoundItems.id, id)) : [];
  if (id && !existing) return { errors: {}, formError: L("errNotFound") };

  const checked = await validateLostFoundForm(db, { locale, formData, existingStatus: existing?.status });
  if (!checked.ok) return { ...EMPTY_FORM_STATE, errors: checked.errors };
  const { status, intent, data } = checked;

  let saved;
  try {
    saved = await saveLostFoundItem(db, { actor: await contentActor(staff), id: id ?? undefined, status, data });
  } catch (error) {
    if (error instanceof ContentNotFoundError) return { errors: {}, formError: L("errNotFound") };
    if (error instanceof ContentConflictError || error instanceof ContentInUseError) return { errors: {}, formError: a("errSelectField", locale, { field: L("lfFieldPlace") }) };
    throw error;
  }
  const notice = intent === "publish" ? "published" : intent === "unpublish" ? "unpublished" : existing?.status === "published" ? "updated" : "saved";
  redirect(`${LIST}/${saved.id}?saved=${notice}`);
}

/** Deletes a listing (its photo links go with it; the pictures stay in the library) and returns to the list. Bound with `.bind(null, id)`. */
export async function deleteLostFound(id: string): Promise<void> {
  const staff = await requireEditor();
  if (!isUuid(id)) redirect(LIST);
  try {
    await deleteContent({ entityType: "lostFoundItem", table: auditedLostFoundItems, actor: await contentActor(staff), id });
  } catch (error) {
    if (!(error instanceof ContentNotFoundError)) throw error;
  }
  redirect(`${LIST}?notice=deleted`);
}
