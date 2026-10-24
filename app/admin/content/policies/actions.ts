"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { contentActor, requireEditor } from "@/lib/admin/content/access";
import { EMPTY_FORM_STATE, isUuid, type ContentFormState } from "@/lib/admin/content/form-state";
import { ContentConflictError, ContentNotFoundError, deleteContent, saveContent } from "@/lib/admin/content/save";
import { getAdminLocale } from "@/lib/admin/locale";
import { getDb } from "@/lib/db";
import { policies, policyUpdates } from "@/lib/db/schema";
import { a } from "@/lib/i18n/admin";
import { policyUpdateRows, policyValues, validatePolicyForm } from "./validate";

const LIST = "/admin/content/policies";

/**
 * Create (id null) or update a policy and its update history. Bound to the
 * page with `.bind(null, id)`. Returns field errors, or redirects to the edit page.
 */
export async function savePolicy(id: string | null, _prev: ContentFormState, formData: FormData): Promise<ContentFormState> {
  const locale = await getAdminLocale();
  const staff = await requireEditor();
  const db = getDb();
  const L = (key: Parameters<typeof a>[0]) => a(key, locale);

  if (id !== null && !isUuid(id)) return { errors: {}, formError: L("errNotFound") };
  const [existing] = id ? await db.select({ status: policies.status }).from(policies).where(eq(policies.id, id)) : [];
  if (id && !existing) return { errors: {}, formError: L("errNotFound") };

  const checked = await validatePolicyForm(db, { locale, id, formData, existingStatus: existing?.status });
  if (!checked.ok) return { ...EMPTY_FORM_STATE, errors: checked.errors };
  const { status, intent } = checked;
  let saved;
  try {
    saved = await saveContent({
      entityType: "policy",
      table: policies,
      actor: await contentActor(staff),
      id: id ?? undefined,
      status,
      values: policyValues(checked.data),
      children: async (tx, policyId) => {
        await tx.delete(policyUpdates).where(eq(policyUpdates.policyId, policyId));
        const rows = policyUpdateRows(policyId, checked.data);
        if (rows.length > 0) await tx.insert(policyUpdates).values(rows);
        return { updates: rows };
      },
    });
  } catch (error) {
    if (error instanceof ContentConflictError) return { errors: { slug: L("errSlugTaken") } };
    if (error instanceof ContentNotFoundError) return { errors: {}, formError: L("errNotFound") };
    throw error;
  }
  const notice = intent === "publish" ? "published" : intent === "unpublish" ? "unpublished" : existing?.status === "published" ? "updated" : "saved";
  redirect(`${LIST}/${saved.id}?saved=${notice}`);
}

/** Deletes a policy (its updates go with it) and returns to the list. Bound with `.bind(null, id)`. */
export async function deletePolicy(id: string): Promise<void> {
  const staff = await requireEditor();
  if (!isUuid(id)) redirect(LIST);
  try {
    await deleteContent({ entityType: "policy", table: policies, actor: await contentActor(staff), id });
  } catch (error) {
    if (!(error instanceof ContentNotFoundError)) throw error;
  }
  redirect(`${LIST}?notice=deleted`);
}
