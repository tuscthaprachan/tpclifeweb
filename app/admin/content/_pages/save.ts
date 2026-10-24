import "server-only";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { contentActor, requireEditor } from "@/lib/admin/content/access";
import { EMPTY_FORM_STATE, isUuid, type ContentFormState } from "@/lib/admin/content/form-state";
import { ContentConflictError, ContentNotFoundError, deleteContent, saveContent } from "@/lib/admin/content/save";
import { getAdminLocale } from "@/lib/admin/locale";
import type { ContentEntityType } from "@/lib/content/revalidate";
import { getDb } from "@/lib/db";
import { contentPages } from "@/lib/db/schema";
import { a } from "@/lib/i18n/admin";
import { pageChildren, pageValues } from "./values";
import { validatePageForm, type ContentPageKind } from "./validate";

const SEGMENT: Record<ContentPageKind, string> = { guide: "guides", welfare: "welfare" };
const ENTITY: Record<ContentPageKind, ContentEntityType> = { guide: "guidePage", welfare: "welfarePage" };

/**
 * Create (id null) or update a guide or welfare page. The two Server Action
 * files bind `kind` and `id`; useActionState supplies `prev` and `formData`.
 * Returns field errors, or redirects to the edit page when saved.
 */
export async function savePage(kind: ContentPageKind, id: string | null, _prev: ContentFormState, formData: FormData): Promise<ContentFormState> {
  const locale = await getAdminLocale();
  const staff = await requireEditor();
  const db = getDb();
  const L = (key: Parameters<typeof a>[0]) => a(key, locale);
  const list = `/admin/content/${SEGMENT[kind]}`;

  if (id !== null && !isUuid(id)) return { errors: {}, formError: L("errNotFound") };
  const [existing] = id
    ? await db.select({ status: contentPages.status }).from(contentPages).where(and(eq(contentPages.id, id), eq(contentPages.kind, kind)))
    : [];
  if (id && !existing) return { errors: {}, formError: L("errNotFound") };

  const checked = await validatePageForm(db, { kind, locale, id, formData, existingStatus: existing?.status });
  if (!checked.ok) return { ...EMPTY_FORM_STATE, errors: checked.errors };
  const { status, intent } = checked;

  let saved;
  try {
    saved = await saveContent({
      entityType: ENTITY[kind],
      table: contentPages,
      actor: await contentActor(staff),
      id: id ?? undefined,
      status,
      values: pageValues(kind, checked.data),
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

/** Deletes a page (its form and related-page links go with it) and returns to the list. */
export async function deletePage(kind: ContentPageKind, id: string): Promise<void> {
  const staff = await requireEditor();
  const list = `/admin/content/${SEGMENT[kind]}`;
  if (!isUuid(id)) redirect(list);
  const db = getDb();
  const [row] = await db.select({ id: contentPages.id }).from(contentPages).where(and(eq(contentPages.id, id), eq(contentPages.kind, kind)));
  if (row) {
    try {
      await deleteContent({ entityType: ENTITY[kind], table: contentPages, actor: await contentActor(staff), id });
    } catch (error) {
      if (!(error instanceof ContentNotFoundError)) throw error;
    }
  }
  redirect(`${list}?notice=deleted`);
}
