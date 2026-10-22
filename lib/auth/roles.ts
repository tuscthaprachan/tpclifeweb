/**
 * Staff role helpers. The `has*` functions are pure and take the list returned
 * by `getStaffRoles`; check them in the data layer, never trust the client.
 * `getStaffRoles` is the only function here that touches the database.
 */

import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import type { AuditExecutor } from "@/lib/db/audit";
import { staffRoles, STAFF_ROLES, type StaffRole } from "@/lib/db/schema/staff-roles";

export { STAFF_ROLES };
export type { StaffRole };

/** One active grant: a role held on behalf of an organisation. */
export interface ActiveRole {
  role: StaffRole;
  organisationId: number;
}

/** True when `roles` holds `role`, optionally on behalf of a specific organisation. */
export function hasRole(roles: readonly ActiveRole[], role: StaffRole, organisationId?: number): boolean {
  return roles.some((r) => r.role === role && (organisationId === undefined || r.organisationId === organisationId));
}

/** True when `roles` holds at least one of `allowed`. */
export function hasAnyRole(roles: readonly ActiveRole[], allowed: readonly StaffRole[], organisationId?: number): boolean {
  return allowed.some((role) => hasRole(roles, role, organisationId));
}

/** The organisations on whose behalf `role` is held (deduplicated). */
export function organisationsWithRole(roles: readonly ActiveRole[], role: StaffRole): number[] {
  return [...new Set(roles.filter((r) => r.role === role).map((r) => r.organisationId))];
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
    .select({ role: staffRoles.role, organisationId: staffRoles.organisationId })
    .from(staffRoles)
    .where(and(eq(staffRoles.userId, userId), isNull(staffRoles.revokedAt)));
}
