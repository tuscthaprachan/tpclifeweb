import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AdminPage } from "@/components/admin/AdminPage";
import { Button, Heading } from "@/components/ui";
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
    <AdminPage>
      <div>
        <Heading level={1}>{a("cancelInviteTitle", locale)}</Heading>
        <p className="mt-[var(--space-2)]">{a("cancelInviteBody", locale, { email: invite.email })}</p>
      </div>
      <form action={cancelInvite} className="flex flex-wrap items-center gap-[var(--space-4)]">
        <input type="hidden" name="inviteId" value={inviteId} />
        <Button type="submit" variant="destructive">
          {a("cancelInviteButton", locale)}
        </Button>
        <a href="/admin/staff">{a("keepIt", locale)}</a>
      </form>
    </AdminPage>
  );
}
