/**
 * The authorisation decision, as a pure function of facts the caller has
 * already read. `requireStaff` (lib/auth/session.ts) gathers the facts and
 * turns the answer into a redirect; keeping the decision separate is what
 * makes every branch testable without a database or a request.
 *
 * Order matters and is deliberate: a student who signs in (no staff roles)
 * is told they have no access straight away and is never asked to set up a
 * second factor, which would be pointless.
 */

import { hasRole, isStaff, type ActiveRole, type StaffRole } from "@/lib/auth/roles";
import { isSessionLive, type SessionTimes } from "@/lib/auth/session-policy";

export interface AccessSession extends SessionTimes {
  /** Null until the second factor has been passed in this session. */
  secondFactorAt: Date | null;
}

export type AccessState =
  | { kind: "unauthenticated" }
  | { kind: "timed_out" }
  | { kind: "not_staff" }
  | { kind: "second_factor_setup" }
  | { kind: "second_factor_challenge" }
  | { kind: "forbidden" }
  | { kind: "ok" };

export interface AccessInput {
  session: AccessSession | null;
  now: Date;
  roles: readonly ActiveRole[];
  /** A verified authenticator app or at least one passkey is enrolled. */
  hasSecondFactor: boolean;
  required?: { role?: StaffRole; organisationId?: number };
}

export function decideAccess({ session, now, roles, hasSecondFactor, required }: AccessInput): AccessState {
  if (!session) return { kind: "unauthenticated" };
  if (!isSessionLive(session, now)) return { kind: "timed_out" };
  if (!isStaff(roles)) return { kind: "not_staff" };
  if (!session.secondFactorAt) {
    return { kind: hasSecondFactor ? "second_factor_challenge" : "second_factor_setup" };
  }
  if (required?.role && !hasRole(roles, required.role, required.organisationId)) return { kind: "forbidden" };
  if (!required?.role && required?.organisationId !== undefined) {
    if (!roles.some((r) => r.organisationId === required.organisationId)) return { kind: "forbidden" };
  }
  return { kind: "ok" };
}
