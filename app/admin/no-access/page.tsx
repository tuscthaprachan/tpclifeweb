import { AdminPage } from "@/components/admin/AdminPage";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { Button, Heading } from "@/components/ui";
import { adminTitle } from "@/lib/admin/metadata";
import { getAdminLocale } from "@/lib/admin/locale";
import { isAuthConfigured } from "@/lib/auth";
import { isStaff } from "@/lib/auth/roles";
import { requireSignedIn } from "@/lib/auth/session";
import { a } from "@/lib/i18n/admin";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return adminTitle("noAccessTitle");
}

/**
 * The GOV.UK "You do not have access" page. Students land here after signing
 * in (they have an account but no staff role), and so does a member of staff
 * who opens a page their role does not include.
 */
export default async function NoAccessPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  const ctx = await requireSignedIn();
  const { reason } = await searchParams;
  const staff = isStaff(ctx.roles);

  return (
    <AdminPage>
      <Heading level={1}>{a("noAccessTitle", locale)}</Heading>
      {staff && reason === "role" ? (
        <>
          <p className="m-0">{a("noAccessRoleBody", locale)}</p>
          <div>
            <Button href="/admin">{a("backToConsole", locale)}</Button>
          </div>
        </>
      ) : (
        <>
          <p className="m-0">{a("noAccessBody", locale, { email: ctx.user.email })}</p>
          <p className="m-0 text-ink-600">{a("noAccessHelp", locale)}</p>
        </>
      )}
    </AdminPage>
  );
}
