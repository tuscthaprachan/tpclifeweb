import "server-only";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { contentActor, requireEditor } from "@/lib/admin/content/access";
import { EMPTY_FORM_STATE, isUuid, type ContentFormState } from "@/lib/admin/content/form-state";
import { ContentConflictError, ContentNotFoundError, deleteContent, saveContent } from "@/lib/admin/content/save";
import { getAdminLocale } from "@/lib/admin/locale";
import { getDb } from "@/lib/db";
import { contentPages } from "@/lib/db/schema";
import { a } from "@/lib/i18n/admin";
import { pageChildren, pageValues } from "./values";
import { validatePageForm } from "./validate";

const LIST = "/admin/content/topics";

/**
 * Create (id null) or update a topic page. The Server Action file binds `id`;
 * useActionState supplies `prev` and `formData`.
 * Returns field errors, or redirects to the edit page when saved.
 */
export async function savePage(id: string | null, _prev: ContentFormState, formData: FormData): Promise<ContentFormState> {
  const locale = await getAdminLocale();
  const staff = await requireEditor();
  const db = getDb();
  const L = (key: Parameters<typeof a>[0]) => a(key, locale);
  const list = LIST;

  if (id !== null && !isUuid(id)) return { errors: {}, formError: L("errNotFound") };
  const [existing] = id
    ? await db.select({ status: contentPages.status }).from(contentPages).where(eq(contentPages.id, id))
    : [];
  if (id && !existing) return { errors: {}, formError: L("errNotFound") };

  const checked = await validatePageForm(db, { locale, id, formData, existingStatus: existing?.status });
  if (!checked.ok) return { ...EMPTY_FORM_STATE, errors: checked.errors };
  const { status, intent } = checked;

  let saved;
  try {
    saved = await saveContent({
      entityType: "topicPage",
      table: contentPages,
      actor: await contentActor(staff),
      id: id ?? undefined,
      status,
      values: pageValues(checked.data),
      children: pageChildren(checked.data),
    });
  } catch (error) {
    if (error instanceof ContentConflictError) return { errors: { slug: L("errSlugTaken") } };
    if (error instanceof ContentNotFoundError) return { errors: {}, formError: L("errNotFound") };
    throw error;
  }
  const notice = intent === "publish" ? "published" : intent === "unpublish" ? "unpublished" : existing?.status === "published" ? "updated" : "saved";
  redirect(`${list}/${saved.id}?saved=${notice}`);
}

/** Deletes a topic page (its form and related-page links go with it) and returns to the list. */
export async function deletePage(id: string): Promise<void> {
  const staff = await requireEditor();
  const list = LIST;
  if (!isUuid(id)) redirect(list);
  const db = getDb();
  const [row] = await db.select({ id: contentPages.id }).from(contentPages).where(eq(contentPages.id, id));
  if (row) {
    try {
      await deleteContent({ entityType: "topicPage", table: contentPages, actor: await contentActor(staff), id });
    } catch (error) {
      if (!(error instanceof ContentNotFoundError)) throw error;
    }
  }
  redirect(`${list}?notice=deleted`);
}
