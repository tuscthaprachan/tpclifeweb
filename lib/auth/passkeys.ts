/**
 * A person's passkeys: listing, renaming, removing, and the rule that the
 * last one can never be removed (without one nobody can sign in). Takes the
 * database as a parameter and imports nothing server-only, so it runs under
 * Next, tsx and PGlite alike. Every change is audited in the same transaction.
 *
 * Removal and renaming go through here rather than Better Auth's own
 * endpoints, which are closed off in lib/auth/create.ts, so the last-passkey
 * check and the audit row cannot be skipped.
 */

import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import { withAudit, type AuditContext, type AuditExecutor } from "@/lib/db/audit";
import { passkey } from "@/lib/db/schema/auth";

export const PASSKEY_NAME_MAX = 60;

export interface PasskeySummary {
  id: string;
  name: string | null;
  createdAt: Date | null;
  lastUsedAt: Date | null;
  deviceType: string;
  backedUp: boolean;
}

/** Trimmed, single spaced, without control characters. Null when nothing usable is left. */
export function cleanPasskeyName(raw: string): string | null {
  const name = raw.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return name && name.length <= PASSKEY_NAME_MAX ? name : null;
}

/** Oldest first, so "Passkey 1" stays the first one. */
export async function listPasskeys(db: AuditExecutor, userId: string): Promise<PasskeySummary[]> {
  return db
    .select({
      id: passkey.id,
      name: passkey.name,
      createdAt: passkey.createdAt,
      lastUsedAt: passkey.lastUsedAt,
      deviceType: passkey.deviceType,
      backedUp: passkey.backedUp,
    })
    .from(passkey)
    .where(eq(passkey.userId, userId))
    .orderBy(asc(passkey.createdAt), asc(passkey.id));
}

/** Records that a passkey was just used to sign in. Best effort: never blocks a sign-in. */
export async function recordPasskeyUse(db: AuditExecutor, credentialId: string, now: Date = new Date()): Promise<void> {
  await db.update(passkey).set({ lastUsedAt: now }).where(eq(passkey.credentialID, credentialId));
}

export type RenamePasskeyResult = "renamed" | "not_found" | "invalid_name";

export async function renamePasskey(
  db: AuditExecutor,
  input: { userId: string; passkeyId: string; name: string; context?: AuditContext },
): Promise<RenamePasskeyResult> {
  const name = cleanPasskeyName(input.name);
  if (!name) return "invalid_name";
  return withAudit(db, { ...input.context, actorUserId: input.userId }, async (tx, audit) => {
    const [row] = await tx
      .update(passkey)
      .set({ name })
      .where(and(eq(passkey.id, input.passkeyId), eq(passkey.userId, input.userId)))
      .returning({ id: passkey.id });
    if (!row) return "not_found";
    await audit({ action: "auth.passkey.rename", entityType: "passkey", entityId: row.id, after: { name } });
    return "renamed";
  });
}

export type RemovePasskeyResult = "removed" | "not_found" | "last_passkey";

/**
 * Removes one of the person's own passkeys, unless it is their only one. The
 * person's passkey rows are locked first so two removals at once cannot both
 * pass the check and leave them with none.
 */
export async function removePasskey(
  db: AuditExecutor,
  input: { userId: string; passkeyId: string; context?: AuditContext },
): Promise<RemovePasskeyResult> {
  return withAudit(db, { ...input.context, actorUserId: input.userId }, async (tx, audit) => {
    const owned = await tx.select({ id: passkey.id, name: passkey.name }).from(passkey).where(eq(passkey.userId, input.userId)).for("update");
    const target = owned.find((p) => p.id === input.passkeyId);
    if (!target) return "not_found";
    if (owned.length <= 1) return "last_passkey";
    await tx.delete(passkey).where(and(eq(passkey.id, target.id), eq(passkey.userId, input.userId)));
    await audit({ action: "auth.passkey.remove", entityType: "passkey", entityId: target.id, before: { name: target.name } });
    return "removed";
  });
}

/** Removes every passkey except the newest. Used after recovery, when the older ones are the lost ones. Returns how many went. */
export async function removeOlderPasskeys(
  db: AuditExecutor,
  input: { userId: string; context?: AuditContext },
): Promise<number> {
  return withAudit(db, { ...input.context, actorUserId: input.userId }, async (tx, audit) => {
    const owned = await tx
      .select({ id: passkey.id, name: passkey.name })
      .from(passkey)
      .where(eq(passkey.userId, input.userId))
      .orderBy(desc(passkey.createdAt), desc(passkey.id))
      .for("update");
    const [newest, ...older] = owned;
    if (!newest || older.length === 0) return 0;
    const ids = older.map((p) => p.id);
    await tx.delete(passkey).where(and(eq(passkey.userId, input.userId), inArray(passkey.id, ids), ne(passkey.id, newest.id)));
    for (const row of older) {
      await audit({
        action: "auth.passkey.remove",
        entityType: "passkey",
        entityId: row.id,
        before: { name: row.name },
        after: { reason: "recovery_cleanup" },
      });
    }
    return older.length;
  });
}
