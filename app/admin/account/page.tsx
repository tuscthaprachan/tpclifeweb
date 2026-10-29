import { NotConfigured } from "@/components/admin/NotConfigured";
import { Card, ConsolePage, PageHeader } from "@/components/admin/ui";
import { ConsoleIcon } from "@/components/admin/icons";
import { Button, SummaryList, Timestamp } from "@/components/ui";
import { getAdminLocale } from "@/lib/admin/locale";
import { adminTitle } from "@/lib/admin/metadata";
import { isAuthConfigured } from "@/lib/auth";
import { requireStaff } from "@/lib/auth/session";
import { a, ROLE_LABEL } from "@/lib/i18n/admin";
import { pick } from "@/lib/i18n/config";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return adminTitle("chAccountTitle");
}

export default async function AccountPage() {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  const staff = await requireStaff();

  const orgName = new Map(staff.organisations.map((o) => [o.id, pick({ th: o.nameTh, en: o.nameEn }, locale)]));
  const roleLines = staff.roles.map((r) =>
    a("roleAtOrganisation", locale, { role: a(ROLE_LABEL[r.role], locale), organisation: orgName.get(r.organisationId) ?? "" }),
  );

  return (
    <ConsolePage width="narrow">
      <PageHeader title={a("chAccountTitle", locale)} description={a("chAccountIntro", locale)} icon="account" />
      <Card title={a("yourDetails", locale)} icon="account">
        <SummaryList
          rows={[
            { key: a("rowName", locale), value: staff.user.name || a("nameNotGiven", locale) },
            { key: a("rowEmail", locale), value: staff.user.email },
            { key: a("rowOrganisations", locale), value: <List items={[...orgName.values()]} /> },
            { key: a("rowRoles", locale), value: <List items={roleLines} /> },
          ]}
        />
      </Card>
      <Card title={a("chAccountSessionTitle", locale)} icon="security" description={a("chAccountSecurityHint", locale)}>
        <SummaryList
          rows={[{ key: a("rowSessionEnds", locale), value: <Timestamp value={staff.times.expiresAt} locale={locale} format="datetime" /> }]}
        />
        <div className="mt-[var(--space-3)]">
          <Button href="/admin/security" variant="secondary" icon={<ConsoleIcon name="security" />}>
            {a("csNavSecurity", locale)}
          </Button>
        </div>
      </Card>
    </ConsolePage>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="m-0 list-none p-0">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
