"use server";

import { redirect } from "next/navigation";
import { contentActor, requireEditor } from "@/lib/admin/content/access";
import { EMPTY_FORM_STATE, isUuid, type ContentFormState } from "@/lib/admin/content/form-state";
import { ContentNotFoundError, saveContent } from "@/lib/admin/content/save";
import { getAdminLocale } from "@/lib/admin/locale";
import { servicePages } from "@/lib/db/schema";
import { a } from "@/lib/i18n/admin";
import { validateServicePagesForm } from "./validate";

const PAGE = "/admin/content/service-pages";

/** Updates the one Service pages row (id null creates it the first time). Always live. Bound with `.bind(null, id)`. */
export async function saveServicePages(id: string | null, _prev: ContentFormState, formData: FormData): Promise<ContentFormState> {
  const locale = await getAdminLocale();
  const staff = await requireEditor();

  if (id !== null && !isUuid(id)) return { errors: {}, formError: a("errNotFound", locale) };
  const checked = validateServicePagesForm({ locale, formData });
  if (!checked.ok) return { ...EMPTY_FORM_STATE, errors: checked.errors };

  try {
    await saveContent({
      entityType: "servicePages",
      table: servicePages,
      actor: await contentActor(staff),
      id: id ?? undefined,
      status: "published",
      values: { singletonKey: "service-pages", texts: checked.data.texts },
    });
  } catch (error) {
    if (error instanceof ContentNotFoundError) return { errors: {}, formError: a("errNotFound", locale) };
    throw error;
  }
  redirect(`${PAGE}?saved=updated`);
}
