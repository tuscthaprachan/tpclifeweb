import { eq } from "drizzle-orm";
import { ContentForm, type ContentRecordInfo } from "@/components/admin/content/ContentForm";
import { BilingualTextField, EnumSelect } from "@/components/admin/content/fields";
import { Fieldset, Stack } from "@/components/ui";
import { userNames } from "@/lib/admin/content/list";
import { getDb } from "@/lib/db";
import { siteSettings } from "@/lib/db/schema";
import { a, type AdminKey } from "@/lib/i18n/admin";
import { localePath, type Locale } from "@/lib/i18n/config";
import { HelpContactsField } from "./HelpContactsField";
import { LinksField } from "./LinksField";
import { NavField } from "./NavField";
import { saveSiteSettings } from "./actions";

/** The site settings form: edits the one row directly, with no list, no draft and no delete. */
export async function SiteSettingsForm({ locale, saved }: { locale: Locale; saved?: string }) {
  const db = getDb();
  const [row] = await db.select().from(siteSettings).where(eq(siteSettings.singletonKey, "site")).limit(1);
  const names = row ? await userNames(db, [row.updatedBy]) : new Map<string, string>();

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
      key={record?.updatedAt}
      locale={locale}
      action={saveSiteSettings}
      record={record}
      listHref="/admin/content"
      saved={saved}
      hasStatus={false}
    >
      <Fieldset id="site-identity" legend={L("siteGroupIdentity")}>
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
      </Fieldset>
      <Fieldset id="site-menus" legend={L("siteGroupMenus")}>
        <Stack space={6}>
          <NavField name="primaryNav" legend={L("siteFieldNav")} hint={L("siteHintNav")} itemLabel={L("siteNavItem")} defaultValue={row?.primaryNav ?? []} />
          <NavField name="footerNav" legend={L("siteFieldFooterNav")} hint={L("siteHintFooterNav")} itemLabel={L("siteFooterItem")} defaultValue={row?.footerNav ?? []} />
          <LinksField defaultValue={row?.organisationLinks ?? []} />
        </Stack>
      </Fieldset>
      <Fieldset id="site-help" legend={L("siteGroupHelp")}>
        <HelpContactsField defaultValue={row?.helpContacts ?? []} />
      </Fieldset>
    </ContentForm>
  );
}
