/**
 * Tracking and cancelling, from the public side. A person holds a reference
 * number and a private token. Every attempt is counted per address first
 * (`consumeTrackingAttempt`), then `resolveTrackingLink` checks the pair, and
 * only then is anything read or changed. Every failure, whatever the reason,
 * looks the same to the caller: `none`. Cancelling is allowed only to the
 * person who holds the link, and only in the statuses the loan's state machine
 * gives the public (requested and approved, before anything is collected).
 */

import { asc, eq } from "drizzle-orm";
import { allowedTransitions, consumeTrackingAttempt, publicCaseView, resolveTrackingLink, transition, type CaseActor, type PublicCaseView, type TrackedCase } from "@/lib/cases";
import type { AuditExecutor } from "@/lib/db/audit";
import { borrowingLines, borrowingRequests, equipmentItems } from "@/lib/db/schema/borrowing";
import { localePath, type Locale, type LocaleString } from "@/lib/i18n/config";
import { SITE_URL } from "@/lib/site-url";
import { CANCELLABLE_STATUSES } from "../constants";

const REFERENCE = /^BR-\d{4}-\d{4,}$/;
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

/** The private link for a request. The token travels in the query only until `/track/link` swaps it for a cookie and redirects. */
export function trackingLinkUrl(locale: Locale, reference: string, token: string, origin: string = SITE_URL): string {
  const query = new URLSearchParams({ ref: reference, t: token });
  return `${origin}${localePath(locale, "/borrow/track/link")}?${query.toString()}`;
}

export type TrackedLookup = { state: "ok"; tracked: TrackedCase } | { state: "limited"; retryAfterSeconds: number } | { state: "none" };

/** Counts the attempt and resolves the pair. A link for anything but a loan request is `none`. */
export async function lookupTracked(db: AuditExecutor, reference: string, token: string, ip: string | null, now: Date = new Date()): Promise<TrackedLookup> {
  const attempt = await consumeTrackingAttempt(db, ip ?? "unknown", now.getTime());
  if (!attempt.allowed) return { state: "limited", retryAfterSeconds: attempt.retryAfterSeconds };
  const tracked = await resolveTrackingLink(db, reference, token, now);
  return tracked && tracked.service === "borrowing" && !tracked.claimId ? { state: "ok", tracked } : { state: "none" };
}

export interface TrackedLine {
  name: LocaleString;
  unit: LocaleString;
  quantity: number;
}

export interface TrackedLoan {
  view: PublicCaseView;
  collectAt: Date;
  returnDueAt: Date;
  lines: TrackedLine[];
  canCancel: boolean;
}

export type TrackedView = { state: "ok"; loan: TrackedLoan } | { state: "limited"; retryAfterSeconds: number } | { state: "none" };

export async function openTracked(db: AuditExecutor, reference: string, token: string, ip: string | null, now: Date = new Date()): Promise<TrackedView> {
  const found = await lookupTracked(db, reference, token, ip, now);
  if (found.state !== "ok") return found;
  const id = found.tracked.id;
  const view = await publicCaseView(db, id);
  const [request] = await db.select().from(borrowingRequests).where(eq(borrowingRequests.caseId, id));
  if (!request) return { state: "none" };
  const rows = await db
    .select({ quantity: borrowingLines.quantity, nameTh: equipmentItems.nameTh, nameEn: equipmentItems.nameEn, unitTh: equipmentItems.unitTh, unitEn: equipmentItems.unitEn })
    .from(borrowingLines)
    .innerJoin(equipmentItems, eq(equipmentItems.id, borrowingLines.itemId))
    .where(eq(borrowingLines.caseId, id))
    .orderBy(asc(equipmentItems.position), asc(equipmentItems.nameEn));
  return {
    state: "ok",
    loan: {
      view,
      collectAt: request.collectAt,
      returnDueAt: request.returnDueAt,
      lines: rows.map((r) => ({ name: { th: r.nameTh, en: r.nameEn }, unit: { th: r.unitTh, en: r.unitEn }, quantity: r.quantity })),
      canCancel: (CANCELLABLE_STATUSES as readonly string[]).includes(view.status) && allowedTransitions(view.service, view.kind, view.status, "public").includes("cancelled"),
    },
  };
}

interface Ctx {
  ip: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

const publicActor = (ctx: Ctx): CaseActor => ({ kind: "public", context: { ip: ctx.ip, userAgent: ctx.userAgent ?? null, requestId: ctx.requestId ?? null } });

export type ActionOutcome = "done" | "limited" | "none" | "not_allowed";

/** Cancels the request for the person who holds the link, while it has not been collected. */
export async function cancelTracked(db: AuditExecutor, reference: string, token: string, ctx: Ctx, now: Date = new Date()): Promise<ActionOutcome> {
  const found = await lookupTracked(db, reference, token, ctx.ip, now);
  if (found.state === "limited") return "limited";
  if (found.state === "none") return "none";
  const { tracked } = found;
  if (!(CANCELLABLE_STATUSES as readonly string[]).includes(tracked.status)) return "not_allowed";
  if (!allowedTransitions(tracked.service, tracked.kind, tracked.status, "public").includes("cancelled")) return "not_allowed";
  try {
    await transition(db, tracked.id, "cancelled", publicActor(ctx), { expectedFrom: tracked.status, now });
  } catch {
    return "not_allowed";
  }
  return "done";
}
