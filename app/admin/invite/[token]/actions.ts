"use server";

import { redirect } from "next/navigation";
import { getAdminLocale } from "@/lib/admin/locale";
import { issueCode, setFlow } from "@/lib/admin/sign-in";
import { findInviteByToken, inviteStatus } from "@/lib/auth/invites";
import { getDb } from "@/lib/db";
import { a } from "@/lib/i18n/admin";

export interface StartState {
  error?: string;
}

/**
 * "Accept and get a code". The address comes from the invitation, never from
 * the form, so the code can only go to the person the admin named.
 */
export async function startInviteSignIn(_prev: StartState, formData: FormData): Promise<StartState> {
  const locale = await getAdminLocale();
  const token = String(formData.get("token") ?? "");
  const found = await findInviteByToken(getDb(), token);
  if (!found || inviteStatus(found.invite, new Date()) !== "pending") redirect(`/admin/invite/${encodeURIComponent(token)}`);

  const result = await issueCode(found.invite.email);
  if (result.status === "rate_limited") return { error: a("errTooManyCodes", locale, { minutes: result.minutes }) };
  if (result.status === "failed") return { error: a("errSendFailed", locale) };

  await setFlow({ email: found.invite.email, invite: token });
  redirect("/admin/sign-in/code");
}
