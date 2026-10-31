import { notFound } from "next/navigation";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { ConsolePage } from "@/components/admin/ui";
import { FormPageHeader } from "@/app/admin/content/_list/FormPageHeader";
import { contentTypeBySegment } from "@/app/admin/content/_list/placement";
import { isUuid } from "@/lib/admin/content/form-state";
import { getAdminLocale } from "@/lib/admin/locale";
import { requireOpenDataEditor } from "@/lib/admin/open-data/access";
import { isAuthConfigured } from "@/lib/auth";
import { a } from "@/lib/i18n/admin";
import { DocumentForm } from "../DocumentForm";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getAdminLocale();
  return { title: a("typeOpenDataOne", locale) };
}

export default async function EditOpenDataDocumentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  const { owners } = await requireOpenDataEditor();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { saved } = await searchParams;
  return (
    <ConsolePage width="wide">
      <FormPageHeader def={contentTypeBySegment("open-data")} locale={locale} mode="edit" />
      <DocumentForm locale={locale} owners={owners} id={id} saved={saved} />
    </ConsolePage>
  );
}
