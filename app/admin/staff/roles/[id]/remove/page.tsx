import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AdminPage } from "@/components/admin/AdminPage";
import { Button, ErrorSummary, Heading } from "@/components/ui";
import { adminTitle } from "@/lib/admin/metadata";
import { getAdminLocale } from "@/lib/admin/locale";
import { organisationsWithRole } from "@/lib/auth/roles";
import { requireStaff } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { user } from "@/lib/db/schema/auth";
import { organisations } from "@/lib/db/schema/organisations";
import { staffRoles } from "@/lib/db/schema/staff-roles";
import { a, ROLE_LABEL } from "@/lib/i18n/admin";
import { pick } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { removeRole } from "../../../actions";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return adminTitle("removeRoleTitle");
}

export default async function RemoveRolePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const locale = await getAdminLocale();
  const staff = await requireStaff("admin");
  const { id } = await params;
  const roleId = Number(id);
  if (!Number.isInteger(roleId)) redirect("/admin/staff?notice=gone");

  const [row] = await getDb()
    .select({ role: staffRoles.role, organisationId: staffRoles.organisationId, name: user.name, email: user.email, nameTh: organisations.nameTh, nameEn: organisations.nameEn })
    .from(staffRoles)
    .innerJoin(user, eq(user.id, staffRoles.userId))
    .innerJoin(organisations, eq(organisations.id, staffRoles.organisationId))
    .where(and(eq(staffRoles.id, roleId), isNull(staffRoles.revokedAt)));
  if (!row || !organisationsWithRole(staff.roles, "admin").includes(row.organisationId)) redirect("/admin/staff?notice=gone");

  const { error } = await searchParams;
  return (
    <AdminPage>
      {error === "last-admin" ? (
        <ErrorSummary title={UI.errorSummaryTitle[locale]} headingLevel={2} items={[{ href: "#remove-role", message: a("errLastAdmin", locale) }]} />
      ) : null}
      <div>
        <Heading level={1}>{a("removeRoleTitle", locale)}</Heading>
        <p className="mt-[var(--space-2)]">
          {a("removeRoleBody", locale, {
            person: row.name || row.email,
            role: a(ROLE_LABEL[row.role], locale),
            organisation: pick({ th: row.nameTh, en: row.nameEn }, locale),
          })}
        </p>
      </div>
      <form action={removeRole} className="flex flex-wrap items-center gap-[var(--space-4)]">
        <input type="hidden" name="roleId" value={roleId} />
        <Button id="remove-role" type="submit" variant="destructive">
          {a("removeRoleButton", locale)}
        </Button>
        <a href="/admin/staff">{a("keepIt", locale)}</a>
      </form>
    </AdminPage>
  );
}
