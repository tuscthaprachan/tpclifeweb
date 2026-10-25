/**
 * Account recovery for staff who have lost every passkey. An admin issues a
 * single-use link for a member of staff in one of their organisations; the
 * person opens it and registers a new passkey on their existing account.
 *
 * Same shape as invites: only the token's SHA-256 is stored, the raw token
 * exists once in the link, issuing and using are audited in the same
 * transaction as the write, and the claim is a conditional UPDATE so two
 * simultaneous uses cannot both succeed. Using a link also ends every
 * session the person has, because whoever held those sessions may be the
 * reason recovery was needed.
 *
 * Lockout: an admin may not issue a link for themselves unless another admin
 * exists (a recovery they could not complete would help nobody, and a sole
 * admin who has lost their passkey needs the break-glass command instead,
 * `npm run auth:bootstrap -- --recover <email>`, see lib/auth/bootstrap.ts).
 */

import { and, eq, gt, inArray, isNull, ne, sql } from "drizzle-orm";
import { withAudit, type AuditContext, type AuditExecutor } from "@/lib/db/audit";
import { session as sessionTable, user, type User } from "@/lib/db/schema/auth";
import { staffRecoveryLinks, type StaffRecoveryLink } from "@/lib/db/schema/staff-recovery";
import { staffRoles } from "@/lib/db/schema/staff-roles";
import { generateToken, hashToken } from "./tokens";

export const RECOVERY_TTL_HOURS = 24;
const HOUR_MS = 60 * 60 * 1000;

export type RecoveryErrorCode =
  | "unknown_user"
  | "not_staff"
  | "out_of_scope"
  | "last_admin"
  | "not_admin"
  | "not_found"
  | "expired"
  | "revoked"
  | "already_used";

export class RecoveryError extends Error {
  constructor(readonly code: RecoveryErrorCode) {
    super(code);
    this.name = "RecoveryError";
  }
}

export type RecoveryStatus = "pending" | "used" | "revoked" | "expired";

export function recoveryStatus(link: Pick<StaffRecoveryLink, "usedAt" | "revokedAt" | "expiresAt">, now: Date): RecoveryStatus {
  if (link.usedAt) return "used";
  if (link.revokedAt) return "revoked";
  if (link.expiresAt <= now) return "expired";
  return "pending";
}

/** True when someone other than `userId` holds an active admin role. */
export async function hasOtherActiveAdmin(db: AuditExecutor, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: staffRoles.id })
    .from(staffRoles)
    .where(and(eq(staffRoles.role, "admin"), isNull(staffRoles.revokedAt), ne(staffRoles.userId, userId)))
    .limit(1);
  return Boolean(row);
}

export interface IssueRecoveryInput {
  userId: string;
  /** The admin issuing it; null for the command line path. */
  issuedBy: string | null;
  /** When given, the person must hold an active role in one of these organisations. */
  allowedOrganisationIds?: readonly number[];
  /** Command line path: the person must be an admin. */
  requireAdmin?: boolean;
  context?: AuditContext;
  now?: Date;
}

/**
 * Issues a recovery link and returns the raw token (never stored). Any earlier
 * pending link for the same person is revoked, so issuing again is also how an
 * admin replaces a lost link.
 */
export async function issueRecoveryLink(
  db: AuditExecutor,
  input: IssueRecoveryInput,
): Promise<{ link: StaffRecoveryLink; token: string; person: Pick<User, "id" | "name" | "email"> }> {
  const now = input.now ?? new Date();
  const token = generateToken();

  return withAudit(db, { ...input.context, actorUserId: input.issuedBy ?? input.context?.actorUserId ?? null }, async (tx, audit) => {
    const [person] = await tx.select({ id: user.id, name: user.name, email: user.email }).from(user).where(eq(user.id, input.userId));
    if (!person) throw new RecoveryError("unknown_user");

    const roles = await tx
      .select({ role: staffRoles.role, organisationId: staffRoles.organisationId })
      .from(staffRoles)
      .where(and(eq(staffRoles.userId, person.id), isNull(staffRoles.revokedAt)));
    if (roles.length === 0) throw new RecoveryError("not_staff");
    if (input.requireAdmin && !roles.some((r) => r.role === "admin")) throw new RecoveryError("not_admin");
    if (input.allowedOrganisationIds && !roles.some((r) => input.allowedOrganisationIds!.includes(r.organisationId))) {
      throw new RecoveryError("out_of_scope");
    }
    if (input.issuedBy === person.id && !(await hasOtherActiveAdmin(tx, person.id))) throw new RecoveryError("last_admin");

    const superseded = await tx
      .update(staffRecoveryLinks)
      .set({ revokedAt: now })
      .where(and(eq(staffRecoveryLinks.userId, person.id), isNull(staffRecoveryLinks.usedAt), isNull(staffRecoveryLinks.revokedAt)))
      .returning({ id: staffRecoveryLinks.id });
    for (const row of superseded) {
      await audit({ action: "staff_recovery.supersede", entityType: "staff_recovery", entityId: row.id });
    }

    const [link] = await tx
      .insert(staffRecoveryLinks)
      .values({
        userId: person.id,
        tokenHash: hashToken(token),
        issuedBy: input.issuedBy,
        expiresAt: new Date(now.getTime() + RECOVERY_TTL_HOURS * HOUR_MS),
      })
      .returning();
    if (!link) throw new Error("Recovery link insert returned no row.");
    await audit({
      action: "staff_recovery.issue",
      entityType: "staff_recovery",
      entityId: link.id,
      // The token hash is deliberately left out of the log.
      after: { userId: person.id, email: person.email, expiresAt: link.expiresAt, viaCommandLine: input.issuedBy === null },
    });
    return { link, token, person };
  });
}

/** Looks a link up by the raw token. Null when no such link exists. */
export async function findRecoveryByToken(
  db: AuditExecutor,
  token: string,
): Promise<{ link: StaffRecoveryLink; person: Pick<User, "id" | "name" | "email"> } | null> {
  if (!token || token.length > 200) return null;
  const [row] = await db
    .select({ link: staffRecoveryLinks, person: { id: user.id, name: user.name, email: user.email } })
    .from(staffRecoveryLinks)
    .innerJoin(user, eq(user.id, staffRecoveryLinks.userId))
    .where(eq(staffRecoveryLinks.tokenHash, hashToken(token)));
  return row ?? null;
}

/**
 * Uses a link: claims it, signs the person out everywhere and audits both.
 * Called once the new passkey has been verified (lib/auth/create.ts), so a
 * link is only spent by a ceremony that succeeded.
 */
export async function claimRecoveryLink(
  db: AuditExecutor,
  input: { token: string; context?: AuditContext; now?: Date },
): Promise<{ userId: string; endedSessions: number }> {
  const now = input.now ?? new Date();
  const found = await findRecoveryByToken(db, input.token);
  if (!found) throw new RecoveryError("not_found");
  const status = recoveryStatus(found.link, now);
  if (status === "used") throw new RecoveryError("already_used");
  if (status === "revoked") throw new RecoveryError("revoked");
  if (status === "expired") throw new RecoveryError("expired");

  return withAudit(db, { ...input.context, actorUserId: found.person.id }, async (tx, audit) => {
    const claimed = await tx
      .update(staffRecoveryLinks)
      .set({ usedAt: now })
      .where(
        and(
          eq(staffRecoveryLinks.id, found.link.id),
          isNull(staffRecoveryLinks.usedAt),
          isNull(staffRecoveryLinks.revokedAt),
          gt(staffRecoveryLinks.expiresAt, now),
        ),
      )
      .returning({ id: staffRecoveryLinks.id });
    if (claimed.length === 0) throw new RecoveryError("already_used");

    const ended = await tx.delete(sessionTable).where(eq(sessionTable.userId, found.person.id)).returning({ id: sessionTable.id });
    await audit({
      action: "staff_recovery.use",
      entityType: "staff_recovery",
      entityId: found.link.id,
      after: { userId: found.person.id, endedSessions: ended.length },
    });
    return { userId: found.person.id, endedSessions: ended.length };
  });
}

/** Pending recovery links for people in these organisations' staff, for the staff page. */
export async function listPendingRecoveryUserIds(db: AuditExecutor, userIds: readonly string[], now: Date = new Date()): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();
  const rows = await db
    .select({ userId: staffRecoveryLinks.userId })
    .from(staffRecoveryLinks)
    .where(
      and(
        inArray(staffRecoveryLinks.userId, [...userIds]),
        isNull(staffRecoveryLinks.usedAt),
        isNull(staffRecoveryLinks.revokedAt),
        sql`${staffRecoveryLinks.expiresAt} > ${now}`,
      ),
    );
  return new Set(rows.map((r) => r.userId));
}
