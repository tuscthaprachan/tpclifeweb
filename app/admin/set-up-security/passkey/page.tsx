import { AdminPage } from "@/components/admin/AdminPage";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { PasskeyButton } from "@/components/admin/PasskeyButton";
import { Heading, InsetText } from "@/components/ui";
import { adminTitle } from "@/lib/admin/metadata";
import { getAdminLocale } from "@/lib/admin/locale";
import { isAuthConfigured } from "@/lib/auth";
import { a } from "@/lib/i18n/admin";
import { requireSetupAccess } from "../guard";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return adminTitle("passkeySetupTitle");
}

export default async function PasskeySetupPage() {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  await requireSetupAccess();

  return (
    <AdminPage>
      <div>
        <Heading level={1}>{a("passkeySetupTitle", locale)}</Heading>
        <p className="mt-[var(--space-2)] text-ink-600">{a("passkeySetupBody", locale)}</p>
      </div>
      <PasskeyButton locale={locale} mode="register" label={a("passkeyCreateButton", locale)} />
      <noscript>
        <InsetText>{a("passkeyNeedsScript", locale)}</InsetText>
      </noscript>
      <p>
        <a href="/admin/set-up-security">{a("chooseAnotherWay", locale)}</a>
      </p>
    </AdminPage>
  );
}
