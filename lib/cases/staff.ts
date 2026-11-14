import "server-only";

import { eq } from "drizzle-orm";
import type { AuditExecutor } from "@/lib/db/audit";
import { cases } from "@/lib/db/schema/cases";
import { getRequestMeta, type AccessContext } from "@/lib/auth/session";
import { canAccessService, resolveActingOrganisation } from "./access";
import { CaseError, type StaffActor } from "./types";
import type { CaseService } from "./services";

/**
 * The engine actor for a signed-in member of staff working on `service`. The
 * organisation is `preferredOrganisationId` if they belong to it, otherwise
 * their first. Throws `forbidden` when they hold no role for the service or
 * belong to no organisation.
 */
export async function staffActorFor(staff: AccessContext, service: CaseService, preferredOrganisationId?: number | null): Promise<StaffActor> {
  const organisationIds = staff.organisations.map((o) => o.id);
  const organisationId = canAccessService(staff.roles, service) ? resolveActingOrganisation(organisationIds, preferredOrganisationId) : null;
  if (organisationId === null) throw new CaseError("forbidden", "You do not have access to this service.");
  const meta = await getRequestMeta();
  return { kind: "staff", userId: staff.user.id, organisationId, organisationIds, roles: staff.roles, context: { ip: meta.ip, userAgent: meta.userAgent } };
}

/** `staffActorFor` for an existing case, looking up its service. */
export async function staffActorForCase(db: AuditExecutor, staff: AccessContext, caseId: string, preferredOrganisationId?: number | null): Promise<StaffActor> {
  const [row] = await db.select({ service: cases.service }).from(cases).where(eq(cases.id, caseId));
  if (!row) throw new CaseError("not_found", "Case not found.");
  return staffActorFor(staff, row.service, preferredOrganisationId);
}
