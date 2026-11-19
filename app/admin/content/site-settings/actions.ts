"use server";

import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { contentActor, requireEditor } from "@/lib/admin/content/access";
import { EMPTY_FORM_STATE, type ContentFormState } from "@/lib/admin/content/form-state";
import { ContentNotFoundError, saveContent } from "@/lib/admin/content/save";
import { getAdminLocale } from "@/lib/admin/locale";
import { getDb } from "@/lib/db";
import { siteSettings } from "@/lib/db/schema";
import { a } from "@/lib/i18n/admin";
import { sectionValues } from "./sections";
import { isSiteSection, validateSiteSettingsSection } from "./validate";

const PATH = "/admin/content/site-settings";

/**
 * Saves one section of the site settings row. Only the section's own columns
 * are written, so another section edited in a second tab is never overwritten;
 * the row, audit entry, revision and cache expiry go through `saveContent` as
 * before. The row is always published, because the public site reads nothing
 * else. Only the General section can create the row, since the service name
 * and tagline have no default. Returns field errors, or redirects back to the
 * section when saved.
 */
export async function saveSiteSettingsSection(section: string, _prev: ContentFormState, formData: FormData): Promise<ContentFormState> {
  if (!isSiteSection(section)) notFound();
  const locale = await getAdminLocale();
  const staff = await requireEditor();
  const db = getDb();

  const checked = validateSiteSettingsSection({ locale, section, formData });
  if (!checked.ok) return { ...EMPTY_FORM_STATE, errors: checked.errors };

  const [existing] = await db.select({ id: siteSettings.id }).from(siteSettings).where(eq(siteSettings.singletonKey, "site")).limit(1);
  if (!existing && section !== "general") return { errors: {}, formError: a("fmSiteNeedGeneral", locale) };

  try {
    await saveContent({
      entityType: "siteSettings",
      table: siteSettings,
      actor: await contentActor(staff),
      id: existing?.id,
      status: "published",
      values: { singletonKey: "site", ...sectionValues(section, checked.data) },
    });
  } catch (error) {
    if (error instanceof ContentNotFoundError) return { errors: {}, formError: a("errNotFound", locale) };
    throw error;
  }
  redirect(`${PATH}/${section}?saved=${existing ? "updated" : "published"}`);
}
