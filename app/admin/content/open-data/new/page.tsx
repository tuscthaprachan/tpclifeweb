import { NotConfigured } from "@/components/admin/NotConfigured";
import { ConsolePage } from "@/components/admin/ui";
import { FormPageHeader } from "@/app/admin/content/_list/FormPageHeader";
import { contentTypeBySegment } from "@/app/admin/content/_list/placement";
import { getAdminLocale } from "@/lib/admin/locale";
import { requireOpenDataEditor } from "@/lib/admin/open-data/access";
import { isAuthConfigured } from "@/lib/auth";
import { a } from "@/lib/i18n/admin";
import { DocumentForm } from "../DocumentForm";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getAdminLocale();
  return { title: a("listAdd", locale, { item: a("typeOpenDataOne", locale) }) };
}

export default async function NewOpenDataDocumentPage() {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  const { owners } = await requireOpenDataEditor();
  return (
    <ConsolePage width="wide">
      <FormPageHeader def={contentTypeBySegment("open-data")} locale={locale} mode="new" />
      <DocumentForm locale={locale} owners={owners} />
    </ConsolePage>
  );
}
