import { AdminPage } from "@/components/admin/AdminPage";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { CreateAccountForm } from "@/components/admin/PasskeyButton";
import { Button, Heading, InsetText, SummaryList } from "@/components/ui";
import { signOutAction } from "@/app/admin/actions";
import { adminTitle } from "@/lib/admin/metadata";
import { getAdminLocale } from "@/lib/admin/locale";
import { isAuthConfigured } from "@/lib/auth";
import { normaliseEmail } from "@/lib/auth/email-address";
import { userExistsWithEmail } from "@/lib/auth/enrolment";
import { findInviteByToken, inviteStatus } from "@/lib/auth/invites";
import { consumeTokenAttempt } from "@/lib/auth/rate-limit";
import { getAdminSession, getRequestMeta } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { a, ROLE_LABEL } from "@/lib/i18n/admin";
import { pick } from "@/lib/i18n/config";
import { acceptInviteAction } from "./actions";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return adminTitle("inviteLandingTitle");
}

/** The page behind an invitation link. A new person creates their account with a passkey; an existing one signs in and accepts. */
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  const { token } = await params;
  const db = getDb();

  const attempt = await consumeTokenAttempt(db, (await getRequestMeta()).ip);
  if (!attempt.allowed) {
    return (
      <AdminPage>
        <Heading level={1}>{a("inviteBadTitle", locale)}</Heading>
        <p className="m-0">{a("tooManyTokenAttempts", locale)}</p>
      </AdminPage>
    );
  }

  const found = await findInviteByToken(db, token);
  const status = found ? inviteStatus(found.invite, new Date()) : null;

  if (!found || status !== "pending") {
    const message =
      status === "expired"
        ? a("inviteExpired", locale)
        : status === "revoked"
          ? a("inviteRevoked", locale)
          : status === "accepted"
            ? a("inviteAccepted", locale)
            : a("inviteNotFound", locale);
    return (
      <AdminPage>
        <Heading level={1}>{a("inviteBadTitle", locale)}</Heading>
        <p className="m-0">{message}</p>
        {status === "accepted" ? (
          <div>
            <Button href="/admin/sign-in">{a("signInAgain", locale)}</Button>
          </div>
        ) : null}
      </AdminPage>
    );
  }

  const organisation = pick({ th: found.organisation.nameTh, en: found.organisation.nameEn }, locale);
  const email = found.invite.email;
  const summary = (
    <SummaryList
      rows={[
        { key: a("colOrganisation", locale), value: organisation },
        { key: a("rowRoles", locale), value: found.invite.roles.map((r) => a(ROLE_LABEL[r], locale)).join(", ") },
      ]}
    />
  );

  const session = await getAdminSession();
  const hasAccount = await userExistsWithEmail(db, email);
  const signedInAsInvitee = Boolean(session?.secondFactorAt) && normaliseEmail(session?.user.email ?? "") === email;

  if (session && !signedInAsInvitee) {
    return (
      <AdminPage>
        <Heading level={1}>{a("inviteLandingTitle", locale)}</Heading>
        <p className="m-0">{a("inviteWrongAccount", locale)}</p>
        <form action={signOutAction}>
          <Button type="submit" variant="secondary">
            {a("signOut", locale)}
          </Button>
        </form>
      </AdminPage>
    );
  }

  if (hasAccount) {
    return (
      <AdminPage>
        {signedInAsInvitee ? (
          <>
            <div>
              <Heading level={1}>{a("inviteAcceptTitle", locale)}</Heading>
              <p className="mt-[var(--space-2)] text-ink-600">{a("inviteAcceptBody", locale, { email, organisation })}</p>
            </div>
            {summary}
            <form action={acceptInviteAction}>
              <input type="hidden" name="token" value={token} />
              <Button type="submit">{a("inviteAcceptButton", locale)}</Button>
            </form>
          </>
        ) : (
          <>
            <div>
              <Heading level={1}>{a("inviteExistingTitle", locale)}</Heading>
              <p className="mt-[var(--space-2)] text-ink-600">{a("inviteExistingBody", locale, { email })}</p>
            </div>
            {summary}
            <div>
              <Button href={`/admin/sign-in?next=${encodeURIComponent(`/admin/invite/${token}`)}`}>{a("inviteSignInToAccept", locale)}</Button>
            </div>
          </>
        )}
      </AdminPage>
    );
  }

  return (
    <AdminPage>
      <div>
        <Heading level={1}>{a("inviteLandingTitle", locale)}</Heading>
        <p className="mt-[var(--space-2)] text-ink-600">{a("inviteLandingBody", locale, { organisation, email })}</p>
      </div>
      {summary}
      <CreateAccountForm locale={locale} token={token} />
      <noscript>
        <InsetText>{a("passkeyNeedsScript", locale)}</InsetText>
      </noscript>
    </AdminPage>
  );
}
