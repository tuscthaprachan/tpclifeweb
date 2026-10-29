"use server";

/**
 * Server Actions for tracking. Plain form posts that end in a redirect, so they
 * work with JavaScript off. The reference and private token go from the form
 * into an httpOnly cookie and the browser is sent to a page with a clean URL,
 * so the token is never in the address bar, history or a referrer. Every
 * failure looks the same to the person.
 */

import { redirect } from "next/navigation";
import { clearTrackCookie, readTrackCookie, requestContext, writeTrackCookie } from "@/lib/borrowing/public/cookies";
import { cancelTracked, lookupTracked, parseTrackingInput } from "@/lib/borrowing/public/track";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import { DEFAULT_LOCALE, isLocale, localePath, type Locale } from "@/lib/i18n/config";

const text = (form: FormData, name: string) => (typeof form.get(name) === "string" ? (form.get(name) as string) : "");

function localeOf(form: FormData): Locale {
  const raw = form.get("locale");
  return isLocale(raw) ? raw : DEFAULT_LOCALE;
}

const trackPath = (locale: Locale, query = "") => localePath(locale, "/borrow/track") + query;
const statusPath = (locale: Locale, query = "") => localePath(locale, "/borrow/track/status") + query;

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

/** Cancels the request the cookie points to, after the confirmation page. */
export async function cancelRequest(form: FormData): Promise<void> {
  const locale = localeOf(form);
  const cookie = await readTrackCookie();
  if (!cookie || !isDatabaseConfigured()) redirect(trackPath(locale));
  const outcome = await cancelTracked(getDb(), cookie.reference, cookie.token, await requestContext());
  if (outcome === "done") redirect(statusPath(locale, "?cancelled=1"));
  if (outcome === "none" || outcome === "limited") redirect(trackPath(locale, "?problem=1"));
  redirect(localePath(locale, "/borrow/track/cancel") + "?problem=1");
}

/** Stops showing the request on this device. The private link itself still works. */
export async function forgetTracking(form: FormData): Promise<void> {
  const locale = localeOf(form);
  await clearTrackCookie();
  redirect(trackPath(locale));
}
