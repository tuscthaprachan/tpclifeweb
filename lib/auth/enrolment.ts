/**
 * Creating a staff account from an invite. The invite token is the proof: it
 * is single-use, stored hashed and expires, so whoever holds it may create the
 * account for the address it names, by registering a passkey. No email code.
 *
 * This runs after the passkey has been verified (lib/auth/create.ts), in one
 * transaction: the user row, the invite claim, the role grants and their audit
 * rows commit or roll back together.
 *
 * An invite for an address that already has an account never creates anything
 * here. Otherwise whoever held the link could attach their own passkey to
 * someone else's account. That person signs in with their passkey and accepts
 * the invite while signed in (`acceptInvite`).
 */

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { withAudit, type AuditContext, type AuditExecutor } from "@/lib/db/audit";
import { user } from "@/lib/db/schema/auth";
import { acceptInvite, findInviteByToken, InviteError, inviteStatus } from "./invites";

export const NAME_MAX = 100;

/** Trimmed, single spaced, without control characters. Null when nothing usable is left. */
export function cleanPersonName(raw: string): string | null {
  const name = raw.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return name && name.length <= NAME_MAX ? name : null;
}

/** A fresh id for the account an invite is about to create. */
export function newUserId(): string {
  return randomUUID().replaceAll("-", "");
}

export async function userExistsWithEmail(db: AuditExecutor, email: string): Promise<boolean> {
  const [row] = await db.select({ id: user.id }).from(user).where(eq(user.email, email.trim().toLowerCase())).limit(1);
  return Boolean(row);
}

export interface CreateStaffAccountInput {
  token: string;
  userId: string;
  name: string;
  context?: AuditContext;
  now?: Date;
}

/** Creates the account named by the invite and grants its roles. Throws `InviteError`. */
export async function createStaffAccount(
  db: AuditExecutor,
  input: CreateStaffAccountInput,
): Promise<{ userId: string; email: string; organisationId: number }> {
  const name = cleanPersonName(input.name);
  if (!name) throw new InviteError("invalid_name");
  const now = input.now ?? new Date();

  return withAudit(db, { ...input.context, actorUserId: input.userId }, async (tx, audit) => {
    // Read inside the transaction so the address checked is the address the invite names.
    const found = await findInviteByToken(tx, input.token);
    if (!found) throw new InviteError("not_found");
    const status = inviteStatus(found.invite, now);
    if (status === "accepted") throw new InviteError("already_accepted");
    if (status === "revoked") throw new InviteError("revoked");
    if (status === "expired") throw new InviteError("expired");
    const email = found.invite.email;

    if (await userExistsWithEmail(tx, email)) throw new InviteError("account_exists");
    const [created] = await tx
      .insert(user)
      .values({ id: input.userId, name, email, emailVerified: false })
      .onConflictDoNothing()
      .returning({ id: user.id });
    if (!created) throw new InviteError("account_exists");
    await audit({
      action: "staff_account.create",
      entityType: "user",
      entityId: created.id,
      actorOrganisationId: found.invite.organisationId,
      after: { email, name, viaInvite: found.invite.id },
    });

    const accepted = await acceptInvite(tx, { token: input.token, userId: created.id, userEmail: email, context: input.context, now });
    return { userId: created.id, email, organisationId: accepted.organisationId };
  });
}
