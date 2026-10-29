import { NotConfigured } from "@/components/admin/NotConfigured";
import { RecoverButton } from "@/components/admin/PasskeyButton";
import { AuthCard } from "@/components/admin/shell/AuthShell";
import { Button, InsetText } from "@/components/ui";
import { signOutAction } from "@/app/admin/actions";
import { adminTitle } from "@/lib/admin/metadata";
import { getAdminLocale } from "@/lib/admin/locale";
import { isAuthConfigured } from "@/lib/auth";
import { consumeTokenAttempt } from "@/lib/auth/rate-limit";
import { findRecoveryByToken, recoveryStatus } from "@/lib/auth/recovery";
import { getAdminSession, getRequestMeta } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { a } from "@/lib/i18n/admin";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return adminTitle("recoverTitle");
}

/** The page behind a recovery link: registers a new passkey on the existing account. */
export default async function RecoverPage({ params }: { params: Promise<{ token: string }> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  const { token } = await params;
  const db = getDb();

  const attempt = await consumeTokenAttempt(db, (await getRequestMeta()).ip);
  if (!attempt.allowed) {
    return (
      <AuthCard icon="lifeBuoy" title={a("recoverBadTitle", locale)}>
        <p className="m-0 text-ink-600">{a("tooManyTokenAttempts", locale)}</p>
      </AuthCard>
    );
  }

  const found = await findRecoveryByToken(db, token);
  const status = found ? recoveryStatus(found.link, new Date()) : null;

  if (!found || status !== "pending") {
    const message =
      status === "expired"
        ? a("recoverExpired", locale)
        : status === "revoked"
          ? a("recoverRevoked", locale)
          : status === "used"
            ? a("recoverUsed", locale)
            : a("recoverNotFound", locale);
    return (
      <AuthCard icon="lifeBuoy" title={a("recoverBadTitle", locale)}>
        <p className="m-0 text-ink-600">{message}</p>
        {status === "used" ? (
          <div>
            <Button href="/admin/sign-in">{a("signInAgain", locale)}</Button>
          </div>
        ) : null}
      </AuthCard>
    );
  }

  const session = await getAdminSession();
  if (session && session.user.id !== found.person.id) {
    return (
      <AuthCard icon="lifeBuoy" title={a("recoverTitle", locale)}>
        <p className="m-0 text-ink-600">{a("inviteWrongAccount", locale)}</p>
        <form action={signOutAction}>
          <Button type="submit" variant="secondary">
            {a("signOut", locale)}
          </Button>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard icon="lifeBuoy" title={a("recoverTitle", locale)}>
      <p className="m-0 text-ink-600">{a("recoverBody", locale, { name: found.person.name || found.person.email, email: found.person.email })}</p>
      <RecoverButton locale={locale} token={token} />
      <noscript>
        <InsetText>{a("passkeyNeedsScript", locale)}</InsetText>
      </noscript>
    </AuthCard>
  );
}
