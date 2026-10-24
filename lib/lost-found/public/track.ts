/**
 * Tracking and withdrawing from the public side. A person holds a reference
 * number and a private token. Every attempt is counted per address first
 * (`consumeTrackingAttempt`), then `resolveTrackingLink` checks the pair, and
 * only then is anything read. Every failure, whatever the reason, looks the
 * same to the caller: `none`.
 */

import { eq } from "drizzle-orm";
import { allowedTransitions, consumeTrackingAttempt, publicCaseView, resolveTrackingLink, transition, type CaseActor, type PublicCaseView, type TrackedCase } from "@/lib/cases";
import type { AuditExecutor } from "@/lib/db/audit";
import { lostFoundItems } from "@/lib/db/schema/content/lost-found";
import { localePath, type Locale } from "@/lib/i18n/config";
import { SITE_URL } from "@/lib/site-url";

const REFERENCE = /^LF-\d{4}-\d{4,}$/;
const TOKEN = /[A-Za-z0-9_-]{43}/;

/** Reads a reference and a pasted private link (or just its code) from what a person typed. Null if either is unusable. */
export function parseTrackingInput(referenceRaw: string, linkRaw: string): { reference: string; token: string } | null {
  const reference = referenceRaw.trim().toUpperCase().replace(/\s+/g, "");
  if (!REFERENCE.test(reference)) return null;
  const link = linkRaw.trim();
  if (!link || link.length > 2000) return null;
  let candidate = link;
  try {
    const t = new URL(link).searchParams.get("t");
    if (t) candidate = t;
  } catch {
    // Not a URL: treat it as the bare code.
  }
  const token = candidate.match(TOKEN)?.[0];
  return token ? { reference, token } : null;
}

/** The private link for a case. The token travels in the query only until `/track/link` swaps it for a cookie and redirects. */
export function trackingLinkUrl(locale: Locale, reference: string, token: string, origin: string = SITE_URL): string {
  const query = new URLSearchParams({ ref: reference, t: token });
  return `${origin}${localePath(locale, "/lost-and-found/track/link")}?${query.toString()}`;
}

export type TrackedLookup =
  | { state: "ok"; tracked: TrackedCase }
  | { state: "limited"; retryAfterSeconds: number }
  | { state: "none" };

/** Counts the attempt and resolves the pair. */
export async function lookupTracked(db: AuditExecutor, reference: string, token: string, ip: string | null, now: Date = new Date()): Promise<TrackedLookup> {
  const attempt = await consumeTrackingAttempt(db, ip ?? "unknown", now.getTime());
  if (!attempt.allowed) return { state: "limited", retryAfterSeconds: attempt.retryAfterSeconds };
  const tracked = await resolveTrackingLink(db, reference, token, now);
  return tracked ? { state: "ok", tracked } : { state: "none" };
}

export type TrackedView =
  | { state: "ok"; view: PublicCaseView; canWithdraw: boolean }
  | { state: "limited"; retryAfterSeconds: number }
  | { state: "none" };

export async function openTracked(db: AuditExecutor, reference: string, token: string, ip: string | null, now: Date = new Date()): Promise<TrackedView> {
  const found = await lookupTracked(db, reference, token, ip, now);
  if (found.state !== "ok") return found;
  const view = await publicCaseView(db, found.tracked.id);
  return { state: "ok", view, canWithdraw: allowedTransitions(view.service, view.kind, view.status, "public").includes("withdrawn") };
}

export type WithdrawOutcome = "withdrawn" | "limited" | "none" | "not_allowed";

/**
 * Withdraws a lost report for the person who holds the link, and takes its
 * listing off the register. The status check is the engine's, for a public
 * actor after the link resolved.
 */
export async function withdrawTracked(
  db: AuditExecutor,
  reference: string,
  token: string,
  ctx: { ip: string | null; userAgent?: string | null; requestId?: string | null },
  now: Date = new Date(),
): Promise<WithdrawOutcome> {
  const found = await lookupTracked(db, reference, token, ctx.ip, now);
  if (found.state === "limited") return "limited";
  if (found.state === "none") return "none";
  const { tracked } = found;
  if (!allowedTransitions(tracked.service, tracked.kind, tracked.status, "public").includes("withdrawn")) return "not_allowed";
  const actor: CaseActor = { kind: "public", context: { ip: ctx.ip, userAgent: ctx.userAgent ?? null, requestId: ctx.requestId ?? null } };
  try {
    await transition(db, tracked.id, "withdrawn", actor, { expectedFrom: tracked.status, now });
  } catch {
    return "not_allowed";
  }
  await db.update(lostFoundItems).set({ registerStatus: "withdrawn", resolvedAt: now }).where(eq(lostFoundItems.caseId, tracked.id));
  return "withdrawn";
}
