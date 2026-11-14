/**
 * The signed-in person's own sessions and display name. Every function takes
 * the user id from the session, never from a form, and acts only on rows with
 * that user id, so one person cannot end or read another's sessions. Each
 * change and its audit entry commit together.
 */

import { and, asc, desc, eq, gt, ne } from "drizzle-orm";
import { withAudit, type AuditContext, type AuditExecutor } from "@/lib/db/audit";
import { session, user } from "@/lib/db/schema/auth";
import { parseUserAgent } from "./user-agent";

export interface SessionRow {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: Date;
  expiresAt: Date;
  current: boolean;
}

/** Live sessions, the current one first, then newest. */
export async function listSessions(db: AuditExecutor, userId: string, currentSessionId: string, now = new Date()): Promise<SessionRow[]> {
  const rows = await db
    .select({ id: session.id, userAgent: session.userAgent, ipAddress: session.ipAddress, createdAt: session.createdAt, expiresAt: session.expiresAt })
    .from(session)
    .where(and(eq(session.userId, userId), gt(session.expiresAt, now)))
    .orderBy(desc(session.createdAt), asc(session.id));
  const all = rows.map((r) => ({ ...r, current: r.id === currentSessionId }));
  return [...all.filter((r) => r.current), ...all.filter((r) => !r.current)];
}

function describeDevice(userAgent: string | null): string {
  const { browser, os } = parseUserAgent(userAgent);
  return [browser, os].filter(Boolean).join(" / ") || "unknown";
}

export type RevokeResult = "revoked" | "current" | "gone";

/** Ends one of the person's other sessions. The current session is refused: signing out is its own action. */
export async function revokeSession(db: AuditExecutor, input: { userId: string; sessionId: string; currentSessionId: string; context: AuditContext }): Promise<RevokeResult> {
  if (input.sessionId === input.currentSessionId) return "current";
  return withAudit(db, { ...input.context, actorUserId: input.userId }, async (tx, audit) => {
    const [gone] = await tx
      .delete(session)
      .where(and(eq(session.id, input.sessionId), eq(session.userId, input.userId)))
      .returning({ userAgent: session.userAgent, createdAt: session.createdAt });
    if (!gone) return "gone";
    await audit({ action: "auth.session_revoke", entityType: "user", entityId: input.userId, before: { device: describeDevice(gone.userAgent), startedAt: gone.createdAt.toISOString() } });
    return "revoked";
  });
}

/** Ends every session of the person except the current one. Returns how many ended. */
export async function revokeOtherSessions(db: AuditExecutor, input: { userId: string; currentSessionId: string; context: AuditContext }): Promise<number> {
  return withAudit(db, { ...input.context, actorUserId: input.userId }, async (tx, audit) => {
    const gone = await tx
      .delete(session)
      .where(and(eq(session.userId, input.userId), ne(session.id, input.currentSessionId)))
      .returning({ id: session.id });
    if (gone.length > 0) await audit({ action: "auth.session_revoke_others", entityType: "user", entityId: input.userId, after: { endedSessions: gone.length } });
    return gone.length;
  });
}

export const NAME_MAX_LENGTH = 100;

/** Trims, collapses runs of whitespace and drops control characters. */
export function cleanDisplayName(value: unknown): string {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type RenameResult = "saved" | "unchanged" | "invalid";

export async function updateDisplayName(db: AuditExecutor, input: { userId: string; name: unknown; now?: Date; context: AuditContext }): Promise<RenameResult> {
  const name = cleanDisplayName(input.name);
  if (name.length === 0 || name.length > NAME_MAX_LENGTH) return "invalid";
  return withAudit(db, { ...input.context, actorUserId: input.userId }, async (tx, audit) => {
    const [current] = await tx.select({ name: user.name }).from(user).where(eq(user.id, input.userId)).for("update");
    if (!current) return "invalid";
    if (current.name === name) return "unchanged";
    await tx.update(user).set({ name, updatedAt: input.now ?? new Date() }).where(eq(user.id, input.userId));
    await audit({ action: "account.update_name", entityType: "user", entityId: input.userId, before: { name: current.name }, after: { name } });
    return "saved";
  });
}
