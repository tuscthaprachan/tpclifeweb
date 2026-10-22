import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminPage } from "@/components/admin/AdminPage";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { Heading, Stack } from "@/components/ui";
import { adminTitle } from "@/lib/admin/metadata";
import { getAdminLocale } from "@/lib/admin/locale";
import { getAuth, isAuthConfigured } from "@/lib/auth";
import { a } from "@/lib/i18n/admin";
import { requireSetupAccess } from "../guard";
import { ConfirmForm } from "./ConfirmForm";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return adminTitle("authSetupTitle");
}

/** "ABCD EFGH ..." so the key is easy to read and type. */
function groupKey(secret: string): string {
  return secret.replace(/(.{4})/g, "$1 ").trim();
}

export default async function AuthenticatorSetupPage() {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  await requireSetupAccess();

  let uri: string;
  try {
    // Reads the secret created on the previous page; it does not make a new one.
    ({ totpURI: uri } = await getAuth().api.getTOTPURI({ body: {}, headers: await headers() }));
  } catch {
    redirect("/admin/set-up-security");
  }
  const secret = new URL(uri).searchParams.get("secret") ?? "";

  return (
    <AdminPage>
      <ConfirmForm
        locale={locale}
        intro={
          <Stack space={6}>
            <Heading level={1}>{a("authSetupTitle", locale)}</Heading>
            <ol className="m-0 flex list-decimal flex-col gap-[var(--space-4)] pl-[var(--space-6)]">
              <li>{a("authStep1", locale)}</li>
              <li>
                {a("authStep2", locale)}
                <p className="mb-0 mt-[var(--space-3)] font-medium">{a("setupKeyLabel", locale)}</p>
                <p className="m-0 break-all font-mono text-lg" translate="no">
                  {groupKey(secret)}
                </p>
                <p className="mb-0 mt-[var(--space-2)]">
                  <a href={uri}>{a("openInApp", locale)}</a>
                </p>
              </li>
            </ol>
          </Stack>
        }
      />
    </AdminPage>
  );
}
