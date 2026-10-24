import type { AuditContext } from "@/lib/db/audit";
import type { ActiveRole } from "@/lib/auth/roles";
import type { LocaleString } from "@/lib/i18n/config";

/** Request details recorded on audit rows. */
export type RequestContext = Pick<AuditContext, "ip" | "userAgent" | "requestId">;

/** A signed-in member of staff. `roles` are re-checked against the service on every call. */
export interface StaffActor {
  kind: "staff";
  userId: string;
  /** The organisation this action is attributed to; must be one the person holds a role for in the service. */
  organisationId: number;
  roles: readonly ActiveRole[];
  context?: RequestContext;
}

/**
 * Who is calling the engine. `public` is a person on a public journey (no
 * account); `system` is a scheduled job. Operations that expose or change
 * staff-only data accept `staff` only.
 */
export type CaseActor = StaffActor | { kind: "public"; context?: RequestContext } | { kind: "system"; context?: RequestContext };

export type CaseErrorCode =
  | "forbidden"
  | "not_found"
  | "invalid"
  | "invalid_transition"
  | "stale"
  | "pii_deleted";

/** A refused operation. The `code` is stable; the message is for logs, not for people. */
export class CaseError extends Error {
  constructor(
    readonly code: CaseErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "CaseError";
  }
}

/** Public updates are written in both languages. */
export type BilingualText = LocaleString;
