/**
 * The publication window, as staff see it. Pure, so forms (client) and lists
 * (server) share it. The public read layer applies the same rule in SQL
 * (`lib/content/window.ts`).
 */

import { liveState, type LiveRow, type LiveState } from "@/lib/content/live-state";

export type ScheduleState = LiveState;
export type ScheduleRow = LiveRow;

/** A row's place in its publication window (see `liveState`). */
export const scheduleState = liveState;

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
