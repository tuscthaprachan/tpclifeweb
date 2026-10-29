import { ConsolePage } from "@/components/admin/ui";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { FormPageHeader } from "@/app/admin/content/_list/FormPageHeader";
import { contentTypeBySegment } from "@/app/admin/content/_list/placement";
import { requireEditor } from "@/lib/admin/content/access";
import { getAdminLocale } from "@/lib/admin/locale";
import { isAuthConfigured } from "@/lib/auth";
import { a } from "@/lib/i18n/admin";
import { CanteenDishForm } from "../CanteenDishForm";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getAdminLocale();
  return { title: a("listAdd", locale, { item: a("typeCanteenDishesOne", locale) }) };
}

export default async function NewCanteenDishPage({ searchParams }: { searchParams: Promise<{ stall?: string }> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  await requireEditor();
  const { stall } = await searchParams;
  return (
    <ConsolePage width="wide">
      <FormPageHeader def={contentTypeBySegment("canteen-dishes")} locale={locale} mode="new" />
      <CanteenDishForm locale={locale} stallId={stall} />
    </ConsolePage>
  );
}
