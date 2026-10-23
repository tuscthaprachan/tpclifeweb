"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { contentActor, requireEditor } from "@/lib/admin/content/access";
import { EMPTY_FORM_STATE, isUuid, type ContentFormState } from "@/lib/admin/content/form-state";
import { ContentNotFoundError, deleteContent, saveContent } from "@/lib/admin/content/save";
import { getAdminLocale } from "@/lib/admin/locale";
import { getDb } from "@/lib/db";
import { serviceAlerts } from "@/lib/db/schema";
import { a } from "@/lib/i18n/admin";
import { alertValues, validateAlertForm } from "./validate";

const LIST = "/admin/content/alerts";

/**
 * Create (id null) or update a service alert. Bound to the page with
 * `.bind(null, id)`. Returns field errors, or redirects to the edit page.
 */
export async function saveAlert(id: string | null, _prev: ContentFormState, formData: FormData): Promise<ContentFormState> {
  const locale = await getAdminLocale();
  const staff = await requireEditor();
  const db = getDb();
  const L = (key: Parameters<typeof a>[0]) => a(key, locale);

  if (id !== null && !isUuid(id)) return { errors: {}, formError: L("errNotFound") };
  const [existing] = id ? await db.select({ status: serviceAlerts.status }).from(serviceAlerts).where(eq(serviceAlerts.id, id)) : [];
  if (id && !existing) return { errors: {}, formError: L("errNotFound") };

  const checked = await validateAlertForm(db, { locale, id, formData, existingStatus: existing?.status });
  if (!checked.ok) return { ...EMPTY_FORM_STATE, errors: checked.errors };
  const { status, intent } = checked;

  let saved;
  try {
    saved = await saveContent({
      entityType: "serviceAlert",
      table: serviceAlerts,
      actor: await contentActor(staff),
      id: id ?? undefined,
      status,
      values: alertValues(checked.data),
    });
  } catch (error) {
    if (error instanceof ContentNotFoundError) return { errors: {}, formError: L("errNotFound") };
    throw error;
  }
  const notice = intent === "publish" ? "published" : intent === "unpublish" ? "unpublished" : existing?.status === "published" ? "updated" : "saved";
  redirect(`${LIST}/${saved.id}?saved=${notice}`);
}

/** Deletes a service alert and returns to the list. Bound with `.bind(null, id)`. */
export async function deleteAlert(id: string): Promise<void> {
  const staff = await requireEditor();
  if (!isUuid(id)) redirect(LIST);
  try {
    await deleteContent({ entityType: "serviceAlert", table: serviceAlerts, actor: await contentActor(staff), id });
  } catch (error) {
    if (!(error instanceof ContentNotFoundError)) throw error;
  }
  redirect(`${LIST}?notice=deleted`);
}
