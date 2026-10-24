/**
 * Staff session lifetime. Two independent limits, both enforced on the server:
 *
 * - Idle: 30 minutes since the last request the person made.
 * - Absolute: 12 hours since the passkey sign-in, however active they are.
 *
 * The absolute limit is Better Auth's own `expiresAt`. The idle limit is
 * tracked in `session.updated_at`, which `lib/auth/session.ts` touches on each
 * request (Better Auth's built-in refresh is switched off, because it cannot
 * write cookies while a page renders and would never slide the window).
 */

export const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
export const ABSOLUTE_TIMEOUT_MS = 12 * 60 * 60 * 1000;
/** The GOV.UK pattern warns two minutes before the end. */
export const TIMEOUT_WARNING_MS = 2 * 60 * 1000;
/** Do not write on every request; once every half minute is plenty. */
export const ACTIVITY_TOUCH_MS = 30 * 1000;

export interface SessionTimes {
  updatedAt: Date;
  expiresAt: Date;
}

export interface SessionDeadlines {
  idleAt: Date;
  absoluteAt: Date;
  /** Whichever comes first. */
  endsAt: Date;
}

export function sessionDeadlines(session: SessionTimes): SessionDeadlines {
  const idleAt = new Date(session.updatedAt.getTime() + IDLE_TIMEOUT_MS);
  const absoluteAt = session.expiresAt;
  return { idleAt, absoluteAt, endsAt: idleAt < absoluteAt ? idleAt : absoluteAt };
}

export function isSessionLive(session: SessionTimes, now: Date): boolean {
  return now < sessionDeadlines(session).endsAt;
}
