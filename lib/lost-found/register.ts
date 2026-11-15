/**
 * How a lost or found case's status shows on its public listing. The listing's
 * `register_status` follows the case status through this table, so every path
 * that moves a case (the staff flows, the generic status form, the inbox bulk
 * move, a person withdrawing) leaves the listing in step.
 */

import type { LOST_FOUND_STATUSES } from "@/lib/db/schema/content/enums";

export type RegisterStatus = (typeof LOST_FOUND_STATUSES)[number];

/**
 * Case status to register status, per kind. A closed report with nothing found
 * leaves the register as `withdrawn`, since `unclaimed` is for an item nobody
 * collected. Drafts are never published by a status move: that stays with
 * `publishFoundItem`.
 */
const REGISTER_BY_STATUS: Record<"lost" | "found", Record<string, RegisterStatus>> = {
  lost: {
    submitted: "open",
    searching: "open",
    match_found: "matched",
    ready_to_collect: "matched",
    returned: "returned",
    closed_unfound: "withdrawn",
    withdrawn: "withdrawn",
  },
  found: {
    logged: "open",
    listed: "open",
    claim_pending: "matched",
    ready_to_collect: "matched",
    returned: "returned",
    withdrawn: "withdrawn",
  },
};

/** The register status a case in `status` should show, or null for a kind or status the table does not know. */
export function listingRegisterFor(kind: string, status: string): RegisterStatus | null {
  if (kind !== "lost" && kind !== "found") return null;
  return REGISTER_BY_STATUS[kind][status] ?? null;
}

/** What `resolved_at` becomes with a register status: stamped when the entry is finished, cleared when it reopens, else left alone (undefined). */
export function resolvedAtFor(register: RegisterStatus, now: Date): Date | null | undefined {
  if (register === "returned" || register === "withdrawn") return now;
  if (register === "open") return null;
  return undefined;
}
