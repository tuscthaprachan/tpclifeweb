import { AdminPage } from "@/components/admin/AdminPage";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { Button, Heading, SummaryList, Timestamp } from "@/components/ui";
import { CONTENT_TYPES, contentPath } from "@/lib/admin/content/types";
import { adminTitle } from "@/lib/admin/metadata";
import { getAdminLocale } from "@/lib/admin/locale";
import { isAuthConfigured } from "@/lib/auth";
import { canEditContent } from "@/lib/admin/content/access";
import { canUseCaseInbox } from "@/lib/cases/access";
import { hasRole } from "@/lib/auth/roles";
import { requireStaff } from "@/lib/auth/session";
import { a, ROLE_LABEL } from "@/lib/i18n/admin";
import { pick } from "@/lib/i18n/config";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return adminTitle("dashTitle");
}

export default async function AdminDashboardPage() {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  const staff = await requireStaff();

  const orgName = new Map(staff.organisations.map((o) => [o.id, pick({ th: o.nameTh, en: o.nameEn }, locale)]));
  const roleLines = staff.roles.map((r) =>
    a("roleAtOrganisation", locale, { role: a(ROLE_LABEL[r.role], locale), organisation: orgName.get(r.organisationId) ?? "" }),
  );

  return (
    <AdminPage>
      <div>
        <Heading level={1}>{a("dashTitle", locale)}</Heading>
        <p className="mt-[var(--space-2)] text-ink-600">{a("dashIntro", locale)}</p>
      </div>
      <section>
        <Heading level={2}>{a("yourDetails", locale)}</Heading>
        <SummaryList
          rows={[
            { key: a("rowName", locale), value: staff.user.name || a("nameNotGiven", locale) },
            { key: a("rowEmail", locale), value: staff.user.email },
            { key: a("rowOrganisations", locale), value: <List items={[...orgName.values()]} /> },
            { key: a("rowRoles", locale), value: <List items={roleLines} /> },
            { key: a("rowSessionEnds", locale), value: <Timestamp value={staff.times.expiresAt} locale={locale} format="datetime" /> },
          ]}
        />
      </section>
      {canEditContent(staff.roles) ? (
        <section>
          <Heading level={2}>{a("contentLink", locale)}</Heading>
          <p className="mt-[var(--space-2)] text-ink-600">{a("dashContentIntro", locale)}</p>
          <ul className="mt-[var(--space-3)] grid list-none gap-[var(--space-2)] p-0 sm:grid-cols-2">
            {CONTENT_TYPES.filter((def) => def.available).map((def) => (
              <li key={def.key}>
                <a href={contentPath(def)}>{a(def.labelKey, locale)}</a>
              </li>
            ))}
          </ul>
          <div className="mt-[var(--space-3)]">
            <Button href="/admin/content" variant="secondary">
              {a("dashAllContent", locale)}
            </Button>
          </div>
        </section>
      ) : null}
      {canUseCaseInbox(staff.roles) ? (
        <section>
          <Heading level={2}>{a("casesLink", locale)}</Heading>
          <p className="mt-[var(--space-2)] text-ink-600">{a("casesDashIntro", locale)}</p>
          <div className="mt-[var(--space-3)]">
            <Button href="/admin/cases" variant="secondary">
              {a("casesTitle", locale)}
            </Button>
          </div>
        </section>
      ) : null}
      {hasRole(staff.roles, "admin") ? (
        <div>
          <Button href="/admin/staff" variant="secondary">
            {a("staffLink", locale)}
          </Button>
        </div>
      ) : null}
    </AdminPage>
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
