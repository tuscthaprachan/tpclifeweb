import { AdminPage } from "@/components/admin/AdminPage";
import { ContentList } from "@/components/admin/content/ContentList";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { Heading } from "@/components/ui";
import { requireEditor } from "@/lib/admin/content/access";
import { listContentRows } from "@/lib/admin/content/list";
import { getContentType } from "@/lib/admin/content/types";
import { getAdminLocale } from "@/lib/admin/locale";
import { isAuthConfigured } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { a } from "@/lib/i18n/admin";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getAdminLocale();
  return { title: a("typeForms", locale) };
}

export default async function FormListPage({ searchParams }: { searchParams: Promise<{ q?: string; notice?: string }> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  await requireEditor();
  const { q, notice } = await searchParams;
  const def = getContentType("forms")!;
  const { rows, total } = await listContentRows(getDb(), def, { q });

  return (
    <AdminPage width="content">
      <Heading level={1}>{a(def.labelKey, locale)}</Heading>
      <ContentList def={def} locale={locale} rows={rows} total={total} q={q} notice={notice} />
    </AdminPage>
  );
}
