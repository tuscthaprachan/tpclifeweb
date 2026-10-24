"use server";

import { redirect } from "next/navigation";
import { acceptInvite, InviteError } from "@/lib/auth/invites";
import { auditContextFor, requireSignedIn } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

/**
 * "Accept invitation", for a person who already has an account (a new one is
 * created by registering a passkey, in the browser). They must be signed in
 * with their passkey, and `acceptInvite` checks the invite names their address.
 */
export async function acceptInviteAction(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const ctx = await requireSignedIn();
  try {
    await acceptInvite(getDb(), { token, userId: ctx.user.id, userEmail: ctx.user.email, context: await auditContextFor(ctx) });
  } catch (error) {
    if (error instanceof InviteError) redirect(`/admin/invite/${encodeURIComponent(token)}`);
    throw error;
  }
  redirect("/admin");
}
