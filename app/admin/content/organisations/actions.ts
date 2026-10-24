"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { contentActor, requireEditor } from "@/lib/admin/content/access";
import { EMPTY_FORM_STATE, isUuid, type ContentFormState } from "@/lib/admin/content/form-state";
import { ContentConflictError, ContentNotFoundError, deleteContent, saveContent } from "@/lib/admin/content/save";
import { getAdminLocale } from "@/lib/admin/locale";
import { getDb } from "@/lib/db";
import { directoryOrganisations } from "@/lib/db/schema";
import { a } from "@/lib/i18n/admin";
import { validateOrganisationForm } from "./validate";

const LIST = "/admin/content/organisations";

/**
 * Create (id null) or update a directory organisation. Bound to the page with
 * `.bind(null, id)`; returns field errors, or redirects to the edit page when saved.
 */
export async function saveOrganisation(id: string | null, _prev: ContentFormState, formData: FormData): Promise<ContentFormState> {
  const locale = await getAdminLocale();
  const staff = await requireEditor();
  const db = getDb();
  const L = (key: Parameters<typeof a>[0]) => a(key, locale);

  if (id !== null && !isUuid(id)) return { errors: {}, formError: L("errNotFound") };
  const [existing] = id ? await db.select({ status: directoryOrganisations.status }).from(directoryOrganisations).where(eq(directoryOrganisations.id, id)) : [];
  if (id && !existing) return { errors: {}, formError: L("errNotFound") };

  const checked = await validateOrganisationForm(db, { locale, id, formData, existingStatus: existing?.status });
  if (!checked.ok) return { ...EMPTY_FORM_STATE, errors: checked.errors };
  const { status, intent } = checked;
  const { slug, name, type, faculty, description, location, isActive, contacts } = checked.data;

  let saved;
  try {
    saved = await saveContent({
      entityType: "organisation",
      table: directoryOrganisations,
      actor: await contentActor(staff),
      id: id ?? undefined,
      status,
      values: {
        slug,
        nameTh: name.th,
        nameEn: name.en,
        type,
        facultyTh: faculty.th || null,
        facultyEn: faculty.en || null,
        descriptionTh: description.th || null,
        descriptionEn: description.en || null,
        contacts,
        locationTh: location.th || null,
        locationEn: location.en || null,
        isActive,
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

/** Deletes a directory organisation and returns to the list. Bound with `.bind(null, id)`. */
export async function deleteOrganisation(id: string): Promise<void> {
  const staff = await requireEditor();
  if (!isUuid(id)) redirect(LIST);
  try {
    await deleteContent({ entityType: "organisation", table: directoryOrganisations, actor: await contentActor(staff), id });
  } catch (error) {
    if (!(error instanceof ContentNotFoundError)) throw error;
  }
  redirect(`${LIST}?notice=deleted`);
}
