import { ConsolePage } from "@/components/admin/ui";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { FormPageHeader } from "@/app/admin/content/_list/FormPageHeader";
import { contentTypeBySegment } from "@/app/admin/content/_list/placement";
import { requireEditor } from "@/lib/admin/content/access";
import { getAdminLocale } from "@/lib/admin/locale";
import { isAuthConfigured } from "@/lib/auth";
import { a } from "@/lib/i18n/admin";
import { ServicePagesForm } from "./ServicePagesForm";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getAdminLocale();
  return { title: a("typeServicePages", locale) };
}

/** A singleton: no list, this page edits the one row. */
export default async function ServicePagesPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  await requireEditor();
  const { saved } = await searchParams;
  return (
    <ConsolePage width="wide">
      <FormPageHeader def={contentTypeBySegment("service-pages")} locale={locale} mode="page" />
      <ServicePagesForm locale={locale} saved={saved} />
    </ConsolePage>
  );
}
