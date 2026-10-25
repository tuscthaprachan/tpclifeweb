"use server";

/**
 * Complaint category admin actions. Admin only: each starts with
 * `requireStaff(["admin"])` and the library checks the role again. Changing
 * who is named on a restricted category, or removing a restriction, is audited
 * by the library in the same transaction.
 */

import { revalidatePath } from "next/cache";
import { getAdminLocale } from "@/lib/admin/locale";
import { isUuid } from "@/lib/admin/content/form-state";
import { requireStaff } from "@/lib/auth/session";
import { staffActorFor } from "@/lib/cases/staff";
import { CategoryError, createCategory, grantCategoryAccess, revokeCategoryAccess, updateCategory, type CategoryInput } from "@/lib/complaints/categories";
import { getDb } from "@/lib/db";
import { a, type AdminKey } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";

export interface CategoryState {
  error?: string;
  /** Field name to message. */
  errors?: Record<string, string>;
  saved?: AdminKey;
  /** The unrestrict needs an explicit yes: the form shows the confirmation box. */
  needsConfirm?: boolean;
}

const text = (fd: FormData, name: string): string => {
  const v = fd.get(name);
  return typeof v === "string" ? v : "";
};

function fail(error: unknown, locale: Locale): CategoryState {
  if (!(error instanceof CategoryError)) throw error;
  switch (error.code) {
    case "forbidden":
      return { error: a("errCaseForbidden", locale) };
    case "not_found":
      return { error: a("errCaseNotFound", locale) };
    case "conflict":
      return { errors: { key: a("cpcatErrKeyTaken", locale) } };
    case "needs_confirm":
      return { error: a("cpcatErrConfirm", locale), needsConfirm: true };
    case "no_staff":
      return { error: a("cpcatErrNoStaff", locale) };
    case "invalid":
      return { errors: { [error.field ?? "form"]: a(`cpcatErr_${error.field ?? "form"}` as AdminKey, locale) } };
  }
}

function input(fd: FormData): CategoryInput {
  return {
    nameTh: text(fd, "nameTh"),
    nameEn: text(fd, "nameEn"),
    hintTh: text(fd, "hintTh"),
    hintEn: text(fd, "hintEn"),
    acknowledgeDays: Number(text(fd, "acknowledgeDays")),
    resolveDays: Number(text(fd, "resolveDays")),
    restricted: text(fd, "restricted") === "yes",
    offerWellbeing: text(fd, "offerWellbeing") === "yes",
    position: Number(text(fd, "position") || 0),
    active: text(fd, "active") === "yes",
  };
}

async function run(work: (ctx: { actor: Awaited<ReturnType<typeof staffActorFor>>; locale: Locale }) => Promise<CategoryState>): Promise<CategoryState> {
  const locale = await getAdminLocale();
  const staff = await requireStaff(["admin"]);
  try {
    const actor = await staffActorFor(staff, "complaint");
    const state = await work({ actor, locale });
    revalidatePath("/admin/complaints/categories");
    return state;
  } catch (error) {
    return fail(error, locale);
  }
}

export async function updateCategoryAction(_prev: CategoryState, fd: FormData): Promise<CategoryState> {
  return run(async ({ actor }) => {
    const id = text(fd, "id");
    if (!isUuid(id)) return { error: a("cpcatErrBad", await getAdminLocale()) };
    await updateCategory(getDb(), id, input(fd), actor, { confirmUnrestrict: text(fd, "confirmUnrestrict") === "yes" });
    return { saved: "cpcatSaved" };
  });
}

export async function createCategoryAction(_prev: CategoryState, fd: FormData): Promise<CategoryState> {
  return run(async ({ actor }) => {
    await createCategory(getDb(), text(fd, "key").trim(), input(fd), actor);
    return { saved: "cpcatCreated" };
  });
}

export async function grantAccessAction(_prev: CategoryState, fd: FormData): Promise<CategoryState> {
  return run(async ({ actor }) => {
    const categoryId = text(fd, "id");
    const userId = text(fd, "userId");
    if (!isUuid(categoryId) || !userId) return { error: a("cpcatErrBad", await getAdminLocale()) };
    await grantCategoryAccess(getDb(), categoryId, userId, actor);
    return { saved: "cpcatAccessGranted" };
  });
}

export async function revokeAccessAction(_prev: CategoryState, fd: FormData): Promise<CategoryState> {
  return run(async ({ actor }) => {
    const categoryId = text(fd, "id");
    const userId = text(fd, "userId");
    if (!isUuid(categoryId) || !userId) return { error: a("cpcatErrBad", await getAdminLocale()) };
    await revokeCategoryAccess(getDb(), categoryId, userId, actor);
    return { saved: "cpcatAccessRevoked" };
  });
}
