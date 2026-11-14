import { notFound } from "next/navigation";
import { ConsoleIcon } from "@/components/admin/icons";
import { ConfirmPanel } from "@/components/admin/ConfirmPanel";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { Button } from "@/components/ui";
import { requireEditor } from "@/lib/admin/content/access";
import { isUuid } from "@/lib/admin/content/form-state";
import { getAdminLocale } from "@/lib/admin/locale";
import { adminTitle } from "@/lib/admin/metadata";
import { isAuthConfigured } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { a } from "@/lib/i18n/admin";
import { getRedirect } from "@/lib/redirects/store";
import { deleteRedirectAction } from "../../actions";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return adminTitle("rdDelete");
}

export default async function DeleteRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  await requireEditor();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const row = await getRedirect(getDb(), id);
  if (!row) notFound();

  return (
    <ConfirmPanel locale={locale} title={a("rdDelete", locale)} icon="delete" description={<code className="break-all">{row.fromPath}</code>} warning={a("rdDeleteConfirm", locale)}>
      <form action={deleteRedirectAction.bind(null, id)} className="flex flex-wrap gap-[var(--space-3)]">
        <Button type="submit" variant="destructive" icon={<ConsoleIcon name="delete" />}>
          {a("rdDelete", locale)}
        </Button>
        <Button href="/admin/settings/redirects" variant="secondary">
          {a("rdCancel", locale)}
        </Button>
      </form>
    </ConfirmPanel>
  );
}
