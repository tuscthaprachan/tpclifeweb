import { notFound } from "next/navigation";
import { AdminPage } from "@/components/admin/AdminPage";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { Heading } from "@/components/ui";
import { requireEditor } from "@/lib/admin/content/access";
import { isUuid } from "@/lib/admin/content/form-state";
import { getAdminLocale } from "@/lib/admin/locale";
import { isAuthConfigured } from "@/lib/auth";
import { a } from "@/lib/i18n/admin";
import { PageForm } from "../../_pages/PageForm";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getAdminLocale();
  return { title: a("typeGuidesOne", locale) };
}

export default async function EditGuidePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  await requireEditor();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { saved } = await searchParams;

  return (
    <AdminPage width="content">
      <Heading level={1}>{a("editItem", locale, { item: a("typeGuidesOne", locale) })}</Heading>
      <PageForm locale={locale} kind="guide" id={id} saved={saved} />
    </AdminPage>
  );
}
