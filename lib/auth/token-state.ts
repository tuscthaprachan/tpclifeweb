/**
 * The lifecycle shared by staff invites, recovery links and tracking links:
 * `pending` until it is used (`accepted`), withdrawn (`revoked`) or runs out
 * (`expired`). The SQL fragment and the pure function are the same rule, kept
 * together and checked at the boundary instant by a parity test.
 */

import { and, gt, isNull, or, type AnyColumn, type SQL } from "drizzle-orm";

export type TokenState = "pending" | "accepted" | "revoked" | "expired";

export interface TokenRow {
  /** When the token was spent (an invite's `acceptedAt`, a recovery link's `usedAt`); null for links that are never spent. */
  consumedAt?: Date | null;
  revokedAt: Date | null;
  /** Null means the token never expires (tracking links). */
  expiresAt: Date | null;
}

/** Spent beats withdrawn beats expired; an expiry exactly at `now` has passed. */
export function tokenState(row: TokenRow, now: Date): TokenState {
  if (row.consumedAt) return "accepted";
  if (row.revokedAt) return "revoked";
  if (row.expiresAt && row.expiresAt <= now) return "expired";
  return "pending";
}

export interface TokenColumns {
  consumedAt?: AnyColumn;
  revokedAt: AnyColumn;
  expiresAt: AnyColumn;
}

/** SQL twin of `tokenState(row, now) === "pending"`. */
export function tokenPending(columns: TokenColumns, now: Date): SQL {
  const parts = [isNull(columns.revokedAt), or(isNull(columns.expiresAt), gt(columns.expiresAt, now))];
  if (columns.consumedAt) parts.unshift(isNull(columns.consumedAt));
  return and(...parts) as SQL;
}
