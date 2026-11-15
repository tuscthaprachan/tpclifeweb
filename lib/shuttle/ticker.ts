/**
 * Pure helpers for re-evaluating the scheduled shuttle status on the minute.
 * Nothing here reads a clock; callers pass the instant.
 */

const MINUTE_MS = 60_000;

/** Milliseconds from `now` until the next whole-minute boundary. A boundary instant waits a full minute, so a timer never fires twice in one minute. */
export function msUntilNextMinute(now: Date): number {
  return MINUTE_MS - (now.getTime() % MINUTE_MS);
}
