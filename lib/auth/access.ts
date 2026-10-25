/**
 * The authorisation decision, as a pure function of facts the caller has
 * already read. `requireStaff` (lib/auth/session.ts) gathers the facts and
 * turns the answer into a redirect; keeping the decision separate is what
 * makes every branch testable without a database or a request.
 *
 * Order matters and is deliberate: a signed-in person with no staff roles is
 * told they have no access straight away.
 *
 * A passkey sign-in is itself the strong factor (phishing resistant, and the
 * authenticator checks the person with a fingerprint, face or PIN), so there is
 * no second step: every passkey sign-in sets `secondFactorAt` on its session.
 * A session without it (one left over from the retired email code sign-in)
 * sends the person to the sign-in page.
 */

import { hasAnyRole, isStaff, type ActiveRole, type StaffRole } from "@/lib/auth/roles";
import { isSessionLive, type SessionTimes } from "@/lib/auth/session-policy";

export interface AccessSession extends SessionTimes {
  /** Set when the session was created by a passkey. Null for any other kind. */
  secondFactorAt: Date | null;
}

export type AccessState =
  | { kind: "unauthenticated" }
  | { kind: "timed_out" }
  | { kind: "not_staff" }
  | { kind: "passkey_required" }
  | { kind: "forbidden" }
  | { kind: "ok" };

export interface AccessInput {
  session: AccessSession | null;
  now: Date;
  roles: readonly ActiveRole[];
  /** `role` may be one role or a list of which any one will do. */
  required?: { role?: StaffRole | readonly StaffRole[]; organisationId?: number };
}

export function decideAccess({ session, now, roles, required }: AccessInput): AccessState {
  if (!session) return { kind: "unauthenticated" };
  if (!isSessionLive(session, now)) return { kind: "timed_out" };
  if (!isStaff(roles)) return { kind: "not_staff" };
  if (!session.secondFactorAt) return { kind: "passkey_required" };
  const wanted = required?.role === undefined ? [] : typeof required.role === "string" ? [required.role] : required.role;
  if (wanted.length > 0 && !hasAnyRole(roles, wanted, required?.organisationId)) return { kind: "forbidden" };
  if (wanted.length === 0 && required?.organisationId !== undefined) {
    if (!roles.some((r) => r.organisationId === required.organisationId)) return { kind: "forbidden" };
  }
  return { kind: "ok" };
}
