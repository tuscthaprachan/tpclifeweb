import "server-only";

import { redirect } from "next/navigation";
import { isStaff } from "@/lib/auth/roles";
import { requireSignedIn, type AccessContext } from "@/lib/auth/session";

/**
 * Setting up a second step is only for staff who do not have one yet. Anyone
 * else is sent where they belong: students to "no access", people who already
 * have a factor to the challenge (or the console, if they have passed it).
 * Better Auth enforces the same rule again on its own endpoints.
 */
export async function requireSetupAccess(): Promise<AccessContext> {
  const ctx = await requireSignedIn();
  if (!isStaff(ctx.roles)) redirect("/admin/no-access");
  if (ctx.hasSecondFactor) redirect(ctx.secondFactorAt ? "/admin" : "/admin/sign-in/verify");
  return ctx;
}
