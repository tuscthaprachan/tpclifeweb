"use server";

/** Step d: the second step of signing in, for staff who have already set one up. */

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAPIError } from "better-auth/api";
import { getAdminLocale } from "@/lib/admin/locale";
import { getAuth } from "@/lib/auth";
import { requireSignedIn } from "@/lib/auth/session";
import { a } from "@/lib/i18n/admin";

export interface FactorFormState {
  error?: string;
}

function failureMessage(error: unknown, wrong: string, locale: Awaited<ReturnType<typeof getAdminLocale>>): string {
  if (isAPIError(error) && error.status === "TOO_MANY_REQUESTS") return a("errAuthLocked", locale);
  return wrong;
}

export async function verifyAuthenticator(_prev: FactorFormState, formData: FormData): Promise<FactorFormState> {
  const locale = await getAdminLocale();
  await requireSignedIn();
  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  if (!code) return { error: a("errAuthCodeRequired", locale) };
  if (!/^\d{6}$/.test(code)) return { error: a("errCodeFormat", locale) };

  try {
    await getAuth().api.verifyTOTP({ body: { code }, headers: await headers() });
  } catch (error) {
    if (isAPIError(error)) return { error: failureMessage(error, a("errAuthCodeWrong", locale), locale) };
    throw error;
  }
  redirect("/admin");
}

export async function verifyBackupCode(_prev: FactorFormState, formData: FormData): Promise<FactorFormState> {
  const locale = await getAdminLocale();
  await requireSignedIn();
  const code = String(formData.get("code") ?? "").trim();
  if (!code) return { error: a("errBackupRequired", locale) };

  try {
    await getAuth().api.verifyBackupCode({ body: { code }, headers: await headers() });
  } catch (error) {
    if (isAPIError(error)) return { error: failureMessage(error, a("errBackupWrong", locale), locale) };
    throw error;
  }
  redirect("/admin");
}
