"use server";

/**
 * My account. Each action acts only on the signed-in person: the user id and
 * the current session come from the session, never from the form.
 */

import { redirect } from "next/navigation";
import { revokeOtherSessions, revokeSession, updateDisplayName } from "@/lib/admin/account/sessions";
import { auditContextFor, requireStaff } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

export async function updateNameAction(formData: FormData): Promise<void> {
  const staff = await requireStaff();
  const result = await updateDisplayName(getDb(), { userId: staff.user.id, name: formData.get("name"), context: await auditContextFor(staff) });
  redirect(`/admin/account?notice=${result === "saved" ? "name-saved" : result === "unchanged" ? "name-unchanged" : "name-invalid"}`);
}

export async function revokeSessionAction(formData: FormData): Promise<void> {
  const staff = await requireStaff();
  const result = await revokeSession(getDb(), {
    userId: staff.user.id,
    sessionId: String(formData.get("sessionId") ?? ""),
    currentSessionId: staff.sessionId,
    context: await auditContextFor(staff),
  });
  redirect(`/admin/account?notice=${result === "revoked" ? "session-ended" : "session-gone"}`);
}

export async function revokeOtherSessionsAction(): Promise<void> {
  const staff = await requireStaff();
  await revokeOtherSessions(getDb(), { userId: staff.user.id, currentSessionId: staff.sessionId, context: await auditContextFor(staff) });
  redirect("/admin/account?notice=others-ended");
}
