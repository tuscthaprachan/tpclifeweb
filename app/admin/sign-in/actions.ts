"use server";

/**
 * Steps a and b of signing in: ask for a code, then enter it. Every check is
 * done here on the server; the pages only render what these return.
 */

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAPIError } from "better-auth/api";
import { getAdminLocale } from "@/lib/admin/locale";
import { clearFlow, getFlow, issueCode, mayRequestCode, setFlow } from "@/lib/admin/sign-in";
import { getAuth, isAuthConfigured } from "@/lib/auth";
import { getAllowedDomains, isPlausibleEmail, normaliseEmail } from "@/lib/auth/domains";
import { acceptInvite, InviteError } from "@/lib/auth/invites";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { auditContextFor } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { a } from "@/lib/i18n/admin";

export interface EmailFormState {
  email: string;
  error?: string;
}

export interface CodeFormState {
  error?: string;
}

export async function requestCode(_prev: EmailFormState, formData: FormData): Promise<EmailFormState> {
  const locale = await getAdminLocale();
  const email = normaliseEmail(String(formData.get("email") ?? ""));
  if (!isAuthConfigured()) return { email, error: a("errSendFailed", locale) };

  if (!email) return { email, error: a("errEmailRequired", locale) };
  if (!isPlausibleEmail(email)) return { email, error: a("errEmailFormat", locale) };
  if (!(await mayRequestCode(email))) {
    return { email, error: a("errEmailDomain", locale, { domains: getAllowedDomains().join(", ") }) };
  }

  const result = await issueCode(email);
  if (result.status === "rate_limited") return { email, error: a("errTooManyCodes", locale, { minutes: result.minutes }) };
  if (result.status === "failed") return { email, error: a("errSendFailed", locale) };

  await setFlow({ email });
  redirect("/admin/sign-in/code");
}

/** The "Not received a code?" page's button. */
export async function resendCode(): Promise<void> {
  const flow = await getFlow();
  if (!flow) redirect("/admin/sign-in");
  const result = await issueCode(flow.email);
  if (result.status !== "sent") redirect(`/admin/sign-in/resend?error=${result.status === "rate_limited" ? `limit-${result.minutes}` : "failed"}`);
  // Keep the invite token (if any) when the cookie is refreshed.
  await setFlow({ email: flow.email, invite: flow.invite });
  redirect("/admin/sign-in/code?sent=1");
}

export async function verifyCode(_prev: CodeFormState, formData: FormData): Promise<CodeFormState> {
  const locale = await getAdminLocale();
  const flow = await getFlow();
  if (!flow) redirect("/admin/sign-in");

  const raw = String(formData.get("code") ?? "").replace(/[\s-]/g, "");
  if (!raw) return { error: a("errCodeRequired", locale) };
  if (!/^\d{6}$/.test(raw)) return { error: a("errCodeFormat", locale) };

  const db = getDb();
  const limit = await consumeRateLimit(db, `code-verify:${flow.email}`, { windowSeconds: 900, max: 10 });
  if (!limit.allowed) return { error: a("errTooManyCodes", locale, { minutes: Math.ceil(limit.retryAfterSeconds / 60) }) };

  let userId: string;
  try {
    const result = await getAuth().api.signInEmailOTP({
      body: { email: flow.email, otp: raw },
      headers: await headers(),
    });
    userId = result.user.id;
  } catch (error) {
    if (isAPIError(error)) {
      const code = (error.body as { code?: string } | undefined)?.code;
      if (code === "OTP_EXPIRED" || code === "TOO_MANY_ATTEMPTS") return { error: a("errCodeExpired", locale) };
      if (error.status === "FORBIDDEN") return { error: a("errNoAccount", locale) };
      return { error: a("errCodeWrong", locale) };
    }
    throw error;
  }

  // Signed in. An invited person's roles are granted now, in one audited transaction.
  if (flow.invite) {
    try {
      await acceptInvite(db, {
        token: flow.invite,
        userId,
        userEmail: flow.email,
        context: await auditContextFor({ user: { id: userId, name: "", email: flow.email } }),
      });
    } catch (error) {
      if (!(error instanceof InviteError)) throw error;
      // Signed in, but the invitation can no longer be used; the page says why.
      await clearFlow();
      redirect(`/admin/invite/${encodeURIComponent(flow.invite)}`);
    }
  }
  await clearFlow();
  redirect("/admin");
}
