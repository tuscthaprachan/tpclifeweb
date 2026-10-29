import { ContentListPage, type ContentListSearchParams } from "@/app/admin/content/_list/ContentListPage";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { requireEditor } from "@/lib/admin/content/access";
import { getAdminLocale } from "@/lib/admin/locale";
import { isAuthConfigured } from "@/lib/auth";
import { a } from "@/lib/i18n/admin";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getAdminLocale();
  return { title: a("typeCanonicalDishes", locale) };
}

export default async function CanonicalDishListPage({ searchParams }: { searchParams: Promise<ContentListSearchParams> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  await requireEditor();
  return <ContentListPage segment="canonical-dishes" searchParams={searchParams} />;
}
