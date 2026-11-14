import Link from "next/link";
import { notFound } from "next/navigation";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { PeopleIcon } from "@/components/admin/PeopleIcon";
import { Card, ConsolePage, EmptyPanel, PageHeader } from "@/components/admin/ui";
import { Button, Checkboxes, DataTable, NotificationBanner, Stack, SummaryList, Tag, Timestamp } from "@/components/ui";
import { adminTitle } from "@/lib/admin/metadata";
import { getAdminLocale } from "@/lib/admin/locale";
import { isAuthConfigured } from "@/lib/auth";
import { hasOtherActiveAdmin } from "@/lib/auth/recovery";
import { STAFF_ROLES } from "@/lib/auth/roles";
import { requireStaff } from "@/lib/auth/session";
import { getStaffMemberDetail, listOrganisations } from "@/lib/auth/staff";
import { getDb } from "@/lib/db";
import { a, ROLE_HINT, ROLE_LABEL } from "@/lib/i18n/admin";
import { pick } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { updateMember } from "../actions";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return adminTitle("smPageTitle");
}

const ERRORS: Record<string, "errLastAdmin" | "smErrNoRoles" | "smErrNoOrganisation" | "smErrUnknown"> = {
  "last-admin": "errLastAdmin",
  "no-roles": "smErrNoRoles",
  "no-organisation": "smErrNoOrganisation",
  failed: "smErrUnknown",
};

export default async function StaffMemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;

  const staff = await requireStaff("admin");
  const [{ userId }, query] = await Promise.all([params, searchParams]);
  const db = getDb();
  const [member, orgs] = await Promise.all([getStaffMemberDetail(db, userId), listOrganisations(db)]);
  if (!member) notFound();

  const otherAdmin = await hasOtherActiveAdmin(db, userId);
  const orgName = new Map(orgs.map((o) => [o.id, pick({ th: o.nameTh, en: o.nameEn }, locale)]));
  const person = member.name || member.email;
  const errorKey = query.error ? ERRORS[query.error] : undefined;
  const canRecover = !member.suspended && (member.userId !== staff.user.id || otherAdmin);

  return (
    <ConsolePage width="content">
      {query.notice === "saved" ? <NotificationBanner variant="success" title={a("smSavedTitle", locale)}>{a("smSavedBody", locale)}</NotificationBanner> : null}
      {query.notice === "unchanged" ? <NotificationBanner variant="info" title={a("smUnchangedTitle", locale)}>{a("smUnchangedBody", locale)}</NotificationBanner> : null}
      {query.notice === "suspended" ? <NotificationBanner variant="success" title={a("smSuspendedTitle", locale)}>{a("smSuspendedBody", locale)}</NotificationBanner> : null}
      {errorKey ? <NotificationBanner variant="warning" title={UI.errorTitle[locale]}>{a(errorKey, locale)}</NotificationBanner> : null}

      <PageHeader
        title={person}
        icon="staff"
        description={a("smIntro", locale)}
        actions={
          <Button href="/admin/staff" variant="secondary">
            {a("backToStaff", locale)}
          </Button>
        }
      />

      <Card title={a("smSummaryHeading", locale)} icon="staff">
        <SummaryList
          rows={[
            { key: a("rowName", locale), value: member.name || a("nameNotGiven", locale) },
            { key: a("rowEmail", locale), value: member.email },
            { key: a("smRowStatus", locale), value: member.suspended ? a("smStatusSuspended", locale) : a("smStatusActive", locale) },
            {
              key: a("rowOrganisations", locale),
              value: member.organisationIds.map((id) => orgName.get(id) ?? "").filter(Boolean).join(", "),
            },
            {
              key: a("rowRoles", locale),
              value: member.suspended ? (
                <Tag>{a("smSuspendedTag", locale)}</Tag>
              ) : (
                <span className="flex flex-wrap gap-[var(--space-1)]">
                  {member.roles.map((r) => (
                    <Tag key={r.id}>{a(ROLE_LABEL[r.role], locale)}</Tag>
                  ))}
                </span>
              ),
            },
            { key: a("smRowPasskeys", locale), value: a("smPasskeyCount", locale, { count: member.passkeyCount }) },
            {
              key: a("smRowLastSignIn", locale),
              value: member.lastSignInAt ? <Timestamp value={member.lastSignInAt} locale={locale} /> : a("smNeverSignedIn", locale),
            },
            { key: a("smRowCreated", locale), value: <Timestamp value={member.joinedAt} locale={locale} /> },
          ]}
        />
      </Card>

      <Card title={a("smFormHeading", locale)} icon="staff" description={a("smFormIntro", locale)}>
        <form action={updateMember}>
          <input type="hidden" name="userId" value={member.userId} />
          <Stack space={6}>
            {member.suspended ? <p className="m-0">{a("smSuspendedNote", locale)}</p> : null}
            <Checkboxes
              id="member-roles"
              name="roles"
              legend={a("smRolesLegend", locale)}
              defaultValue={member.roles.map((r) => r.role)}
              options={STAFF_ROLES.map((role) => ({ value: role, label: a(ROLE_LABEL[role], locale), hint: a(ROLE_HINT[role], locale) }))}
            />
            <Checkboxes
              id="member-organisations"
              name="organisations"
              legend={a("smOrganisationsLegend", locale)}
              hint={a("smOrganisationsHint", locale)}
              defaultValue={member.organisationIds.map(String)}
              options={orgs.map((o) => ({ value: String(o.id), label: pick({ th: o.nameTh, en: o.nameEn }, locale) }))}
            />
            <div>
              <Button type="submit" icon={<PeopleIcon name="shield" />}>
                {a(member.suspended ? "smRestore" : "smSave", locale)}
              </Button>
            </div>
          </Stack>
        </form>
      </Card>

      {canRecover ? (
        <Card title={a("smRecoveryHeading", locale)} icon="security" description={a("smRecoveryIntro", locale)}>
          <Button href={`/admin/staff/recovery/${encodeURIComponent(member.userId)}`} variant="secondary" icon={<PeopleIcon name="lifeBuoy" />}>
            {a("recoveryLinkVisible", locale)}
            <span className="visually-hidden"> {a("recoveryLinkFor", locale, { person })}</span>
          </Button>
        </Card>
      ) : null}

      {member.suspended ? null : (
        <Card title={a("smSuspendHeading", locale)} icon="staff" description={a("smSuspendIntro", locale)}>
          <Button href={`/admin/staff/${encodeURIComponent(member.userId)}/suspend`} variant="destructive" icon={<PeopleIcon name="cancel" />}>
            {a("smSuspendButton", locale)}
          </Button>
        </Card>
      )}

      <Card title={a("smRecentHeading", locale)} icon="staff" description={a("smRecentDesc", locale)} padded={member.recent.length === 0}>
        {member.recent.length === 0 ? (
          <EmptyPanel icon="staff" title={a("smRecentNone", locale)} />
        ) : (
          <DataTable
            caption={<span className="visually-hidden">{a("smRecentCaption", locale)}</span>}
            rows={member.recent}
            getRowKey={(r) => String(r.id)}
            columns={[
              { id: "when", header: a("smColWhen", locale), cell: (r) => <Timestamp value={r.at} locale={locale} /> },
              { id: "action", header: a("smColAction", locale), cell: (r) => <code>{r.action}</code> },
              {
                id: "by",
                header: a("smColBy", locale),
                cell: (r) =>
                  r.actorUserId === null ? (
                    a("smBySystem", locale)
                  ) : r.actorUserId === member.userId ? (
                    person
                  ) : (
                    <Link href={`/admin/staff/${encodeURIComponent(r.actorUserId)}`}>{r.actorName || r.actorUserId}</Link>
                  ),
              },
            ]}
          />
        )}
      </Card>
    </ConsolePage>
  );
}
