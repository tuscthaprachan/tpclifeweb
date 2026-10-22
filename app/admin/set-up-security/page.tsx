import { AdminPage } from "@/components/admin/AdminPage";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { Heading } from "@/components/ui";
import { adminTitle } from "@/lib/admin/metadata";
import { getAdminLocale } from "@/lib/admin/locale";
import { isAuthConfigured } from "@/lib/auth";
import { a } from "@/lib/i18n/admin";
import { requireSetupAccess } from "./guard";
import { SecurityChoiceForm } from "./SecurityChoiceForm";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return adminTitle("setupTitle");
}

export default async function SetUpSecurityPage() {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  await requireSetupAccess();

  return (
    <AdminPage>
      <div>
        <Heading level={1}>{a("setupTitle", locale)}</Heading>
        <p className="mt-[var(--space-2)] text-ink-600">{a("setupIntro", locale)}</p>
      </div>
      <SecurityChoiceForm locale={locale} />
    </AdminPage>
  );
}
