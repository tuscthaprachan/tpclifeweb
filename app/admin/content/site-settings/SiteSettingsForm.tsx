import { eq } from "drizzle-orm";
import { FormSection } from "@/components/admin/content/FormSection";
import { ContentForm, type ContentRecordInfo } from "@/components/admin/content/ContentForm";
import { BilingualTextField, EnumSelect } from "@/components/admin/content/fields";
import { Stack } from "@/components/ui";
import { userNames } from "@/lib/admin/content/list";
import { getDb } from "@/lib/db";
import { siteSettings } from "@/lib/db/schema";
import { a, type AdminKey } from "@/lib/i18n/admin";
import { localePath, type Locale } from "@/lib/i18n/config";
import { HelpContactsField } from "./HelpContactsField";
import { HomeTasksField } from "./HomeTasksField";
import { LinksField } from "./LinksField";
import { NavField } from "./NavField";
import { saveSiteSettingsSection } from "./actions";
import { SITE_SECTION_DEFS } from "./sections";
import type { SiteSection } from "./validate";

export const SITE_SETTINGS_PATH = "/admin/content/site-settings";

/** One section of the site settings: edits its own columns of the one row, with no list, no draft and no delete. */
export async function SiteSettingsForm({ locale, section, saved }: { locale: Locale; section: SiteSection; saved?: string }) {
  const db = getDb();
  const [row] = await db.select().from(siteSettings).where(eq(siteSettings.singletonKey, "site")).limit(1);
  const names = row ? await userNames(db, [row.updatedBy]) : new Map<string, string>();
  const def = SITE_SECTION_DEFS.find((d) => d.id === section)!;

  const record: ContentRecordInfo | undefined = row
    ? {
        id: row.id,
        status: row.status,
        updatedAt: row.updatedAt.toISOString(),
        updatedByName: row.updatedBy ? names.get(row.updatedBy) : null,
        viewHref: localePath(locale, "/"),
      }
    : undefined;
  const L = (key: AdminKey) => a(key, locale);

  return (
    <ContentForm
      key={`${section}-${record?.updatedAt}`}
      locale={locale}
      action={saveSiteSettingsSection.bind(null, section)}
      record={record}
      listHref={SITE_SETTINGS_PATH}
      backLabel={L("fmSiteBackToSections")}
      saved={saved}
      hasStatus={false}
    >
      <FormSection icon={def.icon} id={`site-${section}`} legend={L(def.titleKey)} hint={L(def.hintKey)}>
        {section === "general" ? (
          <Stack space={4}>
            <BilingualTextField name="serviceName" label={L("siteFieldServiceName")} maxLength={100} defaultValue={{ th: row?.serviceNameTh, en: row?.serviceNameEn }} />
            <BilingualTextField name="tagline" label={L("siteFieldTagline")} hint={L("siteHintTagline")} maxLength={250} defaultValue={{ th: row?.taglineTh, en: row?.taglineEn }} />
            <EnumSelect
              name="phase"
              label={L("siteFieldPhase")}
              hint={L("siteHintPhase")}
              defaultValue={row?.phase ?? "alpha"}
              options={[
                { value: "alpha", label: L("sitePhaseAlpha") },
                { value: "beta", label: L("sitePhaseBeta") },
                { value: "live", label: L("sitePhaseLive") },
              ]}
            />
            <BilingualTextField
              name="phaseNote"
              label={L("siteFieldPhaseNote")}
              hint={L("siteHintPhaseNote")}
              maxLength={300}
              defaultValue={{ th: row?.phaseNoteTh, en: row?.phaseNoteEn }}
            />
          </Stack>
        ) : null}
        {section === "navigation" ? <NavField name="primaryNav" legend={L("siteFieldNav")} hint={L("siteHintNav")} itemLabel={L("siteNavItem")} defaultValue={row?.primaryNav ?? []} /> : null}
        {section === "footer" ? (
          <Stack space={6}>
            <NavField name="footerNav" legend={L("siteFieldFooterNav")} hint={L("siteHintFooterNav")} itemLabel={L("siteFooterItem")} defaultValue={row?.footerNav ?? []} />
            <LinksField defaultValue={row?.organisationLinks ?? []} />
          </Stack>
        ) : null}
        {section === "home-tasks" ? <HomeTasksField defaultValue={row?.homeTasks ?? []} /> : null}
        {section === "help" ? <HelpContactsField defaultValue={row?.helpContacts ?? []} /> : null}
      </FormSection>
    </ContentForm>
  );
}
