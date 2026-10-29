/**
 * Tracking, withdrawing, reopening and the survey, from the public side. A
 * person holds a reference number and a private token. Every attempt is
 * counted per address first (`consumeTrackingAttempt`), then
 * `resolveTrackingLink` checks the pair, and only then is anything read or
 * changed. Every failure, whatever the reason, looks the same to the caller:
 * `none`. Doing something to the complaint is allowed only to the person who
 * holds the link, and only in the statuses the state machine gives them.
 */

import { and, desc, eq } from "drizzle-orm";
import { allowedTransitions, consumeTrackingAttempt, publicCaseView, resolveTrackingLink, transition, type CaseActor, type PublicCaseView, type TrackedCase } from "@/lib/cases";
import type { AuditExecutor } from "@/lib/db/audit";
import { caseEvents } from "@/lib/db/schema/cases";
import { complaintCases, complaintCategories, type ComplaintIdentity } from "@/lib/db/schema/complaints";
import { localePath, type Locale, type LocaleString } from "@/lib/i18n/config";
import { SITE_URL } from "@/lib/site-url";
import { ComplaintError } from "../errors";
import { loadRedirectTarget, type RedirectTarget } from "../redirect";
import { surveyState, submitSurvey, type SurveyOutcome } from "../survey";
import { canReopenNow, reopenComplaint, reopenWindowEnds } from "../workflow";

const REFERENCE = /^CP-\d{4}-\d{4,}$/;
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

/** The private link for a complaint. The token travels in the query only until `/track/link` swaps it for a cookie and redirects. */
export function trackingLinkUrl(locale: Locale, reference: string, token: string, origin: string = SITE_URL): string {
  const query = new URLSearchParams({ ref: reference, t: token });
  return `${origin}${localePath(locale, "/complaints/track/link")}?${query.toString()}`;
}

export type TrackedLookup = { state: "ok"; tracked: TrackedCase } | { state: "limited"; retryAfterSeconds: number } | { state: "none" };

/** Counts the attempt and resolves the pair. A link for anything but a complaint is `none`. */
export async function lookupTracked(db: AuditExecutor, reference: string, token: string, ip: string | null, now: Date = new Date()): Promise<TrackedLookup> {
  const attempt = await consumeTrackingAttempt(db, ip ?? "unknown", now.getTime());
  if (!attempt.allowed) return { state: "limited", retryAfterSeconds: attempt.retryAfterSeconds };
  const tracked = await resolveTrackingLink(db, reference, token, now);
  return tracked && tracked.service === "complaint" && !tracked.claimId ? { state: "ok", tracked } : { state: "none" };
}

export interface TrackedComplaint {
  view: PublicCaseView;
  identity: ComplaintIdentity;
  category: { key: string; name: LocaleString; offerWellbeing: boolean };
  acknowledgeDueAt: Date;
  resolveDueAt: Date;
  acknowledgedAt: Date | null;
  resolvedAt: Date | null;
  /** The latest outcome staff wrote, in one or both languages. */
  outcome: { th: string | null; en: string | null } | null;
  /** Staff pointed the person to the TU wellbeing centre. */
  wellbeingRouted: boolean;
  /** Set once the complaint was redirected to a faculty or a course: who to contact instead. */
  redirect: RedirectTarget | null;
  canWithdraw: boolean;
  canReopen: boolean;
  reopenUntil: Date | null;
  survey: "open" | "answered" | "unavailable";
}

export type TrackedView = { state: "ok"; complaint: TrackedComplaint } | { state: "limited"; retryAfterSeconds: number } | { state: "none" };

export async function openTracked(db: AuditExecutor, reference: string, token: string, ip: string | null, now: Date = new Date()): Promise<TrackedView> {
  const found = await lookupTracked(db, reference, token, ip, now);
  if (found.state !== "ok") return found;
  const id = found.tracked.id;
  const view = await publicCaseView(db, id);
  const [cc] = await db
    .select({ cc: complaintCases, category: complaintCategories })
    .from(complaintCases)
    .innerJoin(complaintCategories, eq(complaintCategories.id, complaintCases.categoryId))
    .where(eq(complaintCases.caseId, id));
  if (!cc) return { state: "none" };
  const [outcome] = await db
    .select({ th: caseEvents.bodyTh, en: caseEvents.bodyEn })
    .from(caseEvents)
    .where(and(eq(caseEvents.caseId, id), eq(caseEvents.type, "resolution"), eq(caseEvents.visibility, "public")))
    .orderBy(desc(caseEvents.createdAt))
    .limit(1);
  const showOutcome = view.status === "resolved" || view.status === "closed";
  return {
    state: "ok",
    complaint: {
      view,
      identity: cc.cc.identity as ComplaintIdentity,
      category: { key: cc.category.key, name: { th: cc.category.nameTh, en: cc.category.nameEn }, offerWellbeing: cc.category.offerWellbeing },
      acknowledgeDueAt: cc.cc.acknowledgeDueAt,
      resolveDueAt: cc.cc.resolveDueAt,
      acknowledgedAt: cc.cc.acknowledgedAt,
      resolvedAt: cc.cc.resolvedAt,
      outcome: showOutcome && outcome && (outcome.th || outcome.en) ? outcome : null,
      wellbeingRouted: Boolean(cc.cc.wellbeingRoutedAt),
      redirect: view.status === "redirected" ? await loadRedirectTarget(db, id) : null,
      canWithdraw: allowedTransitions(view.service, view.kind, view.status, "public").includes("withdrawn"),
      canReopen: canReopenNow(cc.cc.resolvedAt, view.status, now),
      reopenUntil: view.status === "resolved" && cc.cc.resolvedAt ? reopenWindowEnds(cc.cc.resolvedAt) : null,
      survey: await surveyState(db, id),
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

/** Withdraws the complaint for the person who holds the link. */
export async function withdrawTracked(db: AuditExecutor, reference: string, token: string, ctx: Ctx, now: Date = new Date()): Promise<ActionOutcome> {
  const found = await lookupTracked(db, reference, token, ctx.ip, now);
  if (found.state === "limited") return "limited";
  if (found.state === "none") return "none";
  const { tracked } = found;
  if (!allowedTransitions(tracked.service, tracked.kind, tracked.status, "public").includes("withdrawn")) return "not_allowed";
  try {
    await transition(db, tracked.id, "withdrawn", publicActor(ctx), { expectedFrom: tracked.status, now });
  } catch {
    return "not_allowed";
  }
  return "done";
}

/** Reopens a resolved complaint for the person who holds the link, inside the reopen window. */
export async function reopenTracked(db: AuditExecutor, reference: string, token: string, reason: string, ctx: Ctx, opts: { now?: Date } = {}): Promise<ActionOutcome> {
  const now = opts.now ?? new Date();
  const found = await lookupTracked(db, reference, token, ctx.ip, now);
  if (found.state === "limited") return "limited";
  if (found.state === "none") return "none";
  try {
    await reopenComplaint(db, found.tracked.id, { reason }, publicActor(ctx), { now });
  } catch (error) {
    if (error instanceof ComplaintError || (error instanceof Error && error.name === "CaseError")) return "not_allowed";
    throw error;
  }
  return "done";
}

/** Records the satisfaction survey for the person who holds the link. */
export async function surveyTracked(
  db: AuditExecutor,
  reference: string,
  token: string,
  input: { score: number | null; comment: string },
  ctx: Ctx,
  now: Date = new Date(),
): Promise<ActionOutcome | SurveyOutcome> {
  const found = await lookupTracked(db, reference, token, ctx.ip, now);
  if (found.state === "limited") return "limited";
  if (found.state === "none") return "none";
  return submitSurvey(db, found.tracked.id, input, { ip: ctx.ip, userAgent: ctx.userAgent ?? null, requestId: ctx.requestId ?? null }, { now });
}
