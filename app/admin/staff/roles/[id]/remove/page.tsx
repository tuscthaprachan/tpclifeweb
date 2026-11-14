import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { staffRoles } from "@/lib/db/schema/staff-roles";

export const dynamic = "force-dynamic";

/** Roles are managed from the member page now; old links to this route land there. */
export default async function RemoveRolePage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("admin");
  const roleId = Number((await params).id);
  if (!Number.isInteger(roleId)) redirect("/admin/staff?notice=gone");
  const [grant] = await getDb().select({ userId: staffRoles.userId }).from(staffRoles).where(eq(staffRoles.id, roleId));
  redirect(grant ? `/admin/staff/${encodeURIComponent(grant.userId)}` : "/admin/staff?notice=gone");
}
