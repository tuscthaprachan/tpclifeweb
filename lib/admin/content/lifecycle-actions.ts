"use server";

import { redirect } from "next/navigation";
import { contentActor, requireEditor } from "@/lib/admin/content/access";
import { parseBangkokDateTime } from "@/lib/admin/content/datetime";
import { duplicateContent } from "@/lib/admin/content/duplicate";
import { isUuid } from "@/lib/admin/content/form-state";
import { lifecycleType } from "@/lib/admin/content/lifecycle";
import { RevisionNotRestorableError, restoreRevision } from "@/lib/admin/content/restore";
import { checkSchedule } from "@/lib/admin/content/schedule";
import { ContentConflictError, ContentInUseError, ContentNotFoundError, saveContent, type ContentTable } from "@/lib/admin/content/save";
import { contentPath } from "@/lib/admin/content/types";
import { isScheduledSegment } from "@/lib/admin/content/capabilities";
import { getAdminLocale } from "@/lib/admin/locale";
import { a } from "@/lib/i18n/admin";

export interface ScheduleFormState {
  errors: { publishAt?: string; unpublishAt?: string };
  formError?: string;
}

const text = (data: FormData, key: string): string => {
  const v = data.get(key);
  return typeof v === "string" ? v.trim() : "";
};

/** Saves the publication window of one item. `useActionState` action: the form carries `segment`, `id`, `publishAt` and `unpublishAt`. */
export async function saveSchedule(_prev: ScheduleFormState, formData: FormData): Promise<ScheduleFormState> {
  const locale = await getAdminLocale();
  const staff = await requireEditor();
  const segment = text(formData, "segment");
  const id = text(formData, "id");
  const found = lifecycleType(segment);
  if (!found || !isScheduledSegment(segment) || !isUuid(id)) return { errors: {}, formError: a("errNotFound", locale) };

  const errors: ScheduleFormState["errors"] = {};
  const parse = (key: "publishAt" | "unpublishAt", label: Parameters<typeof a>[0]): Date | null => {
    const raw = text(formData, key);
    if (!raw) return null;
    const date = parseBangkokDateTime(raw);
    if (!date) errors[key] = a("errDateInvalid", locale, { field: a(label, locale) });
    return date;
  };
  const publishAt = parse("publishAt", "clcPublishAt");
  const unpublishAt = parse("unpublishAt", "clcUnpublishAt");
  if (!errors.publishAt && !errors.unpublishAt) {
    const problem = checkSchedule(publishAt, unpublishAt);
    if (problem) errors.unpublishAt = a(problem === "unpublishInPast" ? "clcErrUnpublishPast" : "clcErrUnpublishBefore", locale);
  }
  if (Object.keys(errors).length > 0) return { errors };

  try {
    await saveContent({
      entityType: found.def.entityType,
      table: found.def.table as ContentTable,
      actor: await contentActor(staff),
      id,
      values: { publishAt, unpublishAt },
    });
  } catch (error) {
    if (error instanceof ContentNotFoundError) return { errors: {}, formError: a("errNotFound", locale) };
    return { errors: {}, formError: a("clcErrScheduleSave", locale) };
  }
  redirect(`${contentPath(found.def, id)}?saved=scheduled`);
}

/** Creates a draft copy and opens it. The form carries `segment` and `id`. */
export async function duplicateItem(formData: FormData): Promise<void> {
  const staff = await requireEditor();
  const segment = text(formData, "segment");
  const id = text(formData, "id");
  const found = lifecycleType(segment);
  if (!found || !isUuid(id)) redirect("/admin/content");
  let copyId: string;
  try {
    copyId = (await duplicateContent({ segment, id, actor: await contentActor(staff) })).id;
  } catch (error) {
    if (error instanceof ContentNotFoundError) redirect(contentPath(found.def));
    throw error;
  }
  redirect(`${contentPath(found.def, copyId)}?saved=duplicated`);
}

/** Restores a revision as a draft, or published when the pressed button's value is `publish`. The form carries `segment`, `id`, `revision` and `publish`. */
export async function restoreItem(formData: FormData): Promise<void> {
  const staff = await requireEditor();
  const segment = text(formData, "segment");
  const id = text(formData, "id");
  const revision = Number(text(formData, "revision"));
  const found = lifecycleType(segment);
  if (!found || !isUuid(id) || !Number.isInteger(revision) || revision < 1) redirect("/admin/content");
  const history = `${contentPath(found.def, id)}/history`;
  try {
    await restoreRevision({ segment, id, revisionNumber: revision, publish: text(formData, "publish") === "publish", actor: await contentActor(staff) });
  } catch (error) {
    if (error instanceof ContentConflictError) redirect(`${history}?restore=slug&v=${revision}`);
    if (error instanceof ContentInUseError) redirect(`${history}?restore=inUse&v=${revision}`);
    if (error instanceof ContentNotFoundError || error instanceof RevisionNotRestorableError) redirect(`${history}?restore=gone&v=${revision}`);
    throw error;
  }
  redirect(`${contentPath(found.def, id)}?saved=restored`);
}
