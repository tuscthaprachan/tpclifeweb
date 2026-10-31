import { notFound } from "next/navigation";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { ConsolePage } from "@/components/admin/ui";
import { isUuid } from "@/lib/admin/content/form-state";
import { getAdminLocale } from "@/lib/admin/locale";
import { requireOpenDataEditor } from "@/lib/admin/open-data/access";
import { OPEN_DATA_PATHS } from "@/lib/admin/open-data/paths";
import { isAuthConfigured } from "@/lib/auth";
import { a } from "@/lib/i18n/admin";
import { OpenDataHeader } from "../../parts";
import { BudgetLineForm } from "../BudgetLineForm";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getAdminLocale();
  return { title: a("odmBudgetLineOne", locale) };
}

export default async function EditBudgetLineFormPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  const { owners } = await requireOpenDataEditor();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { saved } = await searchParams;
  return (
    <ConsolePage width="wide">
      <OpenDataHeader locale={locale} section="budget" title={a("editItem", locale, { item: a("odmBudgetLineOne", locale) })} trail={[{ label: a("odmTabBudget", locale), href: OPEN_DATA_PATHS.budget }]} />
      <BudgetLineForm locale={locale} owners={owners} id={id} saved={saved} />
    </ConsolePage>
  );
}
