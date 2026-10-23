import { redirect } from "next/navigation";
import { AdminPage } from "@/components/admin/AdminPage";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { PasskeyButton } from "@/components/admin/PasskeyButton";
import { Heading, InsetText, Stack } from "@/components/ui";
import { adminTitle } from "@/lib/admin/metadata";
import { getAdminLocale } from "@/lib/admin/locale";
import { isAuthConfigured } from "@/lib/auth";
import { getSecondFactorKinds } from "@/lib/auth/factors";
import { isStaff } from "@/lib/auth/roles";
import { requireSignedIn } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { a } from "@/lib/i18n/admin";
import { verifyAuthenticator, verifyBackupCode } from "./actions";
import { CodeEntryForm } from "./CodeEntryForm";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return adminTitle("verifyTitle");
}

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ method?: string }> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;

  const ctx = await requireSignedIn();
  if (!isStaff(ctx.roles)) redirect("/admin/no-access");
  if (ctx.secondFactorAt) redirect("/admin");
  if (!ctx.hasSecondFactor) redirect("/admin/set-up-security");

  const kinds = await getSecondFactorKinds(getDb(), ctx.user.id);
  const { method } = await searchParams;

  if (method === "backup" && kinds.totp) {
    return (
      <AdminPage>
        <Heading level={1}>{a("backupTitle", locale)}</Heading>
        <CodeEntryForm
          locale={locale}
          action={verifyBackupCode}
          id="admin-backup-code"
          label={a("backupLabel", locale)}
          hint={a("backupHint", locale)}
          numeric={false}
        />
        <p>
          <a href="/admin/sign-in/verify">{a("backToAuthApp", locale)}</a>
        </p>
      </AdminPage>
    );
  }

  return (
    <AdminPage>
      <div>
        <Heading level={1}>{a("verifyTitle", locale)}</Heading>
        <p className="mt-[var(--space-2)] text-ink-600">{a("verifyIntro", locale)}</p>
      </div>

      {kinds.totp ? (
        <>
          <CodeEntryForm
            locale={locale}
            action={verifyAuthenticator}
            id="admin-auth-code"
            label={a("authCodeLabel", locale)}
            hint={a("authCodeHint", locale)}
            numeric
          />
          <p>
            <a href="/admin/sign-in/verify?method=backup">{a("backupLink", locale)}</a>
          </p>
        </>
      ) : null}

      {kinds.passkey ? (
        <Stack space={3}>
          <Heading level={2}>{a("passkeyUseHeading", locale)}</Heading>
          <p className="m-0 text-ink-600">{a("passkeyUseBody", locale)}</p>
          <PasskeyButton locale={locale} mode="sign-in" label={a("passkeyUseButton", locale)} />
          <noscript>
            <InsetText>{a("passkeyNeedsScript", locale)}</InsetText>
          </noscript>
        </Stack>
      ) : null}
    </AdminPage>
  );
}
