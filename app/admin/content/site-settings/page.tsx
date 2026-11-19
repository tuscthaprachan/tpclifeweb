import Link from "next/link";
import { eq } from "drizzle-orm";
import { ConsoleIcon } from "@/components/admin/icons";
import { Card, ConsolePage } from "@/components/admin/ui";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { FormPageHeader } from "@/app/admin/content/_list/FormPageHeader";
import { contentTypeBySegment } from "@/app/admin/content/_list/placement";
import { requireEditor } from "@/lib/admin/content/access";
import { getAdminLocale } from "@/lib/admin/locale";
import { isAuthConfigured } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { siteSettings } from "@/lib/db/schema";
import { a } from "@/lib/i18n/admin";
import { SITE_SECTION_DEFS } from "./sections";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getAdminLocale();
  return { title: a("typeSiteSettings", locale) };
}

/** A singleton split into sections: each section has its own page and saves only its own fields. */
export default async function SiteSettingsPage() {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  await requireEditor();
  const [row] = await getDb().select({ id: siteSettings.id }).from(siteSettings).where(eq(siteSettings.singletonKey, "site")).limit(1);
  const needsGeneral = !row;

  return (
    <ConsolePage width="wide">
      <FormPageHeader def={contentTypeBySegment("site-settings")} locale={locale} mode="page" />
      <Card title={a("fmSiteSectionsTitle", locale)} description={a("fmSiteSectionsHint", locale)} level={2}>
        <ul className="m-0 flex list-none flex-col p-0">
          {SITE_SECTION_DEFS.filter((def) => !needsGeneral || def.id === "general").map((def) => (
            <li key={def.id} className="flex items-start gap-[var(--space-3)] border-b border-line py-[var(--space-3)] first:pt-0 last:border-b-0 last:pb-0">
              <ConsoleIcon name={def.icon} className="mt-[var(--space-1)] shrink-0 text-ink-600" />
              <div className="min-w-0">
                <h3 className="m-0 text-base font-semibold">
                  <Link href={`/admin/content/site-settings/${def.id}`} className="inline-flex min-h-[var(--target-min)] items-center">
                    {a(def.titleKey, locale)}
                  </Link>
                </h3>
                <p className="m-0 text-sm text-ink-600">{a(def.hintKey, locale)}</p>
              </div>
            </li>
          ))}
        </ul>
        {needsGeneral ? <p className="m-0 mt-[var(--space-3)] text-sm text-ink-600">{a("fmSiteNeedGeneral", locale)}</p> : null}
      </Card>
    </ConsolePage>
  );
}
