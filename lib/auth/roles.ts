/**
 * Staff role helpers. The `has*` functions are pure and take the list returned
 * by `getStaffRoles`; check them in the data layer, never trust the client.
 * `getStaffRoles` is the only function here that touches the database.
 */

import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import type { AuditExecutor } from "@/lib/db/audit";
import { staffMemberships } from "@/lib/db/schema/staff-memberships";
import { staffRoles, STAFF_ROLES, type StaffRole } from "@/lib/db/schema/staff-roles";

export { STAFF_ROLES };
export type { StaffRole };

/** One active grant. Roles belong to the person; which body they act for is `staff_memberships`. */
export interface ActiveRole {
  role: StaffRole;
}

/** True when `roles` holds `role`. */
export function hasRole(roles: readonly ActiveRole[], role: StaffRole): boolean {
  return roles.some((r) => r.role === role);
}

/** True when `roles` holds at least one of `allowed`. */
export function hasAnyRole(roles: readonly ActiveRole[], allowed: readonly StaffRole[]): boolean {
  return allowed.some((role) => hasRole(roles, role));
}

/** Whether the user holds any staff role at all. */
export function isStaff(roles: readonly ActiveRole[]): boolean {
  return roles.length > 0;
}

/** Active (not revoked) grants for a user. */
export async function getStaffRoles(
  userId: string,
  db: AuditExecutor = getDb(),
): Promise<ActiveRole[]> {
  return db
    .select({ role: staffRoles.role })
    .from(staffRoles)
    .where(and(eq(staffRoles.userId, userId), isNull(staffRoles.revokedAt)));
}

/** The organisations a person belongs to, lowest id first. */
export async function getStaffOrganisationIds(userId: string, db: AuditExecutor = getDb()): Promise<number[]> {
  const rows = await db
    .select({ organisationId: staffMemberships.organisationId })
    .from(staffMemberships)
    .where(eq(staffMemberships.userId, userId))
    .orderBy(asc(staffMemberships.organisationId));
  return rows.map((r) => r.organisationId);
}
