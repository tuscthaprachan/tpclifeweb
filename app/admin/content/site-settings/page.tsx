import { AdminPage } from "@/components/admin/AdminPage";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { Heading } from "@/components/ui";
import { requireEditor } from "@/lib/admin/content/access";
import { getAdminLocale } from "@/lib/admin/locale";
import { isAuthConfigured } from "@/lib/auth";
import { a } from "@/lib/i18n/admin";
import { SiteSettingsForm } from "./SiteSettingsForm";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getAdminLocale();
  return { title: a("typeSiteSettings", locale) };
}

/** A singleton: this page edits the one site settings row directly. */
export default async function SiteSettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  await requireEditor();
  const { saved } = await searchParams;

  return (
    <AdminPage width="content">
      <Heading level={1}>{a("typeSiteSettings", locale)}</Heading>
      <SiteSettingsForm locale={locale} saved={saved} />
    </AdminPage>
  );
}
