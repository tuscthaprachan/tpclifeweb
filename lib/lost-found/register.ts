/**
 * How a lost or found case's status shows on its public listing. The listing's
 * `register_status` follows the case status through this table, so every path
 * that moves a case (the staff flows, the generic status form, the inbox bulk
 * move, a person withdrawing) leaves the listing in step.
 */

import { sql, type SQL, type SQLWrapper } from "drizzle-orm";
import type { LOST_FOUND_STATUSES } from "@/lib/db/schema/content/enums";
import { bangkokDateKey } from "@/lib/i18n/format";

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

/** What `resolved_at` becomes with a register status: stamped when the entry is finished (returned, withdrawn or unclaimed), cleared when it is live again (open or matched). */
export function resolvedAtFor(register: RegisterStatus, now: Date): Date | null {
  return register === "returned" || register === "withdrawn" || register === "unclaimed" ? now : null;
}

export interface ClaimWindow {
  kind: string;
  registerStatus: string;
  /** The last day to claim, as a calendar date, or null for no deadline. */
  claimBy: string | null;
}

/**
 * True when a found item's claim window has passed with nobody collecting it:
 * it is still `open` on the register and `claimBy` is before today in Bangkok.
 * A derived state, applied to the listing by the retention job
 * (`markUnclaimedListings`), whose SQL is `unclaimedSql`.
 */
export function isUnclaimed(item: ClaimWindow, now: Date): boolean {
  return item.kind === "found" && item.registerStatus === "open" && item.claimBy !== null && item.claimBy < bangkokDateKey(now);
}

/** The SQL form of `isUnclaimed`, against the listing's columns. */
export function unclaimedSql(now: Date, cols: { kind: SQLWrapper; registerStatus: SQLWrapper; claimBy: SQLWrapper }): SQL<boolean> {
  return sql<boolean>`(${cols.kind} = 'found' and ${cols.registerStatus} = 'open' and ${cols.claimBy} is not null and ${cols.claimBy} < ${bangkokDateKey(now)}::date)`;
}
