/**
 * Who may work which service. Pure functions of the role list, so every
 * branch is testable without a database. The engine calls these on every
 * staff operation: this is the data-layer authorisation. TUSU and TUSC share
 * one queue per service, so access depends on the role, not the organisation;
 * the organisation only says who acted.
 *
 * Postgres row-level security is the planned second layer. It needs the
 * caller's roles in a session setting on every connection, which the Neon
 * pooled driver and PGlite do not both make simple, so it is a follow-up.
 */

import { hasAnyRole, type ActiveRole } from "@/lib/auth/roles";
import type { StaffRole } from "@/lib/db/schema/staff-roles";
import { CASE_SERVICES, SERVICES, type CaseService } from "./services";

/** Roles that may open the inbox at all. */
export const CASE_INBOX_ROLES: readonly StaffRole[] = [...new Set(CASE_SERVICES.flatMap((s) => SERVICES[s].roles))];

export function canUseCaseInbox(roles: readonly ActiveRole[]): boolean {
  return hasAnyRole(roles, CASE_INBOX_ROLES);
}

export function canAccessService(roles: readonly ActiveRole[], service: CaseService): boolean {
  return hasAnyRole(roles, SERVICES[service].roles);
}

export function accessibleServices(roles: readonly ActiveRole[]): CaseService[] {
  return CASE_SERVICES.filter((s) => canAccessService(roles, s));
}

/** Organisations on whose behalf the person holds a role for `service`. */
export function actingOrganisations(roles: readonly ActiveRole[], service: CaseService): number[] {
  const allowed = SERVICES[service].roles;
  return [...new Set(roles.filter((r) => allowed.includes(r.role)).map((r) => r.organisationId))];
}

/** The organisation an action is attributed to: `preferred` if the person may act for it, else their first. Null if none. */
export function resolveActingOrganisation(roles: readonly ActiveRole[], service: CaseService, preferred?: number | null): number | null {
  const orgs = actingOrganisations(roles, service);
  if (preferred != null && orgs.includes(preferred)) return preferred;
  return orgs[0] ?? null;
}
