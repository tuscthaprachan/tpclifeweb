"use server";

/**
 * Equipment loan staff actions: the forms of the borrowing panel on the case
 * page. Each starts with `requireStaff` for the borrowing roles and builds the
 * engine actor for the case; the library functions check the role again on
 * every call, so none of these trusts the form. A step is committed first and
 * the borrower is emailed after, so a mail problem never undoes it. Errors come
 * back as messages in the staff member's language, beside the field they
 * belong to; nothing personal is put in them.
 */

import { inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAdminLocale } from "@/lib/admin/locale";
import { isUuid } from "@/lib/admin/content/form-state";
import { requireStaff } from "@/lib/auth/session";
import { SERVICES } from "@/lib/cases/services";
import { staffActorForCase } from "@/lib/cases/staff";
import { CaseError, type StaffActor } from "@/lib/cases/types";
import { BorrowingError } from "@/lib/borrowing/errors";
import { notifyBorrower, type NoticeOutcome } from "@/lib/borrowing/notify";
import {
  approveLoan,
  cancelByStaff,
  declineLoan,
  LoanInputError,
  markNotCollected,
  recordHandover,
  recordReturn,
  revealBorrowerDetails,
  settleLoan,
  type BorrowerDetails,
  type LoanField,
  type ReturnLineInput,
} from "@/lib/borrowing/workflow";
import { PiiUnavailableError } from "@/lib/crypto/pii";
import { getDb } from "@/lib/db";
import { DEPOSIT_KINDS, equipmentItems, type DepositKind } from "@/lib/db/schema/borrowing";
import { a, type AdminKey } from "@/lib/i18n/admin";
import { pick, type Locale } from "@/lib/i18n/config";

/** What every form here returns. */
export interface BrState {
  /** A problem that is not about one field. */
  error?: string;
  /** Field name to message. */
  errors?: Partial<Record<LoanField, string>>;
  saved?: AdminKey;
  /** What happened when the borrower was told by email, or the reminder to do it by hand. */
  notice?: NoticeOutcome & { kind: "approved" | "declined" };
  /** Decrypted for this response only; the client clears it on "Hide". */
  details?: BorrowerDetails | null;
  /** What was typed, so a failed save keeps it. */
  values?: Record<string, string>;
}

const text = (fd: FormData, name: string): string => {
  const v = fd.get(name);
  return typeof v === "string" ? v : "";
};

const FIELD_MESSAGE: Record<LoanField, AdminKey> = {
  quantities: "brErrQuantities",
  reason: "brErrReason",
  checked: "brErrChecked",
  deposit: "brErrDeposit",
  counts: "brErrCounts",
  compensation: "brErrCompensation",
  settlement: "brErrSettlement",
  note: "brErrNote",
};

async function shortfallMessage(error: BorrowingError, locale: Locale): Promise<string> {
  const shortfalls = error.detail.shortfalls ?? [];
  const items = shortfalls.length ? await getDb().select({ id: equipmentItems.id, th: equipmentItems.nameTh, en: equipmentItems.nameEn }).from(equipmentItems).where(inArray(equipmentItems.id, shortfalls.map((s) => s.itemId))) : [];
  const name = (id: string) => {
    const item = items.find((i) => i.id === id);
    return item ? pick({ th: item.th, en: item.en }, locale) : "";
  };
  return a("brErrUnavailable", locale, { items: shortfalls.map((s) => a("brErrUnavailableItem", locale, { name: name(s.itemId), asked: s.requested, free: s.available })).join(", ") });
}

async function stateFor(error: unknown, locale: Locale): Promise<BrState> {
  if (error instanceof PiiUnavailableError) return { error: a("errCaseUnavailable", locale) };
  if (error instanceof LoanInputError) return { errors: { [error.field]: a(FIELD_MESSAGE[error.field], locale) } };
  if (error instanceof BorrowingError) {
    if (error.code === "unavailable") return { error: await shortfallMessage(error, locale) };
    return { error: a("brErrInvalid", locale) };
  }
  if (error instanceof CaseError) {
    switch (error.code) {
      case "stale":
        return { error: a("errCaseStale", locale) };
      case "invalid_transition":
      case "pii_deleted":
        return { error: a("brErrTransition", locale) };
      case "forbidden":
        return { error: a("errCaseForbidden", locale) };
      case "not_found":
        return { error: a("errCaseNotFound", locale) };
      case "invalid":
        return { error: a("brErrInvalid", locale) };
    }
  }
  throw error;
}

interface Ctx {
  locale: Locale;
  caseId: string;
  actor: StaffActor;
}

async function onCase(fd: FormData, keep: string[], work: (ctx: Ctx) => Promise<BrState>): Promise<BrState> {
  const locale = await getAdminLocale();
  const staff = await requireStaff([...SERVICES.borrowing.roles]);
  const caseId = text(fd, "caseId");
  const values = Object.fromEntries(keep.map((k) => [k, text(fd, k)]));
  try {
    if (!isUuid(caseId)) throw new CaseError("not_found", "Case not found.");
    const org = Number(text(fd, "org"));
    const actor = await staffActorForCase(getDb(), staff, caseId, Number.isInteger(org) && org > 0 ? org : null);
    const state = await work({ locale, caseId, actor });
    revalidatePath(`/admin/cases/${caseId}`);
    revalidatePath("/admin/cases");
    revalidatePath("/admin/borrowing");
    return state;
  } catch (error) {
    return { ...(await stateFor(error, locale)), values };
  }
}

/** Every posted `<prefix><lineId>` as a number, so a blank box counts as 0 and a stray letter fails the sum. */
function perLine(fd: FormData, prefix: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, value] of fd.entries()) {
    if (key.startsWith(prefix) && typeof value === "string") out[key.slice(prefix.length)] = value.trim() === "" ? 0 : Number(value);
  }
  return out;
}

/* Logged read */

export async function revealDetailsAction(_prev: BrState, fd: FormData): Promise<BrState> {
  return onCase(fd, [], async ({ caseId, actor }) => ({ details: await revealBorrowerDetails(getDb(), caseId, actor) }));
}

/* Workflow */

export async function approveAction(_prev: BrState, fd: FormData): Promise<BrState> {
  const kept = [...fd.keys()].filter((k) => k.startsWith("q_") || k === "th" || k === "en");
  return onCase(fd, kept, async ({ caseId, actor }) => {
    const quantities: Record<string, number> = {};
    for (const [lineId, value] of Object.entries(perLine(fd, "q_"))) if (text(fd, `q_${lineId}`).trim() !== "") quantities[lineId] = value;
    const note = { th: text(fd, "th"), en: text(fd, "en") };
    const db = getDb();
    await approveLoan(db, caseId, actor, { quantities, note });
    const notice = await notifyBorrower(db, caseId, "approved", actor);
    return { saved: "brSavedApproved", notice: { ...notice, kind: "approved" } };
  });
}

export async function declineAction(_prev: BrState, fd: FormData): Promise<BrState> {
  return onCase(fd, ["th", "en"], async ({ caseId, actor }) => {
    const reason = { th: text(fd, "th"), en: text(fd, "en") };
    const db = getDb();
    await declineLoan(db, caseId, { reason }, actor);
    const notice = await notifyBorrower(db, caseId, "declined", actor, { reason });
    return { saved: "brSavedDeclined", notice: { ...notice, kind: "declined" } };
  });
}

export async function handoverAction(_prev: BrState, fd: FormData): Promise<BrState> {
  return onCase(fd, ["depositKind", "depositCount", "note"], async ({ caseId, actor }) => {
    const kind = DEPOSIT_KINDS.find((k) => k === text(fd, "depositKind")) as DepositKind | undefined;
    const count = text(fd, "depositCount").trim();
    await recordHandover(getDb(), caseId, actor, {
      checked: text(fd, "checked") === "yes",
      depositKind: kind as DepositKind,
      depositCount: count === "" ? Number.NaN : Number(count),
      note: text(fd, "note"),
    });
    return { saved: "brSavedHandover" };
  });
}

export async function returnAction(_prev: BrState, fd: FormData): Promise<BrState> {
  const kept = [...fd.keys()].filter((k) => /^[gdl]_/.test(k) || ["compensationBaht", "compensationNote", "note"].includes(k));
  return onCase(fd, kept, async ({ locale, caseId, actor }) => {
    const good = perLine(fd, "g_");
    const damaged = perLine(fd, "d_");
    const lost = perLine(fd, "l_");
    const lines: Record<string, ReturnLineInput> = {};
    for (const id of Object.keys(good)) lines[id] = { good: good[id]!, damaged: damaged[id] ?? 0, lost: lost[id] ?? 0 };
    const problem = Object.values(lines).some((l) => l.damaged + l.lost > 0);
    const baht = text(fd, "compensationBaht").trim();
    try {
      await recordReturn(getDb(), caseId, actor, {
        lines,
        depositReturned: text(fd, "depositReturned") === "yes",
        compensationBaht: baht === "" ? null : Number(baht),
        compensationNote: text(fd, "compensationNote"),
        takeOutOfService: text(fd, "takeOutOfService") === "yes",
        note: text(fd, "note"),
      });
    } catch (error) {
      if (error instanceof LoanInputError && error.field === "compensation" && !problem) return { errors: { compensation: a("brErrCompensationNone", locale) } };
      throw error;
    }
    return { saved: "brSavedReturn" };
  });
}

export async function settleAction(_prev: BrState, fd: FormData): Promise<BrState> {
  return onCase(fd, ["settlement", "note"], async ({ caseId, actor }) => {
    await settleLoan(getDb(), caseId, actor, {
      settlement: text(fd, "settlement") as "paid" | "replaced" | "waived",
      note: text(fd, "note"),
      depositReturned: text(fd, "depositReturned") === "yes",
    });
    return { saved: "brSavedSettled" };
  });
}

export async function notCollectedAction(_prev: BrState, fd: FormData): Promise<BrState> {
  return onCase(fd, [], async ({ caseId, actor }) => {
    await markNotCollected(getDb(), caseId, actor);
    return { saved: "brSavedNotCollected" };
  });
}

export async function cancelAction(_prev: BrState, fd: FormData): Promise<BrState> {
  return onCase(fd, ["th", "en"], async ({ caseId, actor }) => {
    await cancelByStaff(getDb(), caseId, actor, { reason: { th: text(fd, "th"), en: text(fd, "en") } });
    return { saved: "brSavedCancelled" };
  });
}
