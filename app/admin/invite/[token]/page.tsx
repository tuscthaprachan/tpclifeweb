import { AdminPage } from "@/components/admin/AdminPage";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { Heading, SummaryList } from "@/components/ui";
import { adminTitle } from "@/lib/admin/metadata";
import { getAdminLocale } from "@/lib/admin/locale";
import { isAuthConfigured } from "@/lib/auth";
import { findInviteByToken, inviteStatus } from "@/lib/auth/invites";
import { getDb } from "@/lib/db";
import { a, ROLE_LABEL } from "@/lib/i18n/admin";
import { pick } from "@/lib/i18n/config";
import { StartForm } from "./StartForm";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return adminTitle("inviteLandingTitle");
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  const { token } = await params;

  const found = await findInviteByToken(getDb(), token);
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
          <p>
            <a href="/admin/sign-in">{a("signInAgain", locale)}</a>
          </p>
        ) : null}
      </AdminPage>
    );
  }

  const organisation = pick({ th: found.organisation.nameTh, en: found.organisation.nameEn }, locale);
  return (
    <AdminPage>
      <div>
        <Heading level={1}>{a("inviteLandingTitle", locale)}</Heading>
        <p className="mt-[var(--space-2)] text-ink-600">
          {a("inviteLandingBody", locale, { organisation, email: found.invite.email })}
        </p>
      </div>
      <SummaryList
        rows={[
          { key: a("colOrganisation", locale), value: organisation },
          { key: a("rowRoles", locale), value: found.invite.roles.map((r) => a(ROLE_LABEL[r], locale)).join(", ") },
        ]}
      />
      <StartForm locale={locale} token={token} />
    </AdminPage>
  );
}
