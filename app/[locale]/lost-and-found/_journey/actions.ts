"use server";

/**
 * Server Actions for the public journeys (report something lost, report
 * something found, claim a found item). Every page posts a plain HTML form, so
 * nothing here needs JavaScript in the browser: each action does its work and
 * ends in a redirect (post, redirect, get). Errors are not returned; they are
 * saved with the draft as a one-time "flash" and the question page shows them
 * as an error summary after the redirect.
 *
 * The form's hidden `journey`, `step`, `slug` and `locale` fields only select
 * what to do; each is checked against the known set, the draft itself comes
 * from the httpOnly cookie, and every answer is validated again here.
 */

import { redirect } from "next/navigation";
import { isPiiAvailable, PiiUnavailableError } from "@/lib/crypto/pii";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import { DEFAULT_LOCALE, isLocale, localePath, type Locale } from "@/lib/i18n/config";
import { clearJourneyToken, readJourneyToken, requestContext, siteOrigin, writeJourneyToken } from "@/lib/lost-found/public/cookies";
import { sendTrackingLinkEmail } from "@/lib/lost-found/public/email";
import { finishJourney, JourneyTooFastError } from "@/lib/lost-found/public/journey";
import { claimStateFor } from "@/lib/lost-found/public/listing";
import { firstStep, isJourney, isStep, journeyBasePath, nextStep, stepPath, STEP_FIELDS, type JourneyKind } from "@/lib/lost-found/public/steps";
import { loadJourney, saveJourney, startJourney, type JourneyData } from "@/lib/lost-found/public/store";
import { ClaimUnavailableError, consumeSubmitAttempt, JourneyInvalidError } from "@/lib/lost-found/public/submit";
import { trackingLinkUrl } from "@/lib/lost-found/public/track";
import { firstProblem, readStepValues, validateStep } from "@/lib/lost-found/public/validate";

const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;

interface Target {
  kind: JourneyKind;
  locale: Locale;
  slug?: string;
}

function target(form: FormData): Target | null {
  const kind = form.get("journey");
  const localeRaw = form.get("locale");
  const slugRaw = form.get("slug");
  if (!isJourney(kind)) return null;
  const locale: Locale = isLocale(localeRaw) ? localeRaw : DEFAULT_LOCALE;
  if (kind === "claim") {
    if (typeof slugRaw !== "string" || !SLUG.test(slugRaw)) return null;
    return { kind, locale, slug: slugRaw };
  }
  return { kind, locale };
}

const basePath = (t: Target) => localePath(t.locale, journeyBasePath(t.kind, t.slug));
const pathTo = (t: Target, step: string, query = "") => localePath(t.locale, stepPath(t.kind, step, t.slug)) + query;

/** The draft for this browser, or null. For a claim the draft must be for the same listing. */
async function currentDraft(t: Target) {
  const loaded = await loadJourney(getDb(), await readJourneyToken(t.kind), t.kind);
  if (!loaded || (t.kind === "claim" && loaded.data.slug !== t.slug)) return null;
  return loaded;
}

/** Start now: opens a fresh draft, sets the cookie, and goes to the first question. */
export async function beginJourney(form: FormData): Promise<void> {
  const t = target(form);
  if (!t) redirect(localePath(DEFAULT_LOCALE, "/lost-and-found"));
  if (!isDatabaseConfigured() || !isPiiAvailable()) redirect(basePath(t));
  if (t.kind === "claim" && (await claimStateFor(t.slug!)).state !== "ok") redirect(basePath(t));

  let started: { token: string } | null = null;
  try {
    started = await startJourney(getDb(), { kind: t.kind, locale: t.locale, slug: t.slug });
  } catch (error) {
    console.error("[lost-found] could not start a journey", error instanceof Error ? error.message : error);
  }
  if (!started) redirect(`${basePath(t)}?problem=1`);
  await writeJourneyToken(t.kind, started.token);
  redirect(pathTo(t, firstStep(t.kind)));
}

/** Saves one question page, or comes back to it with errors. */
export async function saveStep(form: FormData): Promise<void> {
  const t = target(form);
  if (!t) redirect(localePath(DEFAULT_LOCALE, "/lost-and-found"));
  const step = form.get("step");
  if (!isStep(t.kind, step) || !(step in STEP_FIELDS)) redirect(basePath(t));
  const fromCheck = form.get("from") === "check";

  const draft = await currentDraft(t);
  if (!draft) redirect(`${basePath(t)}?expired=1`);

  const data: JourneyData = { ...draft.data, locale: t.locale, values: { ...draft.data.values, ...readStepValues(step, form) } };
  const errors = validateStep(t.kind, step, data.values);
  if (Object.keys(errors).length > 0) {
    await saveJourney(getDb(), draft.id, { ...data, flash: { step, errors } });
    redirect(pathTo(t, step, fromCheck ? "?from=check" : ""));
  }
  await saveJourney(getDb(), draft.id, { ...data, flash: undefined });
  redirect(pathTo(t, fromCheck ? "check" : (nextStep(t.kind, step) ?? "check")));
}

/** Accept and send: checks everything again, then makes the case in one transaction. */
export async function sendJourney(form: FormData): Promise<void> {
  const t = target(form);
  if (!t) redirect(localePath(DEFAULT_LOCALE, "/lost-and-found"));
  const draft = await currentDraft(t);
  if (!draft) redirect(`${basePath(t)}?expired=1`);

  const db = getDb();
  const fail = async (key: "lfpSubmitFailed" | "lfpSubmitTooMany"): Promise<never> => {
    await saveJourney(db, draft.id, { ...draft.data, flash: { step: "check", errors: { form: key } } });
    redirect(pathTo(t, "check"));
  };

  // A field no person can see. Anything in it is a script; the reply is the same as any other failure.
  if (String(form.get("website") ?? "").trim() !== "") return fail("lfpSubmitFailed");
  if (!isDatabaseConfigured() || !isPiiAvailable()) return fail("lfpSubmitFailed");

  const meta = await requestContext();
  const attempt = await consumeSubmitAttempt(db, meta.ip);
  if (!attempt.allowed) return fail("lfpSubmitTooMany");

  const problem = firstProblem(t.kind, draft.data.values);
  if (problem) {
    await saveJourney(db, draft.id, { ...draft.data, flash: { step: problem.step, errors: problem.errors } });
    redirect(pathTo(t, problem.step));
  }

  let done = false;
  try {
    await finishJourney(db, draft.id, { locale: t.locale, ...meta });
    done = true;
  } catch (error) {
    if (error instanceof ClaimUnavailableError) redirect(basePath(t));
    if (error instanceof JourneyInvalidError) {
      await saveJourney(db, draft.id, { ...draft.data, flash: { step: error.step, errors: error.errors } });
      redirect(pathTo(t, error.step));
    }
    // Logged without the answers: the message names the failure, never the person.
    if (!(error instanceof JourneyTooFastError) && !(error instanceof PiiUnavailableError)) {
      console.error("[lost-found] journey not saved", error instanceof Error ? error.message : error);
    }
  }
  if (!done) return fail("lfpSubmitFailed");
  redirect(pathTo(t, "confirmation"));
}

/** Emails the private link once, to the address given in the journey. Never required, never fatal. */
export async function emailLink(form: FormData): Promise<void> {
  const t = target(form);
  if (!t) redirect(localePath(DEFAULT_LOCALE, "/lost-and-found"));
  const draft = await currentDraft(t);
  const result = draft?.data.result;
  if (!draft || !result) redirect(basePath(t));
  if (result.emailed || !result.email) redirect(pathTo(t, "confirmation"));

  const link = trackingLinkUrl(t.locale, result.reference, result.token, await siteOrigin());
  const sent = await sendTrackingLinkEmail(result.email, t.kind, result.reference, link);
  if (sent) await saveJourney(getDb(), draft.id, { ...draft.data, result: { ...result, emailed: true } }, { ttlMs: 30 * 60 * 1000 });
  redirect(pathTo(t, "confirmation", `?email=${sent ? "sent" : "failed"}`));
}

/** Forgets the draft on this browser (used by "start again"). The server copy simply expires. */
export async function forgetJourney(form: FormData): Promise<void> {
  const t = target(form);
  if (!t) redirect(localePath(DEFAULT_LOCALE, "/lost-and-found"));
  await clearJourneyToken(t.kind);
  redirect(basePath(t));
}
