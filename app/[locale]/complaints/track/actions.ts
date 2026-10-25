"use server";

/**
 * Server Actions for tracking. Plain form posts that end in a redirect, so they
 * work with JavaScript off. The reference and private token go from the form
 * into an httpOnly cookie and the browser is sent to a page with a clean URL,
 * so the token is never in the address bar, history or a referrer. Every
 * failure looks the same to the person.
 */

import { redirect } from "next/navigation";
import { clearTrackCookie, readTrackCookie, requestContext, writeTrackCookie } from "@/lib/complaints/public/cookies";
import { lookupTracked, parseTrackingInput, reopenTracked, surveyTracked, withdrawTracked } from "@/lib/complaints/public/track";
import { PiiUnavailableError } from "@/lib/crypto/pii";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import { DEFAULT_LOCALE, isLocale, localePath, type Locale } from "@/lib/i18n/config";

const text = (form: FormData, name: string) => (typeof form.get(name) === "string" ? (form.get(name) as string) : "");

function localeOf(form: FormData): Locale {
  const raw = form.get("locale");
  return isLocale(raw) ? raw : DEFAULT_LOCALE;
}

const trackPath = (locale: Locale, query = "") => localePath(locale, "/complaints/track") + query;
const statusPath = (locale: Locale, query = "") => localePath(locale, "/complaints/track/status") + query;

/** Checks the reference and link, sets the tracking cookie and shows the status page. */
export async function openTracking(form: FormData): Promise<void> {
  const locale = localeOf(form);
  const referenceRaw = text(form, "reference");
  const linkRaw = text(form, "link");
  if (!referenceRaw.trim()) redirect(trackPath(locale, "?problem=ref"));
  if (!linkRaw.trim()) redirect(trackPath(locale, "?problem=link"));
  const parsed = parseTrackingInput(referenceRaw, linkRaw);
  if (!parsed || !isDatabaseConfigured()) redirect(trackPath(locale, "?problem=1"));

  const meta = await requestContext();
  const found = await lookupTracked(getDb(), parsed.reference, parsed.token, meta.ip);
  if (found.state === "limited") redirect(trackPath(locale, "?problem=limited"));
  if (found.state === "none") redirect(trackPath(locale, "?problem=1"));
  await writeTrackCookie({ reference: parsed.reference, token: parsed.token });
  redirect(statusPath(locale));
}

/** Withdraws the complaint the cookie points to, after the confirmation page. */
export async function withdrawComplaint(form: FormData): Promise<void> {
  const locale = localeOf(form);
  const cookie = await readTrackCookie();
  if (!cookie || !isDatabaseConfigured()) redirect(trackPath(locale));
  const outcome = await withdrawTracked(getDb(), cookie.reference, cookie.token, await requestContext());
  if (outcome === "done") redirect(statusPath(locale, "?withdrawn=1"));
  if (outcome === "none" || outcome === "limited") redirect(trackPath(locale, "?problem=1"));
  redirect(localePath(locale, "/complaints/track/withdraw") + "?problem=1");
}

/** Reopens a resolved complaint, with the person's reason, inside the reopen window. */
export async function reopenComplaintAction(form: FormData): Promise<void> {
  const locale = localeOf(form);
  const cookie = await readTrackCookie();
  if (!cookie || !isDatabaseConfigured()) redirect(trackPath(locale));
  const reason = text(form, "reason").replace(/\r\n?/g, "\n").trim();
  const back = (problem: string) => redirect(localePath(locale, "/complaints/track/reopen") + `?problem=${problem}`);
  if ([...reason].length > 1000) back("long");
  let outcome: Awaited<ReturnType<typeof reopenTracked>> = "not_allowed";
  try {
    outcome = await reopenTracked(getDb(), cookie.reference, cookie.token, reason, await requestContext());
  } catch (error) {
    if (!(error instanceof PiiUnavailableError)) throw error;
    back("failed");
  }
  if (outcome === "done") redirect(statusPath(locale, "?reopened=1"));
  if (outcome === "none" || outcome === "limited") redirect(trackPath(locale, "?problem=1"));
  back("closed");
}

/** Saves the satisfaction survey. */
export async function submitSurveyAction(form: FormData): Promise<void> {
  const locale = localeOf(form);
  const cookie = await readTrackCookie();
  if (!cookie || !isDatabaseConfigured()) redirect(trackPath(locale));
  const surveyPath = localePath(locale, "/complaints/track/survey");
  const score = Number(text(form, "score"));
  const comment = text(form, "comment").replace(/\r\n?/g, "\n").trim();
  if (!Number.isInteger(score) || score < 1 || score > 5) redirect(`${surveyPath}?problem=score`);
  if ([...comment].length > 1000) redirect(`${surveyPath}?problem=long`);
  let outcome: Awaited<ReturnType<typeof surveyTracked>> = "invalid";
  try {
    outcome = await surveyTracked(getDb(), cookie.reference, cookie.token, { score, comment }, await requestContext());
  } catch (error) {
    if (!(error instanceof PiiUnavailableError)) throw error;
    redirect(`${surveyPath}?problem=failed`);
  }
  if (outcome === "saved" || outcome === "already") redirect(statusPath(locale, "?survey=1"));
  if (outcome === "none" || outcome === "limited") redirect(trackPath(locale, "?problem=1"));
  redirect(statusPath(locale));
}

/** Stops showing the complaint on this device. The private link itself still works. */
export async function forgetTracking(form: FormData): Promise<void> {
  const locale = localeOf(form);
  await clearTrackCookie();
  redirect(trackPath(locale));
}
