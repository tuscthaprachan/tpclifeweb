import { notFound } from "next/navigation";
import { ConsolePage } from "@/components/admin/ui";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { FormPageHeader } from "@/app/admin/content/_list/FormPageHeader";
import { contentTypeBySegment } from "@/app/admin/content/_list/placement";
import { requireEditor } from "@/lib/admin/content/access";
import { getAdminLocale } from "@/lib/admin/locale";
import { isAuthConfigured } from "@/lib/auth";
import { a } from "@/lib/i18n/admin";
import { SITE_SECTION_DEFS } from "../sections";
import { SiteSettingsForm } from "../SiteSettingsForm";
import { isSiteSection } from "../validate";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }) {
  const locale = await getAdminLocale();
  const { section } = await params;
  const def = SITE_SECTION_DEFS.find((d) => d.id === section);
  return { title: def ? `${a(def.titleKey, locale)} | ${a("typeSiteSettings", locale)}` : a("typeSiteSettings", locale) };
}

/** One section of the site settings. Saves only its own fields. */
export default async function SiteSettingsSectionPage({ params, searchParams }: { params: Promise<{ section: string }>; searchParams: Promise<{ saved?: string }> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  await requireEditor();
  const { section } = await params;
  if (!isSiteSection(section)) notFound();
  const { saved } = await searchParams;
  const def = SITE_SECTION_DEFS.find((d) => d.id === section)!;

  return (
    <ConsolePage width="wide">
      <FormPageHeader def={contentTypeBySegment("site-settings")} locale={locale} mode="edit" title={a(def.titleKey, locale)} description={a(def.hintKey, locale)} />
      <SiteSettingsForm locale={locale} section={section} saved={saved} />
    </ConsolePage>
  );
}
