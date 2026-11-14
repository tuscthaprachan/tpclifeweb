"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { NOTIFICATION_KINDS } from "@/lib/db/schema/notifications";
import { markAllRead, markRead, notificationParams, parseNotificationQuery } from "@/lib/notifications/read";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function back(formData: FormData, notice: string): never {
  const query = parseNotificationQuery({ view: String(formData.get("view") ?? ""), kind: String(formData.get("kind") ?? ""), page: String(formData.get("page") ?? "") });
  const sp = new URLSearchParams(notificationParams(query));
  sp.set("notice", notice);
  redirect(`/admin/notifications?${sp.toString()}`);
}

/** Marks the posted notifications (field `id`) read. Only the person's own are touched. */
export async function markReadAction(formData: FormData): Promise<void> {
  const staff = await requireStaff();
  const ids = formData.getAll("id").filter((v): v is string => typeof v === "string" && UUID.test(v));
  await markRead(getDb(), staff.user.id, ids);
  revalidatePath("/admin", "layout");
  back(formData, "one");
}

/** Marks every unread notification read, or only those of the chosen kind when the filter is set. */
export async function markAllReadAction(formData: FormData): Promise<void> {
  const staff = await requireStaff();
  const kind = NOTIFICATION_KINDS.find((k) => k === formData.get("kind"));
  await markAllRead(getDb(), staff.user.id, kind);
  revalidatePath("/admin", "layout");
  back(formData, "all");
}
