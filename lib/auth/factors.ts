/**
 * Facts about a person's second factor, read from the database. Pure SQL, no
 * Better Auth, so both the access checks and the Better Auth hooks can use it.
 */

import { and, eq, gt, sql } from "drizzle-orm";
import type { AuditExecutor } from "@/lib/db/audit";
import { auditLog } from "@/lib/db/schema/audit-log";
import { passkey, twoFactor } from "@/lib/db/schema/auth";

/** A verified authenticator app, or at least one registered passkey. */
export async function hasVerifiedSecondFactor(db: AuditExecutor, userId: string): Promise<boolean> {
  const [totp] = await db
    .select({ id: twoFactor.id })
    .from(twoFactor)
    .where(and(eq(twoFactor.userId, userId), eq(twoFactor.verified, true)))
    .limit(1);
  if (totp) return true;
  const [key] = await db.select({ id: passkey.id }).from(passkey).where(eq(passkey.userId, userId)).limit(1);
  return Boolean(key);
}

export const SECOND_FACTOR_FAILURE_LIMIT = 5;
export const SECOND_FACTOR_LOCKOUT_MS = 15 * 60 * 1000;

/**
 * Wrong second-factor attempts in the lockout window, from the audit log.
 * Better Auth only counts failures during its own 2FA sign-in challenge; our
 * flow verifies against an existing session, so this is the brute-force guard
 * for authenticator codes and backup codes.
 */
export async function recentSecondFactorFailures(
  db: AuditExecutor,
  userId: string,
  now: Date = new Date(),
): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(auditLog)
    .where(
      and(
        eq(auditLog.actorUserId, userId),
        eq(auditLog.action, "auth.second_factor.failed"),
        gt(auditLog.occurredAt, new Date(now.getTime() - SECOND_FACTOR_LOCKOUT_MS)),
      ),
    );
  return row?.count ?? 0;
}

/** Which kinds of second factor a person has, to decide what the challenge page offers. */
export async function getSecondFactorKinds(db: AuditExecutor, userId: string): Promise<{ totp: boolean; passkey: boolean }> {
  const [totp] = await db
    .select({ id: twoFactor.id })
    .from(twoFactor)
    .where(and(eq(twoFactor.userId, userId), eq(twoFactor.verified, true)))
    .limit(1);
  const [key] = await db.select({ id: passkey.id }).from(passkey).where(eq(passkey.userId, userId)).limit(1);
  return { totp: Boolean(totp), passkey: Boolean(key) };
}
