import { notFound } from "next/navigation";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { Card, ConsolePage, PageHeader } from "@/components/admin/ui";
import { requireEditor } from "@/lib/admin/content/access";
import { isUuid } from "@/lib/admin/content/form-state";
import { getAdminLocale } from "@/lib/admin/locale";
import { adminTitle } from "@/lib/admin/metadata";
import { isAuthConfigured } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { a } from "@/lib/i18n/admin";
import { getRedirect } from "@/lib/redirects/store";
import { RedirectForm } from "../RedirectForm";
import { saveRedirectAction } from "../actions";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return adminTitle("rdEditHeading");
}

export default async function EditRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  await requireEditor();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const row = await getRedirect(getDb(), id);
  if (!row) notFound();

  return (
    <ConsolePage width="content">
      <PageHeader title={a("rdEditHeading", locale)} icon="redirects" breadcrumbs={[{ label: a("rdTitle", locale), href: "/admin/settings/redirects" }, { label: a("rdEditHeading", locale) }]} breadcrumbsLabel={a("csBreadcrumbs", locale)} />
      <Card>
        <RedirectForm locale={locale} action={saveRedirectAction.bind(null, id)} defaults={{ from: row.fromPath, to: row.toPath, status: row.status }} submitLabel={a("rdSave", locale)} />
      </Card>
    </ConsolePage>
  );
}
