"use server";

import { redirect } from "next/navigation";
import { contentActor, requireEditor } from "@/lib/admin/content/access";
import { applyBulk, bulkResultParams, isBulkAction, parseIds, supportsBulk } from "@/lib/admin/content/bulk";
import { sanitiseBack } from "@/lib/admin/content/list-query";
import { contentPath, getContentType } from "@/lib/admin/content/types";

function listUrl(segment: string, back: string, extra?: URLSearchParams): string {
  const search = new URLSearchParams(back);
  for (const [key, value] of extra ?? []) search.append(key, value);
  const text = search.toString();
  return `${contentPath({ segment })}${text ? `?${text}` : ""}`;
}

/**
 * The list's bulk form. Publish and unpublish run at once and report per item;
 * Delete only goes to the confirmation page, so nothing is removed without
 * a second step, with or without JavaScript. Fields: segment, back, id (many), intent.
 */
export async function bulkContentAction(formData: FormData): Promise<void> {
  const staff = await requireEditor();
  const def = getContentType(String(formData.get("segment") ?? ""));
  if (!def || !supportsBulk(def)) redirect("/admin/content");
  const back = sanitiseBack(String(formData.get("back") ?? ""));
  const intent = formData.get("intent");
  const ids = parseIds(formData.getAll("id"));
  if (!isBulkAction(intent) || ids.length === 0) redirect(listUrl(def.segment, back, new URLSearchParams({ bulk: "none" })));

  if (intent === "delete") {
    const search = new URLSearchParams(ids.map((id) => ["id", id]));
    if (back) search.set("back", back);
    redirect(`/admin/content/bulk/${def.segment}?${search.toString()}`);
  }
  const result = await applyBulk({ def, action: intent, ids, actor: await contentActor(staff) });
  redirect(listUrl(def.segment, back, bulkResultParams(intent, result)));
}

/** The confirmation page's form: deletes the listed ids and returns to the list with a per-item report. */
export async function bulkDeleteAction(formData: FormData): Promise<void> {
  const staff = await requireEditor();
  const def = getContentType(String(formData.get("segment") ?? ""));
  if (!def || !supportsBulk(def)) redirect("/admin/content");
  const back = sanitiseBack(String(formData.get("back") ?? ""));
  const ids = parseIds(formData.getAll("id"));
  if (ids.length === 0) redirect(listUrl(def.segment, back, new URLSearchParams({ bulk: "none" })));
  const result = await applyBulk({ def, action: "delete", ids, actor: await contentActor(staff) });
  redirect(listUrl(def.segment, back, bulkResultParams("delete", result)));
}
