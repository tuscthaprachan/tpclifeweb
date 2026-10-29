import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ConfirmPanel } from "@/components/admin/ConfirmPanel";
import { PeopleIcon } from "@/components/admin/PeopleIcon";
import { Button } from "@/components/ui";
import { adminTitle } from "@/lib/admin/metadata";
import { getAdminLocale } from "@/lib/admin/locale";
import { organisationsWithRole } from "@/lib/auth/roles";
import { requireStaff } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { staffInvites } from "@/lib/db/schema/staff-invites";
import { a } from "@/lib/i18n/admin";
import { cancelInvite } from "../../../actions";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return adminTitle("cancelInviteTitle");
}

export default async function CancelInvitePage({ params }: { params: Promise<{ id: string }> }) {
  const locale = await getAdminLocale();
  const staff = await requireStaff("admin");
  const { id } = await params;
  const inviteId = Number(id);
  if (!Number.isInteger(inviteId)) redirect("/admin/staff?notice=gone");

  const [invite] = await getDb()
    .select()
    .from(staffInvites)
    .where(and(eq(staffInvites.id, inviteId), isNull(staffInvites.acceptedAt), isNull(staffInvites.revokedAt)));
  if (!invite || !organisationsWithRole(staff.roles, "admin").includes(invite.organisationId)) redirect("/admin/staff?notice=gone");

  return (
    <ConfirmPanel locale={locale} title={a("cancelInviteTitle", locale)} icon="staff" warning={a("cancelInviteBody", locale, { email: invite.email })}>
      <form action={cancelInvite} className="flex flex-wrap items-center gap-[var(--space-3)]">
        <input type="hidden" name="inviteId" value={inviteId} />
        <Button type="submit" variant="destructive" icon={<PeopleIcon name="cancel" />}>
          {a("cancelInviteButton", locale)}
        </Button>
        <Button href="/admin/staff" variant="secondary">
          {a("keepIt", locale)}
        </Button>
      </form>
    </ConfirmPanel>
  );
}
