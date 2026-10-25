"use server";

/**
 * Complaint staff actions: the buttons and forms of the complaints panel on the
 * case page. Each starts with `requireStaff` for the inbox roles and builds the
 * engine actor for the case; the library functions check the role AND the
 * restricted-category access list again on every call (a refused case is
 * reported as not found), so none of these trusts the form. Errors come back
 * as messages in the staff member's language; nothing personal is put in them.
 */

import { revalidatePath } from "next/cache";
import { getAdminLocale } from "@/lib/admin/locale";
import { isUuid } from "@/lib/admin/content/form-state";
import { requireStaff } from "@/lib/auth/session";
import { CASE_INBOX_ROLES } from "@/lib/cases/access";
import { transition } from "@/lib/cases/engine";
import { staffActorForCase } from "@/lib/cases/staff";
import { CaseError, type StaffActor } from "@/lib/cases/types";
import { ComplaintError } from "@/lib/complaints/errors";
import { readComplaintText, readEvidence, type ComplaintText, type EvidenceItem } from "@/lib/complaints/details";
import { notifyComplainant, type NoticeOutcome } from "@/lib/complaints/notify";
import { acknowledgeComplaint, closeComplaint, recategoriseComplaint, reopenComplaint, resolveComplaint, routeToWellbeing, startComplaint } from "@/lib/complaints/workflow";
import { PiiUnavailableError } from "@/lib/crypto/pii";
import { getDb } from "@/lib/db";
import { a, type AdminKey } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { getStorage } from "@/lib/storage";

/** What every form here returns. */
export interface CpState {
  error?: string;
  saved?: AdminKey;
  /** What happened when the person was told by email, or the reminder to do it by hand. */
  notice?: NoticeOutcome & { kind: "acknowledged" | "resolved" };
  /** Decrypted for this response only; the client clears it on "Hide". */
  text?: ComplaintText | null;
  evidence?: EvidenceItem[];
  /** Set when the action moved the complaint out of this person's sight. */
  leftSight?: boolean;
  /** What was typed, so a failed save keeps it. */
  values?: Record<string, string>;
}

const text = (fd: FormData, name: string): string => {
  const v = fd.get(name);
  return typeof v === "string" ? v : "";
};

function messageFor(error: unknown, locale: Locale): string {
  if (error instanceof PiiUnavailableError) return a("errCaseUnavailable", locale);
  if (error instanceof ComplaintError) {
    switch (error.code) {
      case "needs_confirm":
        return a("errCpConfirm", locale);
      case "window_closed":
      case "already":
        return a("errCaseTransition", locale);
      case "invalid":
        return a("errCpInvalid", locale);
    }
  }
  if (error instanceof CaseError) {
    switch (error.code) {
      case "stale":
        return a("errCaseStale", locale);
      case "invalid_transition":
      case "pii_deleted":
        return a("errCaseTransition", locale);
      case "forbidden":
        return a("errCaseForbidden", locale);
      case "not_found":
        return a("errCaseNotFound", locale);
      case "invalid":
        return a("errCpInvalid", locale);
    }
  }
  throw error;
}

interface Ctx {
  locale: Locale;
  caseId: string;
  actor: StaffActor;
}

async function onCase(fd: FormData, keep: string[], work: (ctx: Ctx) => Promise<CpState>): Promise<CpState> {
  const locale = await getAdminLocale();
  const staff = await requireStaff(CASE_INBOX_ROLES);
  const caseId = text(fd, "caseId");
  const values = Object.fromEntries(keep.map((k) => [k, text(fd, k)]));
  try {
    if (!isUuid(caseId)) throw new CaseError("not_found", "Case not found.");
    const org = Number(text(fd, "org"));
    const actor = await staffActorForCase(getDb(), staff, caseId, Number.isInteger(org) && org > 0 ? org : null);
    const state = await work({ locale, caseId, actor });
    revalidatePath(`/admin/cases/${caseId}`);
    revalidatePath("/admin/cases");
    return state;
  } catch (error) {
    return { error: messageFor(error, locale), values };
  }
}

/* Logged reads */

export async function revealTextAction(_prev: CpState, fd: FormData): Promise<CpState> {
  return onCase(fd, [], async ({ caseId, actor }) => ({ text: await readComplaintText(getDb(), caseId, actor) }));
}

export async function revealEvidenceAction(_prev: CpState, fd: FormData): Promise<CpState> {
  return onCase(fd, [], async ({ caseId, actor }) => ({ evidence: await readEvidence(getDb(), caseId, actor, getStorage) }));
}

/* Workflow */

export async function acknowledgeAction(_prev: CpState, fd: FormData): Promise<CpState> {
  return onCase(fd, ["th", "en"], async ({ caseId, actor }) => {
    const db = getDb();
    await acknowledgeComplaint(db, caseId, { message: { th: text(fd, "th"), en: text(fd, "en") } }, actor);
    const notice = await notifyComplainant(db, caseId, "acknowledged", actor);
    return { saved: "cpcSavedAcknowledged", notice: { ...notice, kind: "acknowledged" } };
  });
}

export async function startAction(_prev: CpState, fd: FormData): Promise<CpState> {
  return onCase(fd, [], async ({ caseId, actor }) => {
    await startComplaint(getDb(), caseId, actor);
    return { saved: "cpcSavedStarted" };
  });
}

export async function resolveAction(_prev: CpState, fd: FormData): Promise<CpState> {
  return onCase(fd, ["th", "en"], async ({ locale, caseId, actor }) => {
    const th = text(fd, "th");
    const en = text(fd, "en");
    if (!th.trim() && !en.trim()) return { error: a("errCpOutcomeRequired", locale), values: { th, en } };
    const db = getDb();
    await resolveComplaint(db, caseId, { outcome: { th, en } }, actor);
    const notice = await notifyComplainant(db, caseId, "resolved", actor);
    return { saved: "cpcSavedResolved", notice: { ...notice, kind: "resolved" } };
  });
}

export async function closeAction(_prev: CpState, fd: FormData): Promise<CpState> {
  return onCase(fd, [], async ({ caseId, actor }) => {
    await closeComplaint(getDb(), caseId, actor);
    return { saved: "cpcSavedClosed" };
  });
}

export async function reopenAction(_prev: CpState, fd: FormData): Promise<CpState> {
  return onCase(fd, [], async ({ caseId, actor }) => {
    await reopenComplaint(getDb(), caseId, {}, actor);
    return { saved: "cpcSavedReopened" };
  });
}

export async function withdrawAction(_prev: CpState, fd: FormData): Promise<CpState> {
  return onCase(fd, [], async ({ caseId, actor }) => {
    await transition(getDb(), caseId, "withdrawn", actor, { expectedFrom: text(fd, "from") || undefined });
    return { saved: "cpcSavedWithdrawn" };
  });
}

export async function recategoriseAction(_prev: CpState, fd: FormData): Promise<CpState> {
  return onCase(fd, ["category"], async ({ locale, caseId, actor }) => {
    const categoryId = text(fd, "category");
    if (!isUuid(categoryId)) return { error: a("errCpInvalid", locale), values: { category: categoryId } };
    const result = await recategoriseComplaint(getDb(), caseId, categoryId, actor, { confirmUnrestrict: text(fd, "confirm") === "yes" });
    return { saved: "cpcSavedRecategorised", leftSight: !result.stillVisible };
  });
}

export async function wellbeingAction(_prev: CpState, fd: FormData): Promise<CpState> {
  return onCase(fd, [], async ({ caseId, actor }) => {
    await routeToWellbeing(getDb(), caseId, actor);
    return { saved: "cpcSavedWellbeing" };
  });
}
