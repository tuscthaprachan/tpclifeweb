import "server-only";

import { hasAnyRole, type ActiveRole, type StaffRole } from "@/lib/auth/roles";
import { auditContextFor, requireStaff, type AccessContext } from "@/lib/auth/session";
import type { AuditContext } from "@/lib/db/audit";

/** Roles that may edit website content, in any organisation. */
export const EDITOR_ROLES: readonly StaffRole[] = ["editor", "admin"];

/** True when `roles` may edit content. For showing or hiding navigation; `requireEditor` is the control. */
export function canEditContent(roles: readonly ActiveRole[]): boolean {
  return hasAnyRole(roles, EDITOR_ROLES);
}

/**
 * Gate for every content page and Server Action: `requireStaff` for an
 * `editor` or `admin` in any organisation.
 */
export function requireEditor(): Promise<AccessContext> {
  return requireStaff(EDITOR_ROLES);
}

/** Who is writing, for `saveContent` and friends. */
export interface ContentActor {
  userId: string;
  context: AuditContext;
}

export async function contentActor(staff: AccessContext): Promise<ContentActor> {
  return { userId: staff.user.id, context: await auditContextFor(staff) };
}
