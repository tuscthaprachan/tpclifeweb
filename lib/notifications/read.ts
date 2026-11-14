/**
 * Reading and clearing a person's notifications. Every function takes the
 * user id and filters by it, so one person can never read or mark another's.
 */

import { and, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { AuditExecutor } from "@/lib/db/audit";
import { NOTIFICATION_KINDS, notifications, type NotificationKind, type NotificationRow } from "@/lib/db/schema/notifications";

export const NOTIFICATIONS_PAGE_SIZE = 20;

export type NotificationView = "unread" | "all";

export interface NotificationQuery {
  view: NotificationView;
  kind?: NotificationKind;
  page: number;
}

type Raw = Partial<Record<"view" | "kind" | "page", string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseNotificationQuery(raw: Raw): NotificationQuery {
  const kind = one(raw.kind);
  return {
    view: one(raw.view) === "all" ? "all" : "unread",
    kind: NOTIFICATION_KINDS.find((k) => k === kind),
    page: Math.max(1, Number.parseInt(one(raw.page) ?? "1", 10) || 1),
  };
}

export function notificationParams(query: Partial<NotificationQuery>): string {
  const sp = new URLSearchParams();
  if (query.view === "all") sp.set("view", "all");
  if (query.kind) sp.set("kind", query.kind);
  if (query.page && query.page > 1) sp.set("page", String(query.page));
  return sp.toString();
}

/** The count for the bell. Returns 0 rather than failing the page if the table is not there yet. */
export async function countUnread(db: AuditExecutor, userId: string): Promise<number> {
  try {
    const [row] = await db.select({ n: count() }).from(notifications).where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
    return row?.n ?? 0;
  } catch {
    return 0;
  }
}

export interface NotificationList {
  rows: NotificationRow[];
  total: number;
  unread: number;
  page: number;
  pageSize: number;
}

export async function listNotifications(db: AuditExecutor, userId: string, query: NotificationQuery): Promise<NotificationList> {
  const where = and(
    eq(notifications.userId, userId),
    query.view === "unread" ? isNull(notifications.readAt) : undefined,
    query.kind ? eq(notifications.kind, query.kind) : undefined,
  );
  const [{ total } = { total: 0 }] = await db.select({ total: sql<number>`count(*)::int` }).from(notifications).where(where);
  const rows = await db
    .select()
    .from(notifications)
    .where(where)
    .orderBy(desc(notifications.createdAt), desc(notifications.id))
    .limit(NOTIFICATIONS_PAGE_SIZE)
    .offset((query.page - 1) * NOTIFICATIONS_PAGE_SIZE);
  return { rows, total, unread: await countUnread(db, userId), page: query.page, pageSize: NOTIFICATIONS_PAGE_SIZE };
}

/** Marks the given notifications read, only if they are the person's. Returns how many changed. */
export async function markRead(db: AuditExecutor, userId: string, ids: readonly string[], now: Date = new Date()): Promise<number> {
  if (ids.length === 0) return 0;
  const rows = await db
    .update(notifications)
    .set({ readAt: now })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt), inArray(notifications.id, [...ids])))
    .returning({ id: notifications.id });
  return rows.length;
}

export async function markAllRead(db: AuditExecutor, userId: string, kind?: NotificationKind, now: Date = new Date()): Promise<number> {
  const rows = await db
    .update(notifications)
    .set({ readAt: now })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt), kind ? eq(notifications.kind, kind) : undefined))
    .returning({ id: notifications.id });
  return rows.length;
}

/** One of the person's notifications, or undefined. */
export async function getNotification(db: AuditExecutor, userId: string, id: string): Promise<NotificationRow | undefined> {
  const [row] = await db.select().from(notifications).where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  return row;
}

/** A link that stays inside the console. Anything else becomes the inbox. */
export function safeConsoleHref(href: string): string {
  return /^\/admin(\/|\?|$)/.test(href) && !href.includes("//") && !href.includes("\\") ? href : "/admin/notifications";
}
