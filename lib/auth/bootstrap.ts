/**
 * The logic behind `npm run auth:bootstrap`, kept out of the script file so the
 * refusal rules are tested like any other code.
 *
 * - First admin: nobody can invite them, so this makes one admin invite.
 * - Break-glass (`--recover <email>`): if every admin has lost their passkeys,
 *   nobody can sign in to issue a recovery link. Whoever can run this command
 *   has direct database access, which is already the highest trust there is,
 *   so it issues a 24 hour recovery link for an existing admin. Audited like
 *   any other recovery, with no issuing user.
 */

import type { AuditExecutor } from "@/lib/db/audit";
import { eq } from "drizzle-orm";
import { user } from "@/lib/db/schema/auth";
import { normaliseEmail } from "./email-address";
import { createBootstrapInvite, InviteError, INVITE_TTL_DAYS } from "./invites";
import { issueRecoveryLink, RecoveryError, RECOVERY_TTL_HOURS } from "./recovery";

export class BootstrapError extends Error {}

export interface BootstrapResult {
  link: string;
  email: string;
  organisationName: string;
  expiresAt: Date;
}

export async function runBootstrap(
  db: AuditExecutor,
  input: { email: string; organisationSlug: string; baseUrl: string; now?: Date },
): Promise<BootstrapResult> {
  try {
    const { invite, token, organisation } = await createBootstrapInvite(db, input);
    return {
      link: `${input.baseUrl.replace(/\/+$/, "")}/admin/invite/${token}`,
      email: invite.email,
      organisationName: organisation.nameEn,
      expiresAt: invite.expiresAt,
    };
  } catch (error) {
    if (error instanceof InviteError) {
      const reasons: Record<string, string> = {
        admin_exists: "An administrator already exists, so this command will not make another. Ask them to invite you from /admin/staff.",
        unknown_organisation: `There is no organisation with the slug "${input.organisationSlug}". Run npm run db:seed first, then use tusu or tusc.`,
        invalid_email: "That does not look like an email address.",
      };
      throw new BootstrapError(reasons[error.code] ?? `Could not create the invitation (${error.code}).`);
    }
    throw error;
  }
}

export interface RecoveryResult {
  link: string;
  email: string;
  expiresAt: Date;
}

/** Issues a recovery link for an existing admin, found by email. Throws `BootstrapError`. */
export async function runRecovery(
  db: AuditExecutor,
  input: { email: string; baseUrl: string; now?: Date },
): Promise<RecoveryResult> {
  const [person] = await db.select({ id: user.id }).from(user).where(eq(user.email, normaliseEmail(input.email)));
  if (!person) throw new BootstrapError(`There is no account for "${input.email}".`);
  try {
    const { link, token, person: found } = await issueRecoveryLink(db, {
      userId: person.id,
      issuedBy: null,
      requireAdmin: true,
      context: { actorUserId: null },
      now: input.now,
    });
    return { link: `${input.baseUrl.replace(/\/+$/, "")}/admin/recover/${token}`, email: found.email, expiresAt: link.expiresAt };
  } catch (error) {
    if (error instanceof RecoveryError) {
      const reasons: Record<string, string> = {
        not_staff: "That person holds no staff role. Ask an administrator to invite them again.",
        not_admin: "That person is not an administrator. An administrator can issue their recovery link from /admin/staff.",
      };
      throw new BootstrapError(reasons[error.code] ?? `Could not create the recovery link (${error.code}).`);
    }
    throw error;
  }
}

export { INVITE_TTL_DAYS, RECOVERY_TTL_HOURS };
