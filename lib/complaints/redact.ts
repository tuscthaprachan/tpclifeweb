/**
 * A pseudonymous complainant keeps their name back: ordinary handlers see how
 * to reach them but not the name; a unit lead or an administrator (who still
 * needs access to the case itself) sees it when it is needed. Applied to what
 * `readContacts` returns, after it has logged the view.
 */

import { eq } from "drizzle-orm";
import { hasAnyRole, type ActiveRole } from "@/lib/auth/roles";
import type { Contact } from "@/lib/cases/contacts";
import type { AuditExecutor } from "@/lib/db/audit";
import { complaintCases } from "@/lib/db/schema/complaints";

export function canSeeWithheldName(roles: readonly ActiveRole[]): boolean {
  return hasAnyRole(roles, ["unit_lead", "admin"]);
}

export async function redactContactsForHandler<T extends Pick<Contact, "name">>(db: AuditExecutor, caseId: string, roles: readonly ActiveRole[], contacts: T[]): Promise<T[]> {
  if (contacts.length === 0 || canSeeWithheldName(roles)) return contacts;
  const [cc] = await db.select({ identity: complaintCases.identity }).from(complaintCases).where(eq(complaintCases.caseId, caseId));
  return cc?.identity === "pseudonymous" ? contacts.map((c) => ({ ...c, name: null })) : contacts;
}
