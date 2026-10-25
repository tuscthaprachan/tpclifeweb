"use server";

/**
 * Actions shared by every /admin page: switching language, signing out, and
 * the "stay signed in" button of the timeout warning.
 */

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth, isAuthConfigured } from "@/lib/auth";
import { safeReturnPath } from "@/lib/admin/return-path";
import { requireSignedIn } from "@/lib/auth/session";
import { LEGACY_LOCALE_COOKIE, LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, isLocale } from "@/lib/i18n/config";

export async function setAdminLocale(formData: FormData): Promise<void> {
  const locale = formData.get("locale");
  if (isLocale(locale)) {
    const store = await cookies();
    store.set(LOCALE_COOKIE, locale, { path: "/", maxAge: LOCALE_COOKIE_MAX_AGE, sameSite: "lax" });
    store.delete(LEGACY_LOCALE_COOKIE);
  }
  redirect(safeReturnPath(formData.get("returnTo")));
}

export async function signOutAction(): Promise<void> {
  if (isAuthConfigured()) {
    try {
      await getAuth().api.signOut({ headers: await headers() });
    } catch {
      // Already signed out, or the session expired: the goal is met either way.
    }
  }
  redirect("/admin/signed-out?reason=manual");
}

/**
 * "Stay signed in". Loading the session records the activity (see
 * lib/auth/session.ts), which moves the idle deadline; the new end time goes
 * back so the warning can reset its countdown.
 */
export async function extendSession(): Promise<{ endsAt: string } | null> {
  const ctx = await requireSignedIn();
  return { endsAt: ctx.deadlines.endsAt.toISOString() };
}
