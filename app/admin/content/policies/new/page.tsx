import { AdminPage } from "@/components/admin/AdminPage";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { Heading } from "@/components/ui";
import { requireEditor } from "@/lib/admin/content/access";
import { getAdminLocale } from "@/lib/admin/locale";
import { isAuthConfigured } from "@/lib/auth";
import { a } from "@/lib/i18n/admin";
import { PolicyForm } from "../PolicyForm";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getAdminLocale();
  return { title: a("listAdd", locale, { item: a("typePoliciesOne", locale) }) };
}

export default async function NewPolicyPage() {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  await requireEditor();
  return (
    <AdminPage width="content">
      <Heading level={1}>{a("listAdd", locale, { item: a("typePoliciesOne", locale) })}</Heading>
      <PolicyForm locale={locale} />
    </AdminPage>
  );
}
