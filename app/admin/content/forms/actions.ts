"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { contentActor, requireEditor } from "@/lib/admin/content/access";
import { EMPTY_FORM_STATE, isUuid, type ContentFormState } from "@/lib/admin/content/form-state";
import { ContentConflictError, ContentInUseError, ContentNotFoundError, deleteContent, saveContent } from "@/lib/admin/content/save";
import { getAdminLocale } from "@/lib/admin/locale";
import { getDb } from "@/lib/db";
import { forms } from "@/lib/db/schema";
import { a } from "@/lib/i18n/admin";
import { findFormUsages } from "./usage";
import { formValues } from "./values";
import { validateFormRecordForm } from "./validate";

const LIST = "/admin/content/forms";

/**
 * Create (id null) or update a form. Bound to the page with
 * `.bind(null, id)`; useActionState supplies `prev` and `formData`.
 * Returns field errors, or redirects to the edit page when saved.
 */
export async function saveFormRecord(id: string | null, _prev: ContentFormState, formData: FormData): Promise<ContentFormState> {
  const locale = await getAdminLocale();
  const staff = await requireEditor();
  const db = getDb();
  const L = (key: Parameters<typeof a>[0]) => a(key, locale);

  if (id !== null && !isUuid(id)) return { errors: {}, formError: L("errNotFound") };
  const [existing] = id ? await db.select({ status: forms.status }).from(forms).where(eq(forms.id, id)) : [];
  if (id && !existing) return { errors: {}, formError: L("errNotFound") };

  const checked = await validateFormRecordForm(db, { locale, id, formData, existingStatus: existing?.status });
  if (!checked.ok) return { ...EMPTY_FORM_STATE, errors: checked.errors };
  const { status, intent } = checked;

  let saved;
  try {
    saved = await saveContent({
      entityType: "form",
      table: forms,
      actor: await contentActor(staff),
      id: id ?? undefined,
      status,
      values: formValues(checked.data),
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
 * Deletes a form and returns to the list. A form that pages, FAQs, events or
 * rich text still use is not deleted; the edit page then lists where. Bound
 * with `.bind(null, id)`.
 */
export async function deleteFormRecord(id: string): Promise<void> {
  const staff = await requireEditor();
  if (!isUuid(id)) redirect(LIST);
  const db = getDb();
  if ((await findFormUsages(db, id)).length > 0) redirect(`${LIST}/${id}?notice=inuse`);
  try {
    await deleteContent({ entityType: "form", table: forms, actor: await contentActor(staff), id });
  } catch (error) {
    if (error instanceof ContentInUseError) redirect(`${LIST}/${id}?notice=inuse`);
    if (!(error instanceof ContentNotFoundError)) throw error;
  }
  redirect(`${LIST}?notice=deleted`);
}
