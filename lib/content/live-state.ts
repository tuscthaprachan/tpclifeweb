/**
 * Where a piece of scheduled content is in its publication window. Pure, so
 * forms (client), lists (server) and tests share it; `lib/content/window.ts`
 * holds the SQL twin and a parity test checks both at the boundary instants.
 */

export type LiveState = "draft" | "scheduled" | "live" | "expired";

export interface LiveRow {
  status: string | null;
  publishAt?: Date | string | null;
  unpublishAt?: Date | string | null;
}

const time = (value: Date | string | null | undefined): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
};

/**
 * `draft` when not published; `expired` once `unpublishAt` has been reached
 * (the end is exclusive); `scheduled` while `publishAt` is still ahead (the
 * start is inclusive); otherwise `live`.
 */
export function liveState(row: LiveRow, now: Date = new Date()): LiveState {
  if (row.status !== "published") return "draft";
  const at = now.getTime();
  const start = time(row.publishAt);
  const end = time(row.unpublishAt);
  if (end !== null && end <= at) return "expired";
  if (start !== null && start > at) return "scheduled";
  return "live";
}
