"use server";

/**
 * Server Actions for the complaint journey. Every page posts a plain HTML form,
 * so nothing here needs JavaScript in the browser: each action does its work
 * and ends in a redirect (post, redirect, get). Errors are not returned; they
 * are saved with the draft as a one-time "flash" and the question page shows
 * them as an error summary after the redirect.
 *
 * The form's hidden `step` and `locale` fields only select what to do; each is
 * checked against the known set, the draft itself comes from the httpOnly
 * cookie, and every answer is validated again here.
 */

import { redirect } from "next/navigation";
import { listCategories } from "@/lib/complaints/categories";
import { ComplaintError } from "@/lib/complaints/errors";
import { clearJourneyToken, readJourneyToken, requestContext, siteOrigin, writeJourneyToken } from "@/lib/complaints/public/cookies";
import { sendTrackingLinkEmail } from "@/lib/complaints/public/email";
import { addJourneyFile, removeJourneyFile } from "@/lib/complaints/public/evidence";
import { finishJourney, JourneyTooFastError } from "@/lib/complaints/public/journey";
import { type DraftValues, isStep, signpostLevel, STEP_FIELDS, stepPath } from "@/lib/complaints/public/steps";
import { complaintStore, loadJourney, startJourney } from "@/lib/complaints/public/store";
import { consumeSubmitAttempt, consumeUploadAttempt, JourneyInvalidError } from "@/lib/complaints/public/submit";
import { trackingLinkUrl } from "@/lib/complaints/public/track";
import { applyAnswers, complaintJourney, facultyChoices, firstProblem, readStepValues, validateStep } from "@/lib/complaints/public/validate";
import { getFacultiesWithOrganisations } from "@/lib/content";
import { isPiiAvailable, PiiUnavailableError } from "@/lib/crypto/pii";
import { type EmailOutcome, emailResultOnce } from "@/lib/journeys/email";
import { recordAnswers, recordFlash } from "@/lib/journeys/machine";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import { DEFAULT_LOCALE, isLocale, localePath, type Locale } from "@/lib/i18n/config";
import { recordSignpost } from "@/lib/performance/journeys";
import { getStorage } from "@/lib/storage";

function localeOf(form: FormData): Locale {
  const raw = form.get("locale");
  return isLocale(raw) ? raw : DEFAULT_LOCALE;
}

const basePath = (locale: Locale) => localePath(locale, "/complaints");
const pathTo = (locale: Locale, step: string, query = "") => localePath(locale, stepPath(step)) + query;

async function currentDraft() {
  return loadJourney(getDb(), await readJourneyToken());
}

/** Start now: opens a fresh draft, sets the cookie, and goes to the first question (is anyone in danger). */
export async function beginJourney(form: FormData): Promise<void> {
  const locale = localeOf(form);
  if (!isDatabaseConfigured() || !isPiiAvailable()) redirect(basePath(locale));
  let started: { token: string } | null = null;
  try {
    started = await startJourney(getDb(), { locale }, { getStorage });
  } catch (error) {
    console.error("[complaints] could not start a journey", error instanceof Error ? error.message : error);
  }
  if (!started) redirect(`${basePath(locale)}?problem=1`);
  await writeJourneyToken(started.token);
  redirect(pathTo(locale, "emergency"));
}

/** Saves one question page, or comes back to it with errors. */
export async function saveStep(form: FormData): Promise<void> {
  const locale = localeOf(form);
  const step = form.get("step");
  if (!isStep(step) || (!(step in STEP_FIELDS) && step !== "evidence")) redirect(basePath(locale));
  const fromCheck = form.get("from") === "check";

  const db = getDb();
  const [draft, categories, facultyList] = await Promise.all([
    currentDraft(),
    listCategories(db, { activeOnly: true }),
    step === "faculty" || step === "programme" ? getFacultiesWithOrganisations() : [],
  ]);
  if (!draft) redirect(`${basePath(locale)}?expired=1`);

  const read = readStepValues(step, form);
  const merge = (values: DraftValues) => applyAnswers(values, step, read);
  const values = merge(draft.data.values);
  const keys = categories.map((c) => c.key);
  const faculties = facultyChoices(facultyList);
  const errors = validateStep(step, values, keys, faculties);
  if (Object.keys(errors).length > 0) {
    await complaintStore.update(db, draft.id, (d) => recordAnswers(d, { locale, merge, flash: { step, errors } }));
    redirect(pathTo(locale, step, fromCheck ? "?from=check" : ""));
  }
  await complaintStore.update(db, draft.id, (d) => recordAnswers(d, { locale, merge }));
  const after = complaintJourney.afterSave(values, step, { fromCheck, ctx: { categoryKeys: keys, faculties } });
  // Counted here, on the post that routes there, so reloading the page does not count again.
  const counted = signpostLevel(after.step, values);
  if (counted) await recordSignpost(db, counted);
  redirect(pathTo(locale, after.step, after.fromCheck ? "?from=check" : ""));
}

/** "Report it afterwards" on the emergency page: the danger has passed, so carry on to the next question. */
export async function afterEmergency(form: FormData): Promise<void> {
  const locale = localeOf(form);
  const draft = await currentDraft();
  if (!draft) redirect(`${basePath(locale)}?expired=1`);
  await complaintStore.update(getDb(), draft.id, (d) => recordAnswers(d, { locale, merge: (v) => ({ ...v, emergency: "no" }) }));
  redirect(pathTo(locale, "level"));
}

/**
 * "Make a confidential complaint" after a course issue involving harassment or
 * safety: the same journey as any university level complaint, with the
 * restricted category chosen for the person (they can change it).
 */
export async function continueToTusu(form: FormData): Promise<void> {
  const locale = localeOf(form);
  const draft = await currentDraft();
  if (!draft) redirect(`${basePath(locale)}?expired=1`);
  const db = getDb();
  const categories = await listCategories(db, { activeOnly: true });
  const category = categories.some((c) => c.key === "harassment") ? "harassment" : "";
  await complaintStore.update(db, draft.id, (d) => recordAnswers(d, { locale, merge: (v) => ({ ...v, emergency: "no", level: "university", category: category || v.category }) }));
  redirect(pathTo(locale, "identity"));
}

const UPLOAD_ERRORS = {
  empty: "cpErrFileEmpty",
  too_large: "cpErrFileTooLarge",
  unsupported_type: "cpErrFileType",
  type_mismatch: "cpErrFileType",
  too_many: "cpErrFileTooMany",
  not_configured: "cpErrFileFailed",
  failed: "cpErrFileFailed",
} as const;

/** Adds one evidence file to the draft. Private storage; if storage is not set up the page says so and nothing is stored. */
export async function uploadEvidence(form: FormData): Promise<void> {
  const locale = localeOf(form);
  const draft = await currentDraft();
  if (!draft) redirect(`${basePath(locale)}?expired=1`);
  const db = getDb();
  const back = async (key: (typeof UPLOAD_ERRORS)[keyof typeof UPLOAD_ERRORS] | "cpErrFileNone" | "cpErrFileTooMany" | "cpSubmitTooMany"): Promise<never> => {
    await complaintStore.update(db, draft.id, (d) => recordFlash(d, { step: "evidence", errors: { evidence: key } }));
    redirect(pathTo(locale, "evidence"));
  };

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return back("cpErrFileNone");
  const meta = await requestContext();
  const attempt = await consumeUploadAttempt(db, meta.ip);
  if (!attempt.allowed) return back("cpSubmitTooMany");
  let outcome: Awaited<ReturnType<typeof addJourneyFile>> = { ok: false, reason: "failed" };
  try {
    outcome = await addJourneyFile(db, draft.id, { bytes: new Uint8Array(await file.arrayBuffer()), declaredType: file.type, name: file.name }, { storage: getStorage });
  } catch (error) {
    console.error("[complaints] evidence not saved", error instanceof Error ? error.message : error);
  }
  if (!outcome.ok) return back(UPLOAD_ERRORS[outcome.reason]);
  await complaintStore.update(db, draft.id, (d) => recordFlash(d, undefined));
  redirect(pathTo(locale, "evidence"));
}

export async function removeEvidence(form: FormData): Promise<void> {
  const locale = localeOf(form);
  const draft = await currentDraft();
  if (!draft) redirect(`${basePath(locale)}?expired=1`);
  const id = form.get("file");
  if (typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id)) await removeJourneyFile(getDb(), draft.id, id, getStorage);
  redirect(pathTo(locale, "evidence"));
}

/** Accept and send: checks everything again, then makes the complaint in one transaction. */
export async function sendJourney(form: FormData): Promise<void> {
  const locale = localeOf(form);
  const draft = await currentDraft();
  if (!draft) redirect(`${basePath(locale)}?expired=1`);

  const db = getDb();
  const fail = async (key: "cpSubmitFailed" | "cpSubmitTooMany"): Promise<never> => {
    await complaintStore.update(db, draft.id, (d) => recordFlash(d, { step: "check", errors: { form: key } }));
    redirect(pathTo(locale, "check"));
  };

  // A field no person can see. Anything in it is a script; the reply is the same as any other failure.
  if (String(form.get("website") ?? "").trim() !== "") return fail("cpSubmitFailed");
  if (!isDatabaseConfigured() || !isPiiAvailable()) return fail("cpSubmitFailed");

  const meta = await requestContext();
  const attempt = await consumeSubmitAttempt(db, meta.ip);
  if (!attempt.allowed) return fail("cpSubmitTooMany");

  const keys = (await listCategories(db, { activeOnly: true })).map((c) => c.key);
  const problem = firstProblem(draft.data.values, keys);
  if (problem) {
    await complaintStore.update(db, draft.id, (d) => recordFlash(d, { step: problem.step, errors: problem.errors }));
    redirect(pathTo(locale, problem.step));
  }

  let done = false;
  try {
    await finishJourney(db, draft.id, { locale, ...meta });
    done = true;
  } catch (error) {
    if (error instanceof JourneyInvalidError) {
      await complaintStore.update(db, draft.id, (d) => recordFlash(d, { step: error.step, errors: error.errors }));
      redirect(pathTo(locale, error.step));
    }
    // Logged without the answers: the message names the failure, never the person.
    if (!(error instanceof JourneyTooFastError) && !(error instanceof PiiUnavailableError) && !(error instanceof ComplaintError)) {
      console.error("[complaints] journey not saved", error instanceof Error ? error.message : error);
    }
  }
  if (!done) return fail("cpSubmitFailed");
  let outcome: EmailOutcome = "failed";
  try {
    const origin = await siteOrigin();
    outcome = await emailResultOnce(
      complaintStore,
      db,
      draft.id,
      (result) => sendTrackingLinkEmail(result.email!, result.reference, trackingLinkUrl(locale, result.reference, result.token, origin)),
      { eligible: (result) => result.identity !== "anonymous" },
    );
  } catch (error) {
    console.error("[complaints] tracking email not sent", error instanceof Error ? error.message : error);
  }
  redirect(pathTo(locale, "confirmation", outcome === "failed" ? "?email=failed" : ""));
}

/** Emails the private link once, to the address given in the journey. Never required, never fatal. */
export async function emailLink(form: FormData): Promise<void> {
  const locale = localeOf(form);
  const draft = await currentDraft();
  if (!draft?.data.result) redirect(basePath(locale));
  const origin = await siteOrigin();
  const outcome = await emailResultOnce(
    complaintStore,
    getDb(),
    draft.id,
    (result) => sendTrackingLinkEmail(result.email!, result.reference, trackingLinkUrl(locale, result.reference, result.token, origin)),
    { eligible: (result) => result.identity !== "anonymous" },
  );
  redirect(pathTo(locale, "confirmation", outcome === "skipped" ? "" : `?email=${outcome}`));
}

/** Forgets the draft on this browser (used by "start again"). The server copy simply expires. */
export async function forgetJourney(form: FormData): Promise<void> {
  const locale = localeOf(form);
  await clearJourneyToken();
  redirect(basePath(locale));
}
