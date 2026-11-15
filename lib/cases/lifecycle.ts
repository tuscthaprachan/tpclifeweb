/**
 * Where a case is in its life, derived from its two timestamps: `open` until a
 * terminal status closes it, `closed` while personal data is still held, and
 * `purged` once retention has deleted it.
 */

export type CaseLifecycle = "open" | "closed" | "purged";

/** The lifecycle of a case row. A deleted-personal-data case is `purged` whatever else it holds. */
export function caseLifecycle(row: { closedAt: Date | null; piiDeletedAt: Date | null }): CaseLifecycle {
  if (row.piiDeletedAt) return "purged";
  return row.closedAt ? "closed" : "open";
}
