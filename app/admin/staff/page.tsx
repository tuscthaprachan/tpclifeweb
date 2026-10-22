import { AdminPage } from "@/components/admin/AdminPage";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { DataTable, Heading, NotificationBanner, Stack, Timestamp } from "@/components/ui";
import { adminTitle } from "@/lib/admin/metadata";
import { getAdminLocale } from "@/lib/admin/locale";
import { isAuthConfigured } from "@/lib/auth";
import { organisationsWithRole } from "@/lib/auth/roles";
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

type Notice = "invited" | "role-removed" | "invite-cancelled" | "gone";

export default async function StaffPage({ searchParams }: { searchParams: Promise<{ notice?: string; email?: string }> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;

  const staff = await requireStaff("admin");
  const adminOrgIds = organisationsWithRole(staff.roles, "admin");
  const db = getDb();
  const [people, invites, allOrgs, query] = await Promise.all([
    listStaff(db, adminOrgIds),
    listPendingInvites(db, adminOrgIds),
    listOrganisations(db),
    searchParams,
  ]);
  const orgs = allOrgs.filter((o) => adminOrgIds.includes(o.id));
  const orgName = new Map(orgs.map((o) => [o.id, pick({ th: o.nameTh, en: o.nameEn }, locale)]));
  const notice = query.notice as Notice | undefined;

  return (
    <AdminPage width="content">
      {notice === "invited" ? (
        <NotificationBanner variant="success" title={a("invitedTitle", locale)}>
          {a("invitedBody", locale, { email: query.email ?? "" })}
        </NotificationBanner>
      ) : null}
      {notice === "role-removed" ? <NotificationBanner variant="success" title={a("roleRemovedTitle", locale)}>{a("roleRemovedBody", locale)}</NotificationBanner> : null}
      {notice === "invite-cancelled" ? <NotificationBanner variant="success" title={a("inviteCancelledTitle", locale)}>{a("inviteCancelledBody", locale)}</NotificationBanner> : null}
      {notice === "gone" ? <NotificationBanner variant="info" title={a("goneTitle", locale)}>{a("errNothingToChange", locale)}</NotificationBanner> : null}

      <div>
        <Heading level={1}>{a("staffTitle", locale)}</Heading>
        <p className="mt-[var(--space-2)] text-ink-600">{a("staffIntro", locale)}</p>
      </div>

      <section>
        <Stack space={3}>
          {people.length === 0 ? (
            <p className="m-0">{a("noStaff", locale)}</p>
          ) : (
            <DataTable
              caption={a("staffListCaption", locale)}
              rows={people}
              getRowKey={(p) => p.userId}
              columns={[
                {
                  id: "person",
                  header: a("colPerson", locale),
                  cell: (p) => (
                    <span>
                      <strong>{p.name || p.email}</strong>
                      {p.name ? <span className="block text-sm text-ink-600">{p.email}</span> : null}
                      {p.userId === staff.user.id ? <span className="block text-sm text-ink-600">({a("you", locale)})</span> : null}
                    </span>
                  ),
                },
                {
                  id: "roles",
                  header: a("colRoles", locale),
                  cell: (p) => (
                    <ul className="m-0 list-none p-0">
                      {p.grants.map((g) => (
                        <li key={g.id} className="py-[var(--space-1)]">
                          {a("roleAtOrganisation", locale, { role: a(ROLE_LABEL[g.role], locale), organisation: orgName.get(g.organisationId) ?? "" })}{" "}
                          <a href={`/admin/staff/roles/${g.id}/remove`}>
                            {a("removeRoleVisible", locale)}
                            <span className="visually-hidden">
                              {" "}
                              {a("removeRoleFor", locale, { role: a(ROLE_LABEL[g.role], locale), person: p.name || p.email })}
                            </span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  ),
                },
              ]}
            />
          )}
        </Stack>
      </section>

      <section>
        <Heading level={2}>{a("pendingHeading", locale)}</Heading>
        {invites.length === 0 ? (
          <p>{a("noPending", locale)}</p>
        ) : (
          <DataTable
            caption={a("pendingCaption", locale)}
            rows={invites}
            getRowKey={(i) => String(i.id)}
            columns={[
              { id: "email", header: a("colEmail", locale), cell: (i) => i.email },
              { id: "org", header: a("colOrganisation", locale), cell: (i) => orgName.get(i.organisationId) ?? "" },
              { id: "roles", header: a("colRoles", locale), cell: (i) => i.roles.map((r) => a(ROLE_LABEL[r], locale)).join(", ") },
              { id: "expires", header: a("colExpires", locale), cell: (i) => <Timestamp value={i.expiresAt} locale={locale} /> },
              {
                id: "cancel",
                header: "",
                cell: (i) => (
                  <a href={`/admin/staff/invites/${i.id}/cancel`}>
                    {a("cancelInvite", locale)}
                    <span className="visually-hidden"> {a("cancelInviteFor", locale, { email: i.email })}</span>
                  </a>
                ),
              },
            ]}
          />
        )}
      </section>

      <section>
        <Stack space={3}>
          <Heading level={2}>{a("inviteHeading", locale)}</Heading>
          <p className="m-0 text-ink-600">{a("inviteIntro", locale)}</p>
          <InviteForm locale={locale} organisations={orgs.map((o) => ({ id: o.id, nameTh: o.nameTh, nameEn: o.nameEn }))} />
        </Stack>
      </section>
    </AdminPage>
  );
}
