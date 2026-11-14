/**
 * Writing notifications. Call these inside the transaction that caused the
 * event, so a notification exists exactly when the change committed. A row
 * holds only the values the strings need (`params`) and a staff link, never
 * personal data from a case. Who is told is decided by the caller; the helpers
 * here only find the right staff for a service and keep restricted complaint
 * categories from reaching anyone who cannot see them.
 */

import { and, inArray, isNull } from "drizzle-orm";
import type { AuditExecutor } from "@/lib/db/audit";
import { canSeeCase } from "@/lib/cases/restrictions";
import { SERVICES, type CaseService } from "@/lib/cases/services";
import { notifications, type NotificationKind } from "@/lib/db/schema/notifications";
import { staffRoles } from "@/lib/db/schema/staff-roles";

export interface NewNotification {
  userId: string;
  kind: NotificationKind;
  params?: Record<string, string | number | null>;
  /** A path inside the console, starting with /admin/. */
  href: string;
  entityType?: string;
  entityId?: string;
  /** With the same user, a second notification with this key is ignored. */
  dedupeKey?: string;
}

/** Inserts the notifications, skipping any whose (user, dedupe key) already exists. Returns how many were added. */
export async function createNotifications(tx: AuditExecutor, items: readonly NewNotification[], now: Date = new Date()): Promise<number> {
  if (items.length === 0) return 0;
  const rows = await tx
    .insert(notifications)
    .values(
      items.map((n) => ({
        userId: n.userId,
        kind: n.kind,
        params: n.params ?? {},
        href: n.href,
        entityType: n.entityType ?? null,
        entityId: n.entityId ?? null,
        dedupeKey: n.dedupeKey ?? null,
        createdAt: now,
      })),
    )
    .onConflictDoNothing()
    .returning({ id: notifications.id });
  return rows.length;
}

export async function createNotification(tx: AuditExecutor, item: NewNotification, now: Date = new Date()): Promise<boolean> {
  return (await createNotifications(tx, [item], now)) > 0;
}

/** Everyone holding a role that works `service`, once each. */
export async function serviceStaffIds(tx: AuditExecutor, service: CaseService): Promise<string[]> {
  const rows = await tx
    .selectDistinct({ userId: staffRoles.userId })
    .from(staffRoles)
    .where(and(isNull(staffRoles.revokedAt), inArray(staffRoles.role, [...SERVICES[service].roles])));
  return rows.map((r) => r.userId);
}

/** The staff of `service` who may see the case: a restricted complaint reaches only those named on its category. */
export async function caseAudience(tx: AuditExecutor, caseId: string, service: CaseService): Promise<string[]> {
  const staff = await serviceStaffIds(tx, service);
  const visible: string[] = [];
  for (const userId of staff) if (await canSeeCase(tx, caseId, userId)) visible.push(userId);
  return visible;
}
