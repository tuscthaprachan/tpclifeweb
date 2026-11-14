"use server";

/**
 * Inbox actions: bulk assign and bulk status, and saved views. Each starts
 * with `requireStaff` for the inbox roles; the engine (`assign`,
 * `transition`) and the views module check the rest, so the form is never
 * trusted. Every action redirects back to the inbox with the same filters, so
 * they work as plain form posts without JavaScript.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CASE_INBOX_ROLES, accessibleServices } from "@/lib/cases/access";
import { bulkAssign, bulkTransition, caseBulkParams, parseCaseIds } from "@/lib/cases/bulk";
import { canonicalViewQuery } from "@/lib/cases/inbox-query";
import { allStatuses } from "@/lib/cases/services";
import { staffActorFor } from "@/lib/cases/staff";
import { createView, deleteView, updateView, ViewError, type ViewErrorCode } from "@/lib/cases/views";
import { getRequestMeta, requireStaff } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

const text = (formData: FormData, name: string): string => {
  const v = formData.get(name);
  return typeof v === "string" ? v : "";
};

function inbox(back: string, extra: Record<string, string> | URLSearchParams = {}): never {
  const sp = new URLSearchParams(canonicalViewQuery(back));
  for (const [k, v] of extra instanceof URLSearchParams ? extra : Object.entries(extra)) sp.append(k, v);
  const qs = sp.toString();
  redirect(qs ? `/admin/cases?${qs}` : "/admin/cases");
}

/** The inbox's bulk form: field `id` (many), `intent` (assign or transition), `assignee`, `status`, `back`. */
export async function bulkCasesAction(formData: FormData): Promise<void> {
  const staff = await requireStaff(CASE_INBOX_ROLES);
  const back = text(formData, "back");
  const intent = text(formData, "intent");
  const ids = parseCaseIds(formData.getAll("id"));
  if (ids.length === 0) inbox(back, { bulk: "none" });
  const services = accessibleServices(staff.roles);
  const actor = await staffActorFor(staff, services[0]!);
  const db = getDb();

  if (intent === "assign") {
    const raw = text(formData, "assignee");
    if (!raw) inbox(back, { bulk: "needAssignee" });
    const result = await bulkAssign(db, ids, raw === "nobody" ? null : raw === "me" ? actor.userId : raw, actor);
    revalidatePath("/admin/cases");
    inbox(back, caseBulkParams("assign", result));
  }
  if (intent === "transition") {
    const to = text(formData, "status");
    if (!allStatuses("lost_found").some((s) => s.key === to)) inbox(back, { bulk: "needStatus" });
    const result = await bulkTransition(db, ids, to, actor);
    revalidatePath("/admin/cases");
    inbox(back, caseBulkParams("transition", result));
  }
  inbox(back);
}

const VIEW_ERRORS: Record<ViewErrorCode, string> = { name: "name", limit: "limit", not_found: "notFound" };

async function viewWork(formData: FormData, work: (userId: string, context: Awaited<ReturnType<typeof getRequestMeta>>) => Promise<string>): Promise<void> {
  const staff = await requireStaff(CASE_INBOX_ROLES);
  const back = text(formData, "back");
  let notice: string;
  try {
    notice = await work(staff.user.id, await getRequestMeta());
  } catch (error) {
    if (!(error instanceof ViewError)) throw error;
    notice = `viewError_${VIEW_ERRORS[error.code]}`;
  }
  revalidatePath("/admin/cases");
  inbox(back, { notice });
}

export async function saveViewAction(formData: FormData): Promise<void> {
  return viewWork(formData, async (userId, meta) => {
    await createView(getDb(), userId, { name: text(formData, "name"), query: text(formData, "back"), shared: formData.get("shared") === "on" }, { ip: meta.ip, userAgent: meta.userAgent });
    return "viewSaved";
  });
}

export async function updateViewAction(formData: FormData): Promise<void> {
  return viewWork(formData, async (userId, meta) => {
    await updateView(getDb(), userId, text(formData, "viewId"), { name: text(formData, "name"), shared: formData.get("shared") === "on" }, { ip: meta.ip, userAgent: meta.userAgent });
    return "viewUpdated";
  });
}

export async function deleteViewAction(formData: FormData): Promise<void> {
  return viewWork(formData, async (userId, meta) => {
    await deleteView(getDb(), userId, text(formData, "viewId"), { ip: meta.ip, userAgent: meta.userAgent });
    return "viewDeleted";
  });
}
