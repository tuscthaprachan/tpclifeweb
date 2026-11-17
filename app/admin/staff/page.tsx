import Link from "next/link";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { PeopleIcon } from "@/components/admin/PeopleIcon";
import { Card, ConsolePage, EmptyPanel, PageHeader } from "@/components/admin/ui";
import { Button, DataTable, NotificationBanner, Tag, Timestamp } from "@/components/ui";
import { adminTitle } from "@/lib/admin/metadata";
import { getAdminLocale } from "@/lib/admin/locale";
import { isAuthConfigured } from "@/lib/auth";
import { listPendingRecoveryUserIds } from "@/lib/auth/recovery";
import { requireStaff } from "@/lib/auth/session";
import { listOrganisations, listPendingInvites, listStaff } from "@/lib/auth/staff";
import { getDb } from "@/lib/db";
import { a, ROLE_LABEL } from "@/lib/i18n/admin";
import { pick } from "@/lib/i18n/config";
import { InviteForm } from "./InviteForm";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return adminTitle("staffTitle");
}

type Notice = "invite-cancelled" | "gone";

export default async function StaffPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;

  const staff = await requireStaff("admin");
  const db = getDb();
  const [people, invites, orgs, query] = await Promise.all([
    listStaff(db),
    listPendingInvites(db),
    listOrganisations(db),
    searchParams,
  ]);
  const withRecovery = await listPendingRecoveryUserIds(
    db,
    people.map((p) => p.userId),
  );
  const orgName = new Map(orgs.map((o) => [o.id, pick({ th: o.nameTh, en: o.nameEn }, locale)]));
  const notice = query.notice as Notice | undefined;

  const initials = (name: string, email: string) => {
    const parts = (name.trim() || email).split(/[\s@._-]+/).filter(Boolean);
    const first = (word: string | undefined) => Array.from(word ?? "")[0] ?? "";
    return (parts.length > 1 ? first(parts[0]) + first(parts[1]) : first(parts[0]) || "?").toUpperCase();
  };

  return (
    <ConsolePage width="content">
      {notice === "invite-cancelled" ? <NotificationBanner variant="success" title={a("inviteCancelledTitle", locale)}>{a("inviteCancelledBody", locale)}</NotificationBanner> : null}
      {notice === "gone" ? <NotificationBanner variant="info" title={a("goneTitle", locale)}>{a("errNothingToChange", locale)}</NotificationBanner> : null}

      <PageHeader
        title={a("staffTitle", locale)}
        icon="staff"
        description={a("staffIntro", locale)}
        actions={
          <Button href="#invite-staff" icon={<PeopleIcon name="userPlus" />}>
            {a("cpInviteStaff", locale)}
          </Button>
        }
      />

      <Card title={a("staffTitle", locale)} icon="staff" description={`${a("cpPeopleDesc", locale)} ${a("cpPeopleCount", locale, { count: people.length })}`} padded={false}>
        {people.length === 0 ? (
          <EmptyPanel icon="staff" title={a("noStaff", locale)} />
        ) : (
          <DataTable
            caption={<span className="visually-hidden">{a("staffListCaption", locale)}</span>}
            rows={people}
            getRowKey={(p) => p.userId}
            columns={[
              {
                id: "person",
                header: a("colPerson", locale),
                cell: (p) => (
                  <span className="flex items-center gap-[var(--space-3)]">
                    <span className="console-avatar shrink-0" aria-hidden="true">
                      {initials(p.name, p.email)}
                    </span>
                    <span className="min-w-0">
                      <Link href={`/admin/staff/${encodeURIComponent(p.userId)}`} className="font-bold">
                        {p.name || p.email}
                      </Link>
                      {p.userId === staff.user.id ? <span className="text-sm text-ink-600"> ({a("you", locale)})</span> : null}
                      {p.name ? <span className="block break-words text-sm text-ink-600">{p.email}</span> : null}
                    </span>
                  </span>
                ),
              },
              {
                id: "roles",
                header: a("colRoles", locale),
                cell: (p) =>
                  p.suspended ? (
                    <Tag>{a("smSuspendedTag", locale)}</Tag>
                  ) : (
                    <span className="flex flex-wrap gap-[var(--space-1)]">
                      {p.roles.map((g) => (
                        <Tag key={g.id}>{a(ROLE_LABEL[g.role], locale)}</Tag>
                      ))}
                    </span>
                  ),
              },
              {
                id: "organisations",
                header: a("smColOrganisations", locale),
                cell: (p) => p.organisationIds.map((id) => orgName.get(id) ?? "").filter(Boolean).join(", "),
              },
              {
                id: "account",
                header: a("cpColActions", locale),
                cell: (p) => (
                  <span>
                    <Link href={`/admin/staff/${encodeURIComponent(p.userId)}`} className="inline-flex min-h-[var(--target-min)] items-center gap-[var(--space-1)]">
                      <PeopleIcon name="users" size={16} />
                      {a("smManage", locale)}
                      <span className="visually-hidden"> {p.name || p.email}</span>
                    </Link>
                    {withRecovery.has(p.userId) ? (
                      <span className="flex items-center gap-[var(--space-1)] text-sm text-ink-600">
                        <PeopleIcon name="clock" size={14} />
                        {a("recoveryPendingNote", locale)}
                      </span>
                    ) : null}
                  </span>
                ),
              },
            ]}
          />
        )}
      </Card>

      <Card title={a("pendingHeading", locale)} icon="forms" description={a("cpPendingDesc", locale)} padded={invites.length === 0}>
        {invites.length === 0 ? (
          <p className="m-0">{a("noPending", locale)}</p>
        ) : (
          <DataTable
            caption={<span className="visually-hidden">{a("pendingCaption", locale)}</span>}
            rows={invites}
            getRowKey={(i) => String(i.id)}
            columns={[
              { id: "email", header: a("colEmail", locale), cell: (i) => i.email },
              { id: "org", header: a("smColOrganisations", locale), cell: (i) => i.organisationIds.map((id) => orgName.get(id) ?? "").filter(Boolean).join(", ") },
              {
                id: "roles",
                header: a("colRoles", locale),
                cell: (i) => (
                  <span className="flex flex-wrap gap-[var(--space-1)]">
                    {i.roles.map((r) => (
                      <Tag key={r}>{a(ROLE_LABEL[r], locale)}</Tag>
                    ))}
                  </span>
                ),
              },
              {
                id: "expires",
                header: a("colExpires", locale),
                cell: (i) => (
                  <span className="inline-flex items-center gap-[var(--space-1)]">
                    <PeopleIcon name="clock" size={16} className="text-ink-600" />
                    <Timestamp value={i.expiresAt} locale={locale} />
                  </span>
                ),
              },
              {
                id: "cancel",
                header: a("cpColActions", locale),
                cell: (i) => (
                  <Link href={`/admin/staff/invites/${i.id}/cancel`} className="inline-flex min-h-[var(--target-min)] items-center gap-[var(--space-1)]">
                    <PeopleIcon name="cancel" size={16} />
                    {a("cancelInvite", locale)}
                    <span className="visually-hidden"> {i.email}</span>
                  </Link>
                ),
              },
            ]}
          />
        )}
      </Card>

      <div id="invite-staff" className="scroll-mt-[var(--space-8)]">
        <Card title={a("inviteHeading", locale)} icon="add" description={a("inviteIntro", locale)}>
          <InviteForm locale={locale} organisations={orgs.map((o) => ({ id: o.id, nameTh: o.nameTh, nameEn: o.nameEn }))} />
        </Card>
      </div>
    </ConsolePage>
  );
}
