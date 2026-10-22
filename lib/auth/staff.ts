/**
 * Reading and changing who has which staff role. Like invites.ts, these take
 * the database as a parameter and the caller has already authorised the
 * actor; the organisation scoping here is a second line of defence.
 */

import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { withAudit, type AuditContext, type AuditExecutor } from "@/lib/db/audit";
import { user } from "@/lib/db/schema/auth";
import { organisations } from "@/lib/db/schema/organisations";
import { staffInvites, type StaffInvite } from "@/lib/db/schema/staff-invites";
import { staffRoles, type StaffRole } from "@/lib/db/schema/staff-roles";

export interface StaffMember {
  userId: string;
  name: string;
  email: string;
  grants: Array<{ id: number; role: StaffRole; organisationId: number; grantedAt: Date }>;
}

/** Everyone holding an active role in any of `organisationIds`. */
export async function listStaff(db: AuditExecutor, organisationIds: readonly number[]): Promise<StaffMember[]> {
  if (organisationIds.length === 0) return [];
  const rows = await db
    .select({
      userId: user.id,
      name: user.name,
      email: user.email,
      grantId: staffRoles.id,
      role: staffRoles.role,
      organisationId: staffRoles.organisationId,
      grantedAt: staffRoles.grantedAt,
    })
    .from(staffRoles)
    .innerJoin(user, eq(user.id, staffRoles.userId))
    .where(and(isNull(staffRoles.revokedAt), inArray(staffRoles.organisationId, [...organisationIds])))
    .orderBy(asc(user.email), asc(staffRoles.organisationId), asc(staffRoles.role));
  const byUser = new Map<string, StaffMember>();
  for (const r of rows) {
    const member = byUser.get(r.userId) ?? { userId: r.userId, name: r.name, email: r.email, grants: [] };
    member.grants.push({ id: r.grantId, role: r.role, organisationId: r.organisationId, grantedAt: r.grantedAt });
    byUser.set(r.userId, member);
  }
  return [...byUser.values()];
}

/** Invites that can still be accepted, newest first. */
export async function listPendingInvites(
  db: AuditExecutor,
  organisationIds: readonly number[],
  now: Date = new Date(),
): Promise<StaffInvite[]> {
  if (organisationIds.length === 0) return [];
  return db
    .select()
    .from(staffInvites)
    .where(
      and(
        inArray(staffInvites.organisationId, [...organisationIds]),
        isNull(staffInvites.acceptedAt),
        isNull(staffInvites.revokedAt),
        sql`${staffInvites.expiresAt} > ${now}`,
      ),
    )
    .orderBy(desc(staffInvites.createdAt));
}

export async function listOrganisations(db: AuditExecutor) {
  return db.select().from(organisations).orderBy(asc(organisations.id));
}

export type RevokeRoleResult = "revoked" | "not_found" | "last_admin";

/**
 * Revokes one active grant. Refuses to remove the last active admin anywhere,
 * so the console can never be locked out of its own staff page. Takes effect
 * on the person's very next request, because `requireStaff` reads roles fresh.
 */
export async function revokeRole(
  db: AuditExecutor,
  input: { roleId: number; allowedOrganisationIds: readonly number[]; context?: AuditContext; now?: Date },
): Promise<RevokeRoleResult> {
  const now = input.now ?? new Date();
  return withAudit(db, input.context ?? {}, async (tx, audit) => {
    const [grant] = await tx
      .select()
      .from(staffRoles)
      .where(
        and(
          eq(staffRoles.id, input.roleId),
          isNull(staffRoles.revokedAt),
          inArray(staffRoles.organisationId, [...input.allowedOrganisationIds]),
        ),
      )
      // Lock the row so two admins revoking at once cannot both pass the last-admin check.
      .for("update");
    if (!grant) return "not_found";

    if (grant.role === "admin") {
      const [admins] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(staffRoles)
        .where(and(eq(staffRoles.role, "admin"), isNull(staffRoles.revokedAt)));
      if ((admins?.count ?? 0) <= 1) return "last_admin";
    }

    await tx.update(staffRoles).set({ revokedAt: now }).where(eq(staffRoles.id, grant.id));
    await audit({
      action: "staff_role.revoke",
      entityType: "staff_role",
      entityId: grant.id,
      actorOrganisationId: grant.organisationId,
      before: { userId: grant.userId, role: grant.role, organisationId: grant.organisationId },
      after: { revokedAt: now },
    });
    return "revoked";
  });
}
