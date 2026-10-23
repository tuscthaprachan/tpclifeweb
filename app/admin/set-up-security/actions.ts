"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAPIError } from "better-auth/api";
import { getAdminLocale } from "@/lib/admin/locale";
import { withResponseCookies } from "@/lib/admin/cookies";
import { clearBackupCodes, storeBackupCodes } from "@/lib/admin/backup-codes-flash";
import { getAuth } from "@/lib/auth";
import { a } from "@/lib/i18n/admin";
import { requireSetupAccess } from "./guard";

export interface ChoiceState {
  error?: string;
}

export async function chooseMethod(_prev: ChoiceState, formData: FormData): Promise<ChoiceState> {
  const locale = await getAdminLocale();
  await requireSetupAccess();
  const choice = formData.get("method");
  if (choice === "passkey") redirect("/admin/set-up-security/passkey");
  if (choice !== "authenticator") return { error: a("errChoiceRequired", locale) };

  try {
    // Creates the (unconfirmed) secret. The next page shows it; nothing is
    // switched on until a code from the app has been checked.
    await getAuth().api.enableTwoFactor({ body: { method: "totp" }, headers: await headers() });
  } catch (error) {
    if (!isAPIError(error)) throw error;
    return { error: a("authSetupFailed", locale) };
  }
  redirect("/admin/set-up-security/authenticator");
}

export interface ConfirmState {
  error?: string;
}

export async function confirmAuthenticator(_prev: ConfirmState, formData: FormData): Promise<ConfirmState> {
  const locale = await getAdminLocale();
  await requireSetupAccess();
  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  if (!code) return { error: a("errAuthCodeRequired", locale) };
  if (!/^\d{6}$/.test(code)) return { error: a("errCodeFormat", locale) };

  const auth = getAuth();
  const requestHeaders = await headers();
  let backupCodes: string[];
  try {
    const verified = await auth.api.verifyTOTP({ body: { code }, headers: requestHeaders, returnHeaders: true });
    // Confirming for the first time replaces the session, so carry the new cookie forward.
    const next = withResponseCookies(requestHeaders, verified.headers);
    ({ backupCodes } = await auth.api.generateBackupCodes({ body: {}, headers: next }));
  } catch (error) {
    if (!isAPIError(error)) throw error;
    return { error: error.status === "TOO_MANY_REQUESTS" ? a("errAuthLocked", locale) : a("errAuthCodeWrong", locale) };
  }
  await storeBackupCodes(backupCodes);
  redirect("/admin/set-up-security/backup-codes");
}

/** "Continue" on the backup codes page: the codes have been seen, so forget them. */
export async function finishAuthenticatorSetup(): Promise<void> {
  await clearBackupCodes();
  redirect("/admin");
}
