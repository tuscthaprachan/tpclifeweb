/**
 * The logic behind `npm run auth:bootstrap`: the very first admin has nobody to
 * invite them, so this makes one admin invite from the command line. Kept out
 * of the script file so the refusal rules are tested like any other code.
 */

import type { AuditExecutor } from "@/lib/db/audit";
import { createBootstrapInvite, InviteError, INVITE_TTL_DAYS } from "./invites";

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

export { INVITE_TTL_DAYS };
