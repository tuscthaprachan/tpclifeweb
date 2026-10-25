import { hasAnyRole, type ActiveRole, type StaffRole } from "@/lib/auth/roles";

/** Who may open /admin/performance: the people who answer for the services. */
export const PERFORMANCE_ROLES: readonly StaffRole[] = ["admin", "unit_lead"];

/** For showing or hiding links; the page itself uses `requireStaff(PERFORMANCE_ROLES)`. */
export function canSeePerformance(roles: readonly ActiveRole[]): boolean {
  return hasAnyRole(roles, PERFORMANCE_ROLES);
}
