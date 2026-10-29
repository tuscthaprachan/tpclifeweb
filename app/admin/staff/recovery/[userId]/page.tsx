import { and, eq, inArray, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ConfirmPanel } from "@/components/admin/ConfirmPanel";
import { adminTitle } from "@/lib/admin/metadata";
import { getAdminLocale } from "@/lib/admin/locale";
import { organisationsWithRole } from "@/lib/auth/roles";
import { requireStaff } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { user } from "@/lib/db/schema/auth";
import { staffRoles } from "@/lib/db/schema/staff-roles";
import { a } from "@/lib/i18n/admin";
import { RecoveryForm } from "./RecoveryForm";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return adminTitle("recoveryButton");
}

/** Confirm page before an admin makes a recovery link for someone in their organisations. */
export default async function RecoveryPage({ params }: { params: Promise<{ userId: string }> }) {
  const locale = await getAdminLocale();
  const staff = await requireStaff("admin");
  const { userId } = await params;

  const [person] = await getDb()
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .innerJoin(staffRoles, and(eq(staffRoles.userId, user.id), isNull(staffRoles.revokedAt)))
    .where(and(eq(user.id, userId), inArray(staffRoles.organisationId, organisationsWithRole(staff.roles, "admin"))))
    .limit(1);
  if (!person) redirect("/admin/staff?notice=gone");

  const name = person.name || person.email;
  return (
    <ConfirmPanel
      locale={locale}
      title={a("recoveryTitle", locale, { person: name })}
      icon="staff"
      description={a("recoveryIntro", locale, { person: name })}
      warning={a("recoveryWarning", locale)}
    >
      <RecoveryForm locale={locale} userId={person.id} />
    </ConfirmPanel>
  );
}
