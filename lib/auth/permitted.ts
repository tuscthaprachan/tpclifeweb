/**
 * May this email address ask for a sign-in code at all? Yes when its domain is
 * on the allowlist, when it already has an account (so staff invited from
 * another domain can come back), or when an admin has invited it. The invite
 * is itself the authorisation, so it is allowed on any domain.
 */

import { eq } from "drizzle-orm";
import type { AuditExecutor } from "@/lib/db/audit";
import { user } from "@/lib/db/schema/auth";
import { isAllowedEmailDomain, normaliseEmail } from "./domains";
import { hasPendingInviteForEmail } from "./invites";

export async function isEmailPermitted(
  db: AuditExecutor,
  rawEmail: string,
  allowedDomains: readonly string[],
): Promise<boolean> {
  const email = normaliseEmail(rawEmail);
  if (isAllowedEmailDomain(email, allowedDomains)) return true;
  const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
  return Boolean(existing) || (await hasPendingInviteForEmail(db, email));
}
