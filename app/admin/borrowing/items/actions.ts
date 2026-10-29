"use server";

/**
 * Inventory admin actions. Equipment officer or administrator only: each starts
 * with `requireStaff` and inventory.ts checks the role again. Numbers arrive as
 * text and are parsed here; anything that is not a whole number is refused by
 * the validation, beside its field.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminLocale } from "@/lib/admin/locale";
import { isUuid } from "@/lib/admin/content/form-state";
import { requireStaff } from "@/lib/auth/session";
import { staffActorFor } from "@/lib/cases/staff";
import { CaseError } from "@/lib/cases/types";
import { getDb } from "@/lib/db";
import { a, type AdminKey } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { createItem, InventoryError, updateCategory, updateItem, type CategoryInput, type ItemInput } from "./inventory";

export interface InvState {
  error?: string;
  /** Field name to message. */
  errors?: Record<string, string>;
  saved?: AdminKey;
  /** What was typed, so a failed save keeps it. */
  values?: Record<string, string>;
}

const text = (fd: FormData, name: string): string => {
  const v = fd.get(name);
  return typeof v === "string" ? v : "";
};

/** Blank is "no cap"; anything else is parsed and checked by the validation. */
const optionalNumber = (fd: FormData, name: string): number | null => {
  const v = text(fd, name).trim();
  return v === "" ? null : Number(v);
};

const number = (fd: FormData, name: string): number => {
  const v = text(fd, name).trim();
  return v === "" ? Number.NaN : Number(v);
};

function fail(error: unknown, locale: Locale, values: Record<string, string>): InvState {
  if (error instanceof InventoryError) {
    switch (error.code) {
      case "forbidden":
        return { error: a("errCaseForbidden", locale), values };
      case "not_found":
        return { error: a("brInvErrNotFound", locale), values };
      case "conflict":
        return { errors: { slug: a("brInvErrSlugTaken", locale) }, values };
      case "invalid": {
        const field = error.field ?? "form";
        const key = `brInvErr_${field}` as AdminKey;
        return { errors: { [field]: a(key, locale) }, values };
      }
    }
  }
  if (error instanceof CaseError && error.code === "forbidden") return { error: a("errCaseForbidden", locale), values };
  throw error;
}

function categoryInput(fd: FormData): CategoryInput {
  return {
    nameTh: text(fd, "nameTh"),
    nameEn: text(fd, "nameEn"),
    hintTh: text(fd, "hintTh"),
    hintEn: text(fd, "hintEn"),
    noticeWorkingDays: number(fd, "noticeWorkingDays"),
    maxPerRequest: optionalNumber(fd, "maxPerRequest"),
    depositCards: number(fd, "depositCards"),
    termsTh: text(fd, "termsTh"),
    termsEn: text(fd, "termsEn"),
    position: number(fd, "position"),
    active: text(fd, "active") === "yes",
  };
}

function itemInput(fd: FormData): ItemInput {
  return {
    categoryId: text(fd, "categoryId"),
    nameTh: text(fd, "nameTh"),
    nameEn: text(fd, "nameEn"),
    hintTh: text(fd, "hintTh"),
    hintEn: text(fd, "hintEn"),
    unitTh: text(fd, "unitTh"),
    unitEn: text(fd, "unitEn"),
    totalQuantity: number(fd, "totalQuantity"),
    outOfService: number(fd, "outOfService"),
    maxPerRequest: optionalNumber(fd, "maxPerRequest"),
    position: number(fd, "position"),
    active: text(fd, "active") === "yes",
  };
}

const KEEP = ["nameTh", "nameEn", "hintTh", "hintEn", "noticeWorkingDays", "maxPerRequest", "depositCards", "termsTh", "termsEn", "position", "unitTh", "unitEn", "totalQuantity", "outOfService", "categoryId", "slug"];

async function run(fd: FormData, work: (ctx: { actor: Awaited<ReturnType<typeof staffActorFor>>; locale: Locale }) => Promise<InvState>): Promise<InvState> {
  const locale = await getAdminLocale();
  const staff = await requireStaff(["equipment_officer", "admin"]);
  const values = Object.fromEntries(KEEP.map((k) => [k, text(fd, k)]));
  try {
    const actor = await staffActorFor(staff, "borrowing");
    const state = await work({ actor, locale });
    revalidatePath("/admin/borrowing/items");
    return state;
  } catch (error) {
    return fail(error, locale, values);
  }
}

export async function updateCategoryAction(_prev: InvState, fd: FormData): Promise<InvState> {
  return run(fd, async ({ actor, locale }) => {
    const id = text(fd, "id");
    if (!isUuid(id)) return { error: a("brInvErrNotFound", locale) };
    await updateCategory(getDb(), id, categoryInput(fd), actor);
    return { saved: "brInvSavedCategory" };
  });
}

export async function updateItemAction(_prev: InvState, fd: FormData): Promise<InvState> {
  return run(fd, async ({ actor, locale }) => {
    const id = text(fd, "id");
    if (!isUuid(id)) return { error: a("brInvErrNotFound", locale) };
    await updateItem(getDb(), id, itemInput(fd), actor);
    revalidatePath(`/admin/borrowing/items/${id}`);
    return { saved: "brInvSavedItem" };
  });
}

export async function createItemAction(_prev: InvState, fd: FormData): Promise<InvState> {
  const state = await run(fd, async ({ actor }) => {
    await createItem(getDb(), text(fd, "slug").trim(), itemInput(fd), actor);
    return { saved: "brInvSavedItem" as AdminKey };
  });
  if (state.saved) redirect("/admin/borrowing/items?added=1");
  return state;
}
