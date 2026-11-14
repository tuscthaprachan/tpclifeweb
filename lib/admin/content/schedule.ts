/**
 * The publication window, as staff see it. Pure, so forms (client) and lists
 * (server) share it. The public read layer applies the same rule in SQL
 * (`lib/content/window.ts`).
 */

export type ScheduleState = "draft" | "scheduled" | "live" | "expired";

export interface ScheduleRow {
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
 * `draft` when not published; `scheduled` when published but `publishAt` is
 * still ahead; `expired` once `unpublishAt` has passed; otherwise `live`.
 */
export function scheduleState(row: ScheduleRow, now: Date = new Date()): ScheduleState {
  if (row.status !== "published") return "draft";
  const at = now.getTime();
  const start = time(row.publishAt);
  const end = time(row.unpublishAt);
  if (end !== null && end <= at) return "expired";
  if (start !== null && start > at) return "scheduled";
  return "live";
}

/** True when the row is publicly visible at `now`. */
export function isLive(row: ScheduleRow, now: Date = new Date()): boolean {
  return scheduleState(row, now) === "live";
}

export type ScheduleProblem = "unpublishBeforePublish" | "unpublishInPast";

/** Null when the pair is acceptable. A past `publishAt` is fine (it means "now"). */
export function checkSchedule(publishAt: Date | null, unpublishAt: Date | null, now: Date = new Date()): ScheduleProblem | null {
  if (unpublishAt && unpublishAt.getTime() <= now.getTime()) return "unpublishInPast";
  if (publishAt && unpublishAt && unpublishAt.getTime() <= publishAt.getTime()) return "unpublishBeforePublish";
  return null;
}
