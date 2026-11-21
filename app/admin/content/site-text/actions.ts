"use server";

import { asc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { contentActor, requireEditor } from "@/lib/admin/content/access";
import { EMPTY_FORM_STATE, isUuid, type ContentFormState } from "@/lib/admin/content/form-state";
import { ContentNotFoundError, saveContent } from "@/lib/admin/content/save";
import { getAdminLocale } from "@/lib/admin/locale";
import { getDb } from "@/lib/db";
import { siteText } from "@/lib/db/schema";
import { a } from "@/lib/i18n/admin";
import { setTextOverrides } from "@/lib/i18n/editable";
import { siteTextDefaults } from "./defaults";
import { mergeSiteTextForm } from "./validate";

const PAGE = "/admin/content/site-text";

/** Only a query string of our own is followed back after saving. */
function safeReturn(value: FormDataEntryValue | null): string {
  return typeof value === "string" && /^\?[\w=&%.+-]*$/.test(value) ? value : "";
}

/**
 * Saves the strings on screen into the one Site text row (created on the first
 * save). Always live. Reads the stored row afresh so edits made by someone else
 * to other strings since the page loaded are kept.
 */
export async function saveSiteText(id: string | null, _prev: ContentFormState, formData: FormData): Promise<ContentFormState> {
  const locale = await getAdminLocale();
  const staff = await requireEditor();
  if (id !== null && !isUuid(id)) return { errors: {}, formError: a("errNotFound", locale) };

  const [row] = await getDb().select().from(siteText).orderBy(asc(siteText.createdAt)).limit(1);
  const merged = mergeSiteTextForm({ locale, formData, existing: row?.texts ?? {}, defaults: siteTextDefaults() });
  if (!merged.ok) return { ...EMPTY_FORM_STATE, errors: merged.errors };

  try {
    await saveContent({
      entityType: "siteText",
      table: siteText,
      actor: await contentActor(staff),
      id: row?.id ?? id ?? undefined,
      status: "published",
      values: { singletonKey: "site-text", texts: merged.texts },
    });
  } catch (error) {
    if (error instanceof ContentNotFoundError) return { errors: {}, formError: a("errNotFound", locale) };
    throw error;
  }
  // This process shows the edit at once; others pick it up on their next page.
  setTextOverrides(merged.texts);
  const back = safeReturn(formData.get("$return"));
  redirect(`${PAGE}${back ? `${back}&` : "?"}saved=updated`);
}
