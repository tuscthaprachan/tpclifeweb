/**
 * Emailing staff about the notifications just written. Call it after the
 * transaction that created them has committed, with the ids it returned. It
 * never throws: a notification is in the console whether or not the email
 * went. Suspended staff (no active role) and banned accounts are not emailed.
 */

import { and, eq, inArray, isNull } from "drizzle-orm";
import type { AuditExecutor } from "@/lib/db/audit";
import { user } from "@/lib/db/schema/auth";
import { notifications } from "@/lib/db/schema/notifications";
import { staffRoles } from "@/lib/db/schema/staff-roles";
import { getEmailSender, isEmailConfigured, type EmailSender } from "@/lib/email";
import { staffNotification } from "@/lib/email/staff-notification-templates";

export interface DeliverOpts {
  sender?: EmailSender;
  emailConfigured?: boolean;
  baseUrl?: string;
}

function defaultBaseUrl(): string | undefined {
  const explicit = process.env.BETTER_AUTH_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  return vercel ? `https://${vercel}` : undefined;
}

/** Returns how many emails were sent. */
export async function deliverNotificationEmails(db: AuditExecutor, ids: readonly string[], opts: DeliverOpts = {}): Promise<number> {
  if (ids.length === 0) return 0;
  try {
    if (!(opts.emailConfigured ?? isEmailConfigured())) return 0;
    const base = (opts.baseUrl ?? defaultBaseUrl())?.replace(/\/+$/, "");
    if (!base) return 0;
    const rows = await db
      .select({ id: notifications.id, userId: notifications.userId, kind: notifications.kind, params: notifications.params, email: user.email, banned: user.banned })
      .from(notifications)
      .innerJoin(user, eq(user.id, notifications.userId))
      .where(inArray(notifications.id, [...ids]));
    if (rows.length === 0) return 0;
    const holders = await db
      .selectDistinct({ userId: staffRoles.userId })
      .from(staffRoles)
      .where(and(inArray(staffRoles.userId, [...new Set(rows.map((r) => r.userId))]), isNull(staffRoles.revokedAt)));
    const active = new Set(holders.map((h) => h.userId));
    let sent = 0;
    for (const row of rows) {
      try {
        if (row.banned || !active.has(row.userId)) continue;
        const reference = typeof row.params?.reference === "string" ? row.params.reference : null;
        const mail = staffNotification({ kind: row.kind, reference, url: `${base}/admin/notifications/open/${row.id}` });
        await (opts.sender ?? getEmailSender()).send({ to: row.email, ...mail });
        sent += 1;
      } catch (error) {
        console.error("[notifications] could not email staff", error instanceof Error ? error.name : "error");
      }
    }
    return sent;
  } catch (error) {
    console.error("[notifications] could not email staff", error instanceof Error ? error.name : "error");
    return 0;
  }
}
