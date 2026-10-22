import { redirect } from "next/navigation";
import { AdminPage } from "@/components/admin/AdminPage";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { Button, Heading, InsetText } from "@/components/ui";
import { readBackupCodes } from "@/lib/admin/backup-codes-flash";
import { adminTitle } from "@/lib/admin/metadata";
import { getAdminLocale } from "@/lib/admin/locale";
import { isAuthConfigured } from "@/lib/auth";
import { isStaff } from "@/lib/auth/roles";
import { requireSignedIn } from "@/lib/auth/session";
import { a } from "@/lib/i18n/admin";
import { finishAuthenticatorSetup } from "../actions";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return adminTitle("backupDoneTitle");
}

/** Shows the backup codes once, straight after the authenticator app is confirmed. */
export default async function BackupCodesPage() {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  const ctx = await requireSignedIn();
  if (!isStaff(ctx.roles)) redirect("/admin/no-access");
  if (!ctx.secondFactorAt) redirect("/admin/sign-in/verify");

  const codes = await readBackupCodes();
  return (
    <AdminPage>
      <Heading level={1}>{a("backupDoneTitle", locale)}</Heading>
      {codes ? (
        <>
          <p className="m-0">{a("backupDoneIntro", locale)}</p>
          <InsetText>{a("backupDoneWarning", locale)}</InsetText>
          <ul className="m-0 grid list-none grid-cols-2 gap-[var(--space-2)] p-0 font-mono text-lg">
            {codes.map((code) => (
              <li key={code}>{code}</li>
            ))}
          </ul>
        </>
      ) : (
        <p className="m-0">{a("backupDoneGone", locale)}</p>
      )}
      <form action={finishAuthenticatorSetup}>
        <Button type="submit">{a("backupDoneButton", locale)}</Button>
      </form>
    </AdminPage>
  );
}
