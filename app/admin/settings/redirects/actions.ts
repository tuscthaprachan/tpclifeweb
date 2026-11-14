"use server";

import { redirect } from "next/navigation";
import { contentActor, requireEditor } from "@/lib/admin/content/access";
import { isUuid } from "@/lib/admin/content/form-state";
import { getAdminLocale } from "@/lib/admin/locale";
import { revalidateFor } from "@/lib/content/revalidate";
import { getDb } from "@/lib/db";
import { a, type AdminKey } from "@/lib/i18n/admin";
import { RedirectExistsError, RedirectInvalidError, RedirectNotFoundError, deleteRedirect, saveRedirect } from "@/lib/redirects/store";
import type { RedirectProblem } from "@/lib/redirects/validate";

const LIST = "/admin/settings/redirects";

export interface RedirectFormState {
  errors: { from?: string; to?: string; status?: string };
  formError?: string;
}

const PROBLEM_KEY: Record<RedirectProblem, AdminKey> = {
  fromRequired: "rdErrFromRequired",
  fromShape: "rdErrFromShape",
  fromReserved: "rdErrFromReserved",
  toRequired: "rdErrToRequired",
  toShape: "rdErrToShape",
  toExternal: "rdErrToExternal",
  selfLoop: "rdErrSelf",
  loop: "rdErrLoop",
  statusInvalid: "rdErrStatus",
};

const text = (data: FormData, key: string): string => {
  const v = data.get(key);
  return typeof v === "string" ? v : "";
};

/** Adds a redirect, or edits the one with `id` (bound with `.bind(null, id)`). */
export async function saveRedirectAction(id: string | null, _prev: RedirectFormState, formData: FormData): Promise<RedirectFormState> {
  const locale = await getAdminLocale();
  const staff = await requireEditor();
  if (id !== null && !isUuid(id)) return { errors: {}, formError: a("errNotFound", locale) };
  try {
    await saveRedirect(getDb(), await contentActor(staff), {
      id: id ?? undefined,
      from: text(formData, "from"),
      to: text(formData, "to"),
      status: Number(text(formData, "status")),
    });
  } catch (error) {
    if (error instanceof RedirectInvalidError) {
      const errors: RedirectFormState["errors"] = {};
      for (const field of ["from", "to", "status"] as const) {
        const problem = error.errors[field];
        if (problem) errors[field] = a(PROBLEM_KEY[problem], locale);
      }
      return { errors };
    }
    if (error instanceof RedirectExistsError) return { errors: { from: a("rdErrExists", locale) } };
    if (error instanceof RedirectNotFoundError) return { errors: {}, formError: a("errNotFound", locale) };
    throw error;
  }
  revalidateFor("redirect");
  redirect(`${LIST}?notice=saved`);
}

/** Deletes a redirect (bound with `.bind(null, id)`). */
export async function deleteRedirectAction(id: string): Promise<void> {
  const staff = await requireEditor();
  if (!isUuid(id)) redirect(LIST);
  try {
    await deleteRedirect(getDb(), await contentActor(staff), id);
  } catch (error) {
    if (!(error instanceof RedirectNotFoundError)) throw error;
  }
  revalidateFor("redirect");
  redirect(`${LIST}?notice=deleted`);
}
