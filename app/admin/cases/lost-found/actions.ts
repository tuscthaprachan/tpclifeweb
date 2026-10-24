"use server";

/**
 * Lost and found staff actions: panel buttons on the case page and the desk
 * intake. Each starts with `requireStaff` for the inbox roles and builds the
 * engine actor for the case's service; the library functions check the role
 * again on every call, so none of these trusts the form. Errors come back as
 * messages in the staff member's language; nothing personal is put in them.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminLocale } from "@/lib/admin/locale";
import { isUuid } from "@/lib/admin/content/form-state";
import { uploadContentImage } from "@/lib/admin/content/images";
import { requireStaff } from "@/lib/auth/session";
import { CASE_INBOX_ROLES } from "@/lib/cases/access";
import { addContact } from "@/lib/cases/contacts";
import { staffActorFor, staffActorForCase } from "@/lib/cases/staff";
import { CaseError, type StaffActor } from "@/lib/cases/types";
import { PiiUnavailableError } from "@/lib/crypto/pii";
import { getDb } from "@/lib/db";
import { a, type AdminKey } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { categoryLabel } from "@/components/domain/lostfound/categoryLabel";
import { createClaim, decideClaim, readClaimAnswer } from "@/lib/lost-found/claims";
import { readVerificationDetail, saveStorageLocation, saveVerificationDetail } from "@/lib/lost-found/details";
import { parseClaim, parseContactFields, parseDescription, parseHandover, parseRejection, parseStorage, parseVerification, parseWalkIn } from "@/lib/lost-found/forms";
import { recordHandover } from "@/lib/lost-found/handover";
import { logFoundItem, logWalkInLostReport, publishFoundItem, updateItemDescription } from "@/lib/lost-found/intake";
import { markPossibleMatch } from "@/lib/lost-found/links";
import { appendListingPhoto, contentActorOf, expireListing, getListingForCase, ListingIncompleteError, publishListingForCase } from "@/lib/lost-found/listing";
import { notifyLostReporter, type NoticeKind, type ReminderReason } from "@/lib/lost-found/notify";
import { addPrivatePhoto } from "@/lib/lost-found/photos";
import { readIdentifyingDetail } from "@/lib/lost-found/identifying";
import { getStorage } from "@/lib/storage";
import type { CasePreferredContact } from "@/lib/db/schema/cases";

/** What every form here returns. `errors` are keyed by posted field name. */
export interface LfState {
  error?: string;
  errors?: Record<string, string>;
  saved?: AdminKey;
  /** What happened when the person was told (possible match, ready to collect, returned). */
  notice?: { result: "sent" | "remind"; reason?: ReminderReason; preferred?: CasePreferredContact | null };
  /** The text of a decrypted field, for this response only. */
  secret?: string | null;
}

const text = (fd: FormData, name: string): string => {
  const v = fd.get(name);
  return typeof v === "string" ? v : "";
};

function messageFor(error: unknown, locale: Locale): string {
  if (error instanceof PiiUnavailableError) return a("errCaseUnavailable", locale);
  if (error instanceof ListingIncompleteError) return a("lfcErrListingIncomplete", locale);
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
        return a("lfcErrInvalid", locale);
    }
  }
  throw error;
}

interface Ctx {
  locale: Locale;
  caseId: string;
  actor: StaffActor;
}

/** Runs an action against an existing case as the signed-in member of staff. */
async function onCase(fd: FormData, work: (ctx: Ctx) => Promise<LfState>, field = "caseId"): Promise<LfState> {
  const locale = await getAdminLocale();
  const staff = await requireStaff(CASE_INBOX_ROLES);
  const caseId = text(fd, field);
  try {
    if (!isUuid(caseId)) throw new CaseError("not_found", "Case not found.");
    const org = Number(text(fd, "org"));
    const actor = await staffActorForCase(getDb(), staff, caseId, Number.isInteger(org) && org > 0 ? org : null);
    const state = await work({ locale, caseId, actor });
    revalidatePath(`/admin/cases/${caseId}`);
    revalidatePath("/admin/cases");
    return state;
  } catch (error) {
    return { error: messageFor(error, locale) };
  }
}

/** The ids a panel action may also touch (the other case in a pair), refreshed after the change. */
function refresh(...ids: Array<string | null | undefined>) {
  for (const id of ids) if (id) revalidatePath(`/admin/cases/${id}`);
}

/* Listing */

export async function updateListingAction(_prev: LfState, fd: FormData): Promise<LfState> {
  return onCase(fd, async ({ locale, caseId, actor }) => {
    const parsed = parseDescription(fd, locale);
    if (!parsed.ok) return { errors: parsed.errors };
    await updateItemDescription(getDb(), caseId, parsed.data, actor);
    return { saved: "lfcSavedListing" };
  });
}

/** Approves and publishes the listing of a lost report (or re-publishes a found item's). */
export async function publishListingAction(_prev: LfState, fd: FormData): Promise<LfState> {
  return onCase(fd, async ({ caseId, actor }) => {
    const db = getDb();
    await db.transaction((tx) => publishListingForCase(tx, caseId, contentActorOf(actor), new Date()));
    await expireListing(db, caseId);
    return { saved: "lfcSavedPublished" };
  });
}

/** "Publish to the public list": the case moves to listed and the listing goes live. */
export async function publishFoundAction(_prev: LfState, fd: FormData): Promise<LfState> {
  const done = await onCase(fd, async ({ caseId, actor }) => {
    await publishFoundItem(getDb(), caseId, actor);
    return { saved: "lfcSavedPublished" };
  });
  if (done.saved && text(fd, "next") === "case") redirect(`/admin/cases/${text(fd, "caseId")}`);
  return done;
}

/* Matching */

async function tell(db: ReturnType<typeof getDb>, lostCaseId: string, kind: NoticeKind, actor: StaffActor, deskOrganisationId: number | null): Promise<LfState["notice"]> {
  const outcome = await notifyLostReporter(db, lostCaseId, kind, actor, { deskOrganisationId });
  return outcome.result === "sent" ? { result: "sent" } : { result: "remind", reason: outcome.reason, preferred: outcome.preferred };
}

export async function markMatchAction(_prev: LfState, fd: FormData): Promise<LfState> {
  return onCase(fd, async ({ caseId, actor }) => {
    const lostCaseId = text(fd, "lostCaseId");
    const foundCaseId = text(fd, "foundCaseId");
    if (!isUuid(lostCaseId) || !isUuid(foundCaseId)) throw new CaseError("not_found", "Case not found.");
    const db = getDb();
    await markPossibleMatch(db, { lostCaseId, foundCaseId, score: Number(text(fd, "score")) || null }, actor);
    refresh(lostCaseId, foundCaseId, caseId);
    const notice = await tell(db, lostCaseId, "possible_match", actor, actor.organisationId);
    return { saved: "lfcSavedMatch", notice };
  });
}

/* Hidden detail, photos, storage */

export async function saveStorageAction(_prev: LfState, fd: FormData): Promise<LfState> {
  return onCase(fd, async ({ locale, caseId, actor }) => {
    const parsed = parseStorage(fd, locale);
    if (!parsed.ok) return { errors: parsed.errors };
    await saveStorageLocation(getDb(), caseId, parsed.data, actor);
    await expireListing(getDb(), caseId);
    return { saved: "lfcSavedStorage" };
  });
}

export async function saveVerificationAction(_prev: LfState, fd: FormData): Promise<LfState> {
  return onCase(fd, async ({ locale, caseId, actor }) => {
    const parsed = parseVerification(fd, locale);
    if (!parsed.ok) return { errors: parsed.errors };
    await saveVerificationDetail(getDb(), caseId, parsed.data.detail, actor);
    return { saved: "lfcSavedVerification" };
  });
}

/** Decrypts the hidden detail for this response. The view is logged before it is returned. */
export async function revealVerificationAction(_prev: LfState, fd: FormData): Promise<LfState> {
  return onCase(fd, async ({ caseId, actor }) => {
    const detail = await readVerificationDetail(getDb(), caseId, actor);
    return { secret: detail ?? "" };
  });
}

/** Decrypts the detail a lost report's owner gave to identify the item. Logged. */
export async function revealIdentifyingAction(_prev: LfState, fd: FormData): Promise<LfState> {
  return onCase(fd, async ({ caseId, actor }) => {
    const detail = await readIdentifyingDetail(getDb(), caseId, actor);
    return { secret: detail ?? "" };
  });
}

/** Decrypts one claimant's answer for this response. Logged. */
export async function revealClaimAction(_prev: LfState, fd: FormData): Promise<LfState> {
  return onCase(fd, async ({ actor }) => {
    const answer = await readClaimAnswer(getDb(), text(fd, "claimId"), actor);
    return { secret: answer ?? "" };
  });
}

export async function addFinderAction(_prev: LfState, fd: FormData): Promise<LfState> {
  return onCase(fd, async ({ locale, caseId, actor }) => {
    const parsed = parseContactFields(fd, locale, "finder");
    if (!parsed.ok) return { errors: parsed.errors };
    const f = parsed.data;
    await addContact(getDb(), caseId, { role: "finder", name: f.name, email: f.email, phone: f.phone, lineId: f.lineId, preferredContact: f.preferredContact, consentContact: f.consentContact }, actor);
    return { saved: "lfcSavedFinder" };
  });
}

/**
 * One photo from the upload form (already compressed in the browser). Always
 * stored privately for the case; with "show on the public list" ticked it is
 * also added to the listing as a public image, described with the category and
 * title so no alt text has to be typed at the desk.
 */
export async function uploadPhotoAction(fd: FormData): Promise<LfState> {
  return onCase(fd, async ({ locale, caseId, actor }) => {
    const file = fd.get("file");
    if (!(file instanceof File) || file.size === 0) return { error: a("errUploadChoose", locale) };
    const db = getDb();
    const bytes = new Uint8Array(await file.arrayBuffer());
    const stored = await addPrivatePhoto(db, caseId, { bytes, declaredType: file.type }, actor, { storage: getStorage });
    if (!stored.ok) {
      const key: AdminKey =
        stored.reason === "too_large" ? "errUploadTooLarge" : stored.reason === "not_configured" ? "errStorageNotConfigured" : stored.reason === "too_many" ? "lfcErrTooManyPhotos" : stored.reason === "failed" ? "errUploadFailed" : "errUploadType";
      return { error: a(key, locale) };
    }
    if (text(fd, "publicToo") === "on") {
      const listing = await getListingForCase(db, caseId);
      if (listing) {
        const alt = {
          th: `${categoryLabel(listing.category, "th")}: ${listing.title.th || listing.title.en}`,
          en: `${categoryLabel(listing.category, "en")}: ${listing.title.en || listing.title.th}`,
        };
        const uploaded = await uploadContentImage({ file, altTh: alt.th, altEn: alt.en, isDecorative: false, actor: contentActorOf(actor), locale });
        if (!uploaded.ok) return { error: uploaded.error };
        await appendListingPhoto(db, listing.id, uploaded.image.id);
        await expireListing(db, caseId);
      }
    }
    return { saved: "lfcSavedPhoto" };
  });
}

/* Claims */

export async function addClaimAction(_prev: LfState, fd: FormData): Promise<LfState> {
  return onCase(fd, async ({ locale, caseId, actor }) => {
    const parsed = parseClaim(fd, locale);
    if (!parsed.ok) return { errors: parsed.errors };
    const c = parsed.data.claimant;
    await createClaim(getDb(), { foundCaseId: caseId, answer: parsed.data.answer, claimant: { name: c.name, email: c.email, phone: c.phone, lineId: c.lineId, preferredContact: c.preferredContact, consentContact: c.consentContact } }, actor);
    return { saved: "lfcSavedClaim" };
  });
}

async function deskOf(db: ReturnType<typeof getDb>, caseId: string): Promise<number | null> {
  const { getCaseDetails } = await import("@/lib/lost-found/details");
  return (await getCaseDetails(db, caseId)).storageOrganisationId;
}

export async function decideClaimAction(_prev: LfState, fd: FormData): Promise<LfState> {
  return onCase(fd, async ({ locale, caseId, actor }) => {
    const decision = text(fd, "decision") === "accepted" ? "accepted" : "rejected";
    const claimId = text(fd, "claimId");
    let message: { th: string; en: string } | undefined;
    if (decision === "rejected") {
      const parsed = parseRejection(fd, locale);
      if (!parsed.ok) return { errors: parsed.errors };
      message = parsed.data;
    }
    const db = getDb();
    const result = await decideClaim(db, { claimId, decision, message }, actor);
    refresh(result.lostCaseId, caseId);
    const notice = decision === "accepted" && result.lostCaseId ? await tell(db, result.lostCaseId, "ready_to_collect", actor, await deskOf(db, caseId)) : undefined;
    return { saved: decision === "accepted" ? "lfcSavedAccepted" : "lfcSavedRejected", notice };
  });
}

/* Handover */

export async function handoverAction(_prev: LfState, fd: FormData): Promise<LfState> {
  return onCase(fd, async ({ locale, caseId, actor }) => {
    const parsed = parseHandover(fd, locale);
    if (!parsed.ok) return { errors: parsed.errors };
    const db = getDb();
    const result = await recordHandover(db, { foundCaseId: caseId, ...parsed.data }, actor);
    refresh(result.lostCaseId, caseId);
    const notice = result.lostCaseId ? await tell(db, result.lostCaseId, "returned", actor, actor.organisationId) : undefined;
    return { saved: "lfcSavedHandover", notice };
  });
}

/* Intake */

async function intakeActor(fd: FormData) {
  const locale = await getAdminLocale();
  const staff = await requireStaff(CASE_INBOX_ROLES);
  const org = Number(text(fd, "org"));
  const actor = await staffActorFor(staff, "lost_found", Number.isInteger(org) && org > 0 ? org : null);
  return { locale, actor };
}

/** Task 1 of the found item task list: creates the case and its draft listing, then opens the task list. */
export async function startFoundAction(_prev: LfState, fd: FormData): Promise<LfState> {
  const { locale, actor } = await intakeActor(fd).catch(async (error) => {
    if (error instanceof CaseError) redirect("/admin/no-access");
    throw error;
  });
  const parsed = parseDescription(fd, locale);
  if (!parsed.ok) return { errors: parsed.errors };
  let caseId: string;
  try {
    ({ caseId } = await logFoundItem(getDb(), parsed.data, actor, { locale }));
  } catch (error) {
    return { error: messageFor(error, locale) };
  }
  revalidatePath("/admin/cases");
  redirect(`/admin/cases/new/found/${caseId}`);
}

/** Task 1 again: change what was entered. */
export async function describeFoundAction(_prev: LfState, fd: FormData): Promise<LfState> {
  const done = await onCase(fd, async ({ locale, caseId, actor }) => {
    const parsed = parseDescription(fd, locale);
    if (!parsed.ok) return { errors: parsed.errors };
    await updateItemDescription(getDb(), caseId, parsed.data, actor);
    return { saved: "lfcSavedListing" };
  });
  if (done.saved) redirect(`/admin/cases/new/found/${text(fd, "caseId")}`);
  return done;
}

/** A lost report taken at the desk on someone's behalf. */
export async function logLostAction(_prev: LfState, fd: FormData): Promise<LfState> {
  const { locale, actor } = await intakeActor(fd).catch(async (error) => {
    if (error instanceof CaseError) redirect("/admin/no-access");
    throw error;
  });
  const parsed = parseWalkIn(fd, locale);
  if (!parsed.ok) return { errors: parsed.errors };
  let caseId: string;
  try {
    ({ caseId } = await logWalkInLostReport(getDb(), parsed.data, actor));
  } catch (error) {
    return { error: messageFor(error, locale) };
  }
  revalidatePath("/admin/cases");
  redirect(`/admin/cases/${caseId}`);
}

