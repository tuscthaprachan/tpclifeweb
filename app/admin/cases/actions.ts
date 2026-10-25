"use server";

/**
 * Case inbox actions. Each one starts with `requireStaff` for the inbox roles
 * and then lets the engine decide: the engine checks the person's role for
 * the case's service on every call, so these never trust the form.
 */

import { revalidatePath } from "next/cache";
import { getAdminLocale } from "@/lib/admin/locale";
import { CASE_INBOX_ROLES } from "@/lib/cases/access";
import { addNote, addPublicUpdate, assign, transition } from "@/lib/cases/engine";
import { readContacts, type Contact } from "@/lib/cases/contacts";
import { staffActorForCase } from "@/lib/cases/staff";
import { CaseError } from "@/lib/cases/types";
import { eq } from "drizzle-orm";
import { requireStaff } from "@/lib/auth/session";
import { redactContactsForHandler } from "@/lib/complaints/redact";
import { cases } from "@/lib/db/schema/cases";
import { PiiUnavailableError } from "@/lib/crypto/pii";
import { getDb } from "@/lib/db";
import { a, type AdminKey } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";

export interface CaseFormState {
  error?: string;
  /** Set after a successful save; the form shows it and clears. */
  saved?: AdminKey;
  /** What was typed, so a failed save keeps it. */
  values?: Record<string, string>;
}

function text(formData: FormData, name: string): string {
  const v = formData.get(name);
  return typeof v === "string" ? v : "";
}

function errorMessage(error: unknown, locale: Locale): string {
  if (error instanceof PiiUnavailableError) return a("errCaseUnavailable", locale);
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
        return error.message.includes("cannot work") ? a("errCaseAssignee", locale) : a("errCaseTooLong", locale);
    }
  }
  throw error;
}

async function run(
  formData: FormData,
  keep: string[],
  work: (ctx: { locale: Locale; caseId: string; actor: Awaited<ReturnType<typeof staffActorForCase>> }) => Promise<AdminKey | { error: string }>,
): Promise<CaseFormState> {
  const locale = await getAdminLocale();
  const staff = await requireStaff(CASE_INBOX_ROLES);
  const caseId = text(formData, "caseId");
  const values = Object.fromEntries(keep.map((k) => [k, text(formData, k)]));
  try {
    const orgRaw = Number(text(formData, "org"));
    const actor = await staffActorForCase(getDb(), staff, caseId, Number.isInteger(orgRaw) && orgRaw > 0 ? orgRaw : null);
    const done = await work({ locale, caseId, actor });
    if (typeof done !== "string") return { error: done.error, values };
    revalidatePath(`/admin/cases/${caseId}`);
    revalidatePath("/admin/cases");
    return { saved: done };
  } catch (error) {
    return { error: errorMessage(error, locale), values };
  }
}

export async function changeStatusAction(_prev: CaseFormState, formData: FormData): Promise<CaseFormState> {
  return run(formData, ["status"], async ({ locale, caseId, actor }) => {
    const to = text(formData, "status");
    if (!to) return { error: a("errCaseStatusRequired", locale) };
    // Complaints have their own actions (resolve needs an outcome, reopen restarts a target); a posted form must not bypass them.
    const [row] = await getDb().select({ service: cases.service }).from(cases).where(eq(cases.id, caseId));
    if (row?.service === "complaint") return { error: a("errCaseUseComplaintActions", locale) };
    await transition(getDb(), caseId, to, actor, { expectedFrom: text(formData, "from") || undefined });
    return "caseSavedStatus";
  });
}

export async function addNoteAction(_prev: CaseFormState, formData: FormData): Promise<CaseFormState> {
  return run(formData, ["note"], async ({ locale, caseId, actor }) => {
    const note = text(formData, "note");
    if (!note.trim()) return { error: a("errCaseNoteRequired", locale) };
    await addNote(getDb(), caseId, note, actor);
    return "caseSavedNote";
  });
}

export async function addUpdateAction(_prev: CaseFormState, formData: FormData): Promise<CaseFormState> {
  return run(formData, ["th", "en"], async ({ locale, caseId, actor }) => {
    const th = text(formData, "th");
    const en = text(formData, "en");
    if (!th.trim() && !en.trim()) return { error: a("errCaseUpdateEmpty", locale) };
    await addPublicUpdate(getDb(), caseId, { th, en }, actor);
    return "caseSavedUpdate";
  });
}

export async function assignAction(_prev: CaseFormState, formData: FormData): Promise<CaseFormState> {
  return run(formData, ["assignee"], async ({ caseId, actor }) => {
    const raw = text(formData, "assignee");
    await assign(getDb(), caseId, raw === "" ? null : raw === "me" ? actor.userId : raw, actor);
    return "caseSavedAssign";
  });
}

export interface RevealState {
  error?: string;
  /** Decrypted for this request only; the client clears it on "Hide". */
  contacts?: Array<Omit<Contact, "createdAt">>;
}

/** Decrypts the case's contacts for the person who asked. The engine records the view before this returns. */
export async function revealContactsAction(_prev: RevealState, formData: FormData): Promise<RevealState> {
  const locale = await getAdminLocale();
  const staff = await requireStaff(CASE_INBOX_ROLES);
  const caseId = text(formData, "caseId");
  try {
    const actor = await staffActorForCase(getDb(), staff, caseId, Number(text(formData, "org")) || null);
    const contacts = await redactContactsForHandler(getDb(), caseId, actor.roles, await readContacts(getDb(), caseId, actor));
    revalidatePath(`/admin/cases/${caseId}`);
    return { contacts: contacts.map(({ createdAt: _createdAt, ...rest }) => (void _createdAt, rest)) };
  } catch (error) {
    return { error: errorMessage(error, locale) };
  }
}
