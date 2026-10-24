"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { contentActor, requireEditor } from "@/lib/admin/content/access";
import { EMPTY_FORM_STATE, type ContentFormState } from "@/lib/admin/content/form-state";
import { ContentNotFoundError, saveContent } from "@/lib/admin/content/save";
import { getAdminLocale } from "@/lib/admin/locale";
import { getDb } from "@/lib/db";
import { siteSettings } from "@/lib/db/schema";
import { a } from "@/lib/i18n/admin";
import { validateSiteSettingsForm } from "./validate";

const PATH = "/admin/content/site-settings";

/**
 * Saves the one site settings row, creating it the first time. The row is
 * always published, because the public site reads nothing else. Returns field
 * errors, or redirects back to the page when saved.
 */
export async function saveSiteSettings(_prev: ContentFormState, formData: FormData): Promise<ContentFormState> {
  const locale = await getAdminLocale();
  const staff = await requireEditor();
  const db = getDb();
  const L = (key: Parameters<typeof a>[0]) => a(key, locale);

  const checked = validateSiteSettingsForm({ locale, formData });
  if (!checked.ok) return { ...EMPTY_FORM_STATE, errors: checked.errors };
  const { serviceName, tagline, phase, phaseNote, primaryNav, footerNav, helpContacts, organisationLinks } = checked.data;

  const [existing] = await db.select({ id: siteSettings.id }).from(siteSettings).where(eq(siteSettings.singletonKey, "site")).limit(1);

  try {
    await saveContent({
      entityType: "siteSettings",
      table: siteSettings,
      actor: await contentActor(staff),
      id: existing?.id,
      status: "published",
      values: {
        singletonKey: "site",
        serviceNameTh: serviceName.th,
        serviceNameEn: serviceName.en,
        taglineTh: tagline.th,
        taglineEn: tagline.en,
        phase,
        phaseNoteTh: phaseNote.th || null,
        phaseNoteEn: phaseNote.en || null,
        primaryNav,
        footerNav,
        helpContacts,
        organisationLinks,
      },
    });
  } catch (error) {
    if (error instanceof ContentNotFoundError) return { errors: {}, formError: L("errNotFound") };
    throw error;
  }
  redirect(`${PATH}?saved=${existing ? "updated" : "published"}`);
}
