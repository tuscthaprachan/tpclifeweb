import { ConsolePage } from "@/components/admin/ui";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { FormPageHeader } from "@/app/admin/content/_list/FormPageHeader";
import { contentTypeBySegment } from "@/app/admin/content/_list/placement";
import { requireEditor } from "@/lib/admin/content/access";
import { getAdminLocale } from "@/lib/admin/locale";
import { isAuthConfigured } from "@/lib/auth";
import { a } from "@/lib/i18n/admin";
import { CanonicalDishForm } from "../CanonicalDishForm";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getAdminLocale();
  return { title: a("listAdd", locale, { item: a("typeCanonicalDishesOne", locale) }) };
}

export default async function NewCanonicalDishPage() {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  await requireEditor();
  return (
    <ConsolePage width="wide">
      <FormPageHeader def={contentTypeBySegment("canonical-dishes")} locale={locale} mode="new" />
      <CanonicalDishForm locale={locale} />
    </ConsolePage>
  );
}
