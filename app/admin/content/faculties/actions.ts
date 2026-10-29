"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { contentActor, requireEditor } from "@/lib/admin/content/access";
import { EMPTY_FORM_STATE, isUuid, type ContentFormState } from "@/lib/admin/content/form-state";
import { ContentConflictError, ContentInUseError, ContentNotFoundError, deleteContent, saveContent } from "@/lib/admin/content/save";
import { getAdminLocale } from "@/lib/admin/locale";
import { getDb } from "@/lib/db";
import { faculties } from "@/lib/db/schema";
import { a } from "@/lib/i18n/admin";
import { facultyUsage } from "./usage";
import { validateFacultyForm } from "./validate";

const LIST = "/admin/content/faculties";

/**
 * Create (id null) or update a faculty. Bound to the page with `.bind(null, id)`;
 * returns field errors, or redirects to the edit page when saved.
 */
export async function saveFaculty(id: string | null, _prev: ContentFormState, formData: FormData): Promise<ContentFormState> {
  const locale = await getAdminLocale();
  const staff = await requireEditor();
  const db = getDb();
  const L = (key: Parameters<typeof a>[0]) => a(key, locale);

  if (id !== null && !isUuid(id)) return { errors: {}, formError: L("errNotFound") };
  const [existing] = id ? await db.select({ status: faculties.status }).from(faculties).where(eq(faculties.id, id)) : [];
  if (id && !existing) return { errors: {}, formError: L("errNotFound") };

  const checked = await validateFacultyForm(db, { locale, id, formData, existingStatus: existing?.status });
  if (!checked.ok) return { ...EMPTY_FORM_STATE, errors: checked.errors };
  const { status, intent } = checked;
  const { slug, name, sortOrder, location, phone, email, website, note } = checked.data;

  let saved;
  try {
    saved = await saveContent({
      entityType: "faculty",
      table: faculties,
      actor: await contentActor(staff),
      id: id ?? undefined,
      status,
      values: {
        slug,
        nameTh: name.th,
        nameEn: name.en,
        sortOrder: sortOrder ?? 0,
        officeLocationTh: location.th || null,
        officeLocationEn: location.en || null,
        officePhone: phone,
        officeEmail: email,
        officeWebsite: website,
        officeNoteTh: note.th || null,
        officeNoteEn: note.en || null,
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
 * Deletes a faculty and returns to the list. A faculty that committees or
 * redirected complaints still point at is kept: the edit page opens with a
 * message saying what uses it. Bound with `.bind(null, id)`.
 */
export async function deleteFaculty(id: string): Promise<void> {
  const staff = await requireEditor();
  if (!isUuid(id)) redirect(LIST);
  const db = getDb();
  try {
    if ((await facultyUsage(db, id)).total > 0) throw new ContentInUseError();
    await deleteContent({ entityType: "faculty", table: faculties, actor: await contentActor(staff), id });
  } catch (error) {
    if (error instanceof ContentInUseError) redirect(`${LIST}/${id}?error=inUse`);
    if (!(error instanceof ContentNotFoundError)) throw error;
  }
  redirect(`${LIST}?notice=deleted`);
}
