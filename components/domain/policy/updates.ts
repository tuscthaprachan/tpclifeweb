/**
 * Small helpers over `Policy.updates`. The CMS does not guarantee storage
 * order, so anything that needs "the latest" or "newest first" sorts
 * defensively rather than trusting array order.
 */

import type { PolicyUpdate } from "@/lib/content/types";

function updateTime(update: PolicyUpdate): number {
  const time = new Date(update.date).getTime();
  return Number.isNaN(time) ? 0 : time;
}

/** All updates, newest first. Used by `PolicyUpdateList` so the history always reads in reverse chronological order. */
export function sortUpdatesDesc(updates: PolicyUpdate[] | undefined): PolicyUpdate[] {
  if (!updates || updates.length === 0) return [];
  return [...updates].sort((a, b) => updateTime(b) - updateTime(a));
}

/**
 * The most recent entry in a policy's update history, or null when there is
 * none. This is the only "progress" a policy has when no editor has set a
 * `progressPercent` by hand: see `PolicyProgress`.
 */
export function getLatestUpdate(updates: PolicyUpdate[] | undefined): PolicyUpdate | null {
  return sortUpdatesDesc(updates)[0] ?? null;
}
