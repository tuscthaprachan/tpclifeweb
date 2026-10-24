"use server";

/**
 * My security. Each action acts only on the signed-in person's own passkeys:
 * the user id comes from the session, never from the form.
 */

import { redirect } from "next/navigation";
import { removeOlderPasskeys, removePasskey, renamePasskey } from "@/lib/auth/passkeys";
import { auditContextFor, requireStaff } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

export async function renamePasskeyAction(formData: FormData): Promise<void> {
  const staff = await requireStaff();
  const result = await renamePasskey(getDb(), {
    userId: staff.user.id,
    passkeyId: String(formData.get("passkeyId") ?? ""),
    name: String(formData.get("name") ?? ""),
    context: await auditContextFor(staff),
  });
  redirect(`/admin/security?notice=${result === "renamed" ? "renamed" : result === "invalid_name" ? "bad-name" : "gone"}`);
}

export async function removePasskeyAction(formData: FormData): Promise<void> {
  const staff = await requireStaff();
  const result = await removePasskey(getDb(), {
    userId: staff.user.id,
    passkeyId: String(formData.get("passkeyId") ?? ""),
    context: await auditContextFor(staff),
  });
  redirect(`/admin/security?notice=${result === "removed" ? "removed" : result === "last_passkey" ? "last-passkey" : "gone"}`);
}

export async function removeOlderPasskeysAction(): Promise<void> {
  const staff = await requireStaff();
  await removeOlderPasskeys(getDb(), { userId: staff.user.id, context: await auditContextFor(staff) });
  redirect("/admin/security?notice=older-removed");
}
