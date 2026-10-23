import "server-only";

/**
 * The pieces of the sign-in journey the Server Actions share: the signed
 * "flow" cookie that carries the email between pages, and requesting a code
 * with the per-address and per-IP limits applied.
 */

import { cookies, headers } from "next/headers";
import { getAuth, isAuthConfigured } from "@/lib/auth";
import { decodeFlow, encodeFlow, FLOW_TTL_MS, type SignInFlow } from "@/lib/auth/flow-token";
import { isEmailPermitted } from "@/lib/auth/permitted";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { captureSendFailure } from "@/lib/auth/send-outcome";
import { getRequestMeta } from "@/lib/auth/session";
import { getAllowedDomains, normaliseEmail } from "@/lib/auth/domains";
import { getDb } from "@/lib/db";

const FLOW_COOKIE = "trytpc_admin_flow";

function flowSecret(): string {
  return process.env.BETTER_AUTH_SECRET as string;
}

export async function setFlow(flow: Omit<SignInFlow, "exp">): Promise<void> {
  const store = await cookies();
  store.set(FLOW_COOKIE, encodeFlow(flow, flowSecret()), {
    path: "/admin",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: FLOW_TTL_MS / 1000,
  });
}

export async function getFlow(): Promise<SignInFlow | null> {
  if (!isAuthConfigured()) return null;
  const store = await cookies();
  return decodeFlow(store.get(FLOW_COOKIE)?.value, flowSecret());
}

export async function clearFlow(): Promise<void> {
  (await cookies()).delete({ name: FLOW_COOKIE, path: "/admin" });
}

export type IssueCodeResult = { status: "sent" } | { status: "rate_limited"; minutes: number } | { status: "failed" };

/**
 * Asks Better Auth to email a code. Limits: 5 per address and 20 per IP in
 * 15 minutes. The address limit is the one that stops a person's inbox being
 * flooded; the IP limit is generous because a campus network shares addresses.
 */
export async function issueCode(rawEmail: string): Promise<IssueCodeResult> {
  const email = normaliseEmail(rawEmail);
  const db = getDb();
  const { ip } = await getRequestMeta();

  const byEmail = await consumeRateLimit(db, `code:email:${email}`, { windowSeconds: 900, max: 5 });
  const byIp = await consumeRateLimit(db, `code:ip:${ip ?? "unknown"}`, { windowSeconds: 900, max: 20 });
  if (!byEmail.allowed || !byIp.allowed) {
    const seconds = Math.max(byEmail.retryAfterSeconds, byIp.retryAfterSeconds);
    return { status: "rate_limited", minutes: Math.max(1, Math.ceil(seconds / 60)) };
  }

  try {
    const requestHeaders = await headers();
    const { error } = await captureSendFailure(() =>
      getAuth().api.sendVerificationOTP({ body: { email, type: "sign-in" }, headers: requestHeaders }),
    );
    if (error) throw error;
    return { status: "sent" };
  } catch (error) {
    console.error("[auth] could not send sign-in code", error);
    return { status: "failed" };
  }
}

/** Domain rule for the form: same decision the Better Auth hooks make. */
export async function mayRequestCode(email: string): Promise<boolean> {
  return isEmailPermitted(getDb(), email, getAllowedDomains());
}
