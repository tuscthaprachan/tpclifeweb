import "server-only";

import { redirect } from "next/navigation";
import { EDITOR_ROLES } from "@/lib/admin/content/access";
import { requireStaff, type AccessContext } from "@/lib/auth/session";
import { canAccessService, CASE_INBOX_ROLES } from "@/lib/cases/access";
import { staffActorFor } from "@/lib/cases/staff";

export const CASES_HREF = "/admin/cases?service=lost_found";

/** Editors and anyone who can use the case inbox may reach these routes; the page decides where each goes. */
export function requireLostFoundRouteAccess(): Promise<AccessContext> {
  return requireStaff([...new Set([...EDITOR_ROLES, ...CASE_INBOX_ROLES])]);
}

/** True when the person can work lost and found cases: the role, and a body to act for. */
export async function canWorkLostFoundCases(staff: AccessContext): Promise<boolean> {
  if (!canAccessService(staff.roles, "lost_found")) return false;
  try {
    await staffActorFor(staff, "lost_found");
    return true;
  } catch {
    return false;
  }
}

export function redirectToCases(href: string = CASES_HREF): never {
  redirect(href);
}
