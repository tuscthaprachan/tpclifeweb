/**
 * The reopen window of a resolved complaint, as a pure rule. The case machine
 * (lib/cases/services.ts) uses it as the guard on `resolved -> reopened`, and
 * the daily job closes a resolution only strictly after the same instant, so
 * the two never overlap.
 */

import { REOPEN_WINDOW_DAYS } from "./constants";

const DAY_MS = 24 * 60 * 60 * 1000;

/** The last instant the person may reopen. */
export function reopenWindowEnds(resolvedAt: Date): Date {
  return new Date(resolvedAt.getTime() + REOPEN_WINDOW_DAYS * DAY_MS);
}

/** True up to and including the end of the window; false when there is no resolution date. */
export function withinReopenWindow(resolvedAt: Date | null, now: Date): boolean {
  return resolvedAt !== null && now.getTime() <= reopenWindowEnds(resolvedAt).getTime();
}

/** True while a resolved complaint may still be reopened: it is `resolved` and the window is open. */
export function canReopenNow(resolvedAt: Date | null, status: string, now: Date): boolean {
  return status === "resolved" && withinReopenWindow(resolvedAt, now);
}
