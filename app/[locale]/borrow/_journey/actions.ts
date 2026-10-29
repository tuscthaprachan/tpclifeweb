"use server";

/**
 * Server Actions for the borrowing journey. Every page posts a plain HTML form,
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
import { clearJourneyToken, readJourneyToken, requestContext, siteOrigin, writeJourneyToken } from "@/lib/borrowing/public/cookies";
import { sendTrackingLinkEmail } from "@/lib/borrowing/public/email";
import { finishJourney, JourneyTooFastError } from "@/lib/borrowing/public/journey";
import { isStep, nextStep, QUESTION_STEPS, stepPath } from "@/lib/borrowing/public/steps";
import { loadJourney, saveJourney, startJourney, type JourneyData } from "@/lib/borrowing/public/store";
import { consumeSubmitAttempt, JourneyInvalidError, loadContext } from "@/lib/borrowing/public/submit";
import { trackingLinkUrl } from "@/lib/borrowing/public/track";
import { firstProblem, readStepValues, validateStep } from "@/lib/borrowing/public/validate";
import { isPiiAvailable, PiiUnavailableError } from "@/lib/crypto/pii";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import { DEFAULT_LOCALE, isLocale, localePath, type Locale } from "@/lib/i18n/config";

function localeOf(form: FormData): Locale {
  const raw = form.get("locale");
  return isLocale(raw) ? raw : DEFAULT_LOCALE;
}

const basePath = (locale: Locale) => localePath(locale, "/borrow");
const pathTo = (locale: Locale, step: string, query = "") => localePath(locale, stepPath(step)) + query;

async function currentDraft() {
  return loadJourney(getDb(), await readJourneyToken());
}

/** Start now: opens a fresh draft, sets the cookie, and goes to the first question (the dates). */
export async function beginJourney(form: FormData): Promise<void> {
  const locale = localeOf(form);
  if (!isDatabaseConfigured() || !isPiiAvailable()) redirect(basePath(locale));
  let started: { token: string } | null = null;
  try {
    started = await startJourney(getDb(), { locale });
  } catch (error) {
    console.error("[borrowing] could not start a journey", error instanceof Error ? error.message : error);
  }
  if (!started) redirect(`${basePath(locale)}?problem=1`);
  await writeJourneyToken(started.token);
  redirect(pathTo(locale, "dates"));
}

/** Saves one question page, or comes back to it with errors. */
export async function saveStep(form: FormData): Promise<void> {
  const locale = localeOf(form);
  const step = form.get("step");
  if (!isStep(step) || !(QUESTION_STEPS as readonly string[]).includes(step)) redirect(basePath(locale));
  const fromCheck = form.get("from") === "check";

  const draft = await currentDraft();
  if (!draft) redirect(`${basePath(locale)}?expired=1`);

  const values = { ...draft.data.values, ...readStepValues(step, form, draft.data.values) };
  const data: JourneyData = { ...draft.data, locale, values };
  const db = getDb();
  const ctx = await loadContext(db, values);
  const errors = validateStep(step, values, ctx);
  if (Object.keys(errors).length > 0) {
    await saveJourney(db, draft.id, { ...data, flash: { step, errors } });
    redirect(pathTo(locale, step, fromCheck ? "?from=check" : ""));
  }
  await saveJourney(db, draft.id, { ...data, flash: undefined });

  // Coming back from "check" goes straight back, unless the change leaves another page needing an answer or no longer holding
  // (new dates change what is free, so the items and quantities are checked again and the person is told which).
  if (fromCheck) {
    const problem = firstProblem(values, ctx);
    if (problem) {
      await saveJourney(db, draft.id, { ...data, flash: { step: problem.step, errors: problem.step === "dates" || problem.step === "items" || problem.step === "quantities" ? problem.errors : {} } });
      redirect(pathTo(locale, problem.step, "?from=check"));
    }
    redirect(pathTo(locale, "check"));
  }
  redirect(pathTo(locale, nextStep(step) ?? "check"));
}

/** Accept and send: checks everything again, then makes the request in one transaction. */
export async function sendJourney(form: FormData): Promise<void> {
  const locale = localeOf(form);
  const draft = await currentDraft();
  if (!draft) redirect(`${basePath(locale)}?expired=1`);

  const db = getDb();
  const fail = async (key: "brSubmitFailed" | "brSubmitTooMany"): Promise<never> => {
    await saveJourney(db, draft.id, { ...draft.data, flash: { step: "check", errors: { form: { key } } } });
    redirect(pathTo(locale, "check"));
  };

  // A field no person can see. Anything in it is a script; the reply is the same as any other failure.
  if (String(form.get("website") ?? "").trim() !== "") return fail("brSubmitFailed");
  if (!isDatabaseConfigured() || !isPiiAvailable()) return fail("brSubmitFailed");

  const meta = await requestContext();
  const attempt = await consumeSubmitAttempt(db, meta.ip);
  if (!attempt.allowed) return fail("brSubmitTooMany");

  const problem = firstProblem(draft.data.values, await loadContext(db, draft.data.values));
  if (problem) {
    await saveJourney(db, draft.id, { ...draft.data, flash: { step: problem.step, errors: problem.errors } });
    redirect(pathTo(locale, problem.step));
  }

  let done = false;
  try {
    await finishJourney(db, draft.id, { locale, ...meta });
    done = true;
  } catch (error) {
    // The stock moved while the person was checking: back to the page it concerns, with the reason.
    if (error instanceof JourneyInvalidError) {
      await saveJourney(db, draft.id, { ...draft.data, flash: { step: error.step, errors: error.errors } });
      redirect(pathTo(locale, error.step));
    }
    // Logged without the answers: the message names the failure, never the person.
    if (!(error instanceof JourneyTooFastError) && !(error instanceof PiiUnavailableError)) {
      console.error("[borrowing] journey not saved", error instanceof Error ? error.message : error);
    }
  }
  if (!done) return fail("brSubmitFailed");
  redirect(pathTo(locale, "confirmation"));
}

/** Emails the private link once, to the address given in the journey. Never required, never fatal. */
export async function emailLink(form: FormData): Promise<void> {
  const locale = localeOf(form);
  const draft = await currentDraft();
  const result = draft?.data.result;
  if (!draft || !result) redirect(basePath(locale));
  if (result.emailed || !result.email) redirect(pathTo(locale, "confirmation"));

  const link = trackingLinkUrl(locale, result.reference, result.token, await siteOrigin());
  const sent = await sendTrackingLinkEmail(result.email, result.reference, link);
  if (sent) await saveJourney(getDb(), draft.id, { ...draft.data, result: { ...result, emailed: true } }, { ttlMs: 30 * 60 * 1000 });
  redirect(pathTo(locale, "confirmation", `?email=${sent ? "sent" : "failed"}`));
}

/** Forgets the draft on this browser (used by "start again"). The server copy simply expires. */
export async function forgetJourney(form: FormData): Promise<void> {
  const locale = localeOf(form);
  await clearJourneyToken();
  redirect(basePath(locale));
}
