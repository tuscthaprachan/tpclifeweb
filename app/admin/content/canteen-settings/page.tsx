import { AdminPage } from "@/components/admin/AdminPage";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { Heading } from "@/components/ui";
import { requireEditor } from "@/lib/admin/content/access";
import { getAdminLocale } from "@/lib/admin/locale";
import { isAuthConfigured } from "@/lib/auth";
import { a } from "@/lib/i18n/admin";
import { CanteenSettingsForm } from "./CanteenSettingsForm";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getAdminLocale();
  return { title: a("typeCanteenSettings", locale) };
}

/** A singleton: no list, this page edits the one row. */
export default async function CanteenSettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  await requireEditor();
  const { saved } = await searchParams;
  return (
    <AdminPage width="content">
      <Heading level={1}>{a("typeCanteenSettings", locale)}</Heading>
      <CanteenSettingsForm locale={locale} saved={saved} />
    </AdminPage>
  );
}
