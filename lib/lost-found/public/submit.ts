/**
 * Submitting the public journeys. Each submission is ONE transaction, so
 * either everything below exists or nothing does (and the reference number
 * is given back):
 *
 *   report (lost or found)
 *     case (service lost_found, public actor) with the person's contact, encrypted
 *     a draft listing in `lost_found_items`, linked by `case_id`, for staff to review
 *     the private identifying detail (lost only), encrypted
 *     a private tracking link
 *   claim
 *     the claimant as a contact on the found item's case
 *     a claim record with the encrypted answer
 *     the found item case moved to `claim_pending`
 *     a private tracking link
 *
 * The legacy plaintext columns `lost_found_items.submitter_contact` and
 * `staff_verification_detail` are never written. A public listing is only
 * ever a draft here; staff publish it.
 */

import { and, eq } from "drizzle-orm";
import { categoryLabel } from "@/components/domain/lostfound/categoryLabel";
import { addContact, createCase, issueTrackingLink, publicStatusLabel, type CaseActor, type ContactInput, type RequestContext } from "@/lib/cases";
import { appendEvent, lockCase, touchCase } from "@/lib/cases/internal";
import { consumeRateLimit, type RateResult, type RateRule } from "@/lib/auth/rate-limit";
import { encryptPii, type PiiEnv } from "@/lib/crypto/pii";
import { recordAudit, type AuditContext, type AuditExecutor } from "@/lib/db/audit";
import { caseContacts, cases } from "@/lib/db/schema/cases";
import { lostFoundItems } from "@/lib/db/schema/content/lost-found";
import { lostFoundClaims } from "@/lib/db/schema/lost-found-staff";
import { lostFoundIdentifyingDetails } from "@/lib/db/schema/lost-found-cases";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { claimAnswerAad, identifyingDetailAad } from "./aad";
import { type DraftValues } from "./steps";
import { effectivePreferred, firstProblem, parseDate, type FieldErrors } from "./validate";

export interface SubmitContext {
  locale: Locale;
  ip?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

export interface SubmitOutcome {
  caseId: string;
  reference: string;
  /** The private tracking token, to be shown on the confirmation page for a short time. */
  token: string;
}

/** A journey whose answers do not pass validation (they should have been caught page by page). */
export class JourneyInvalidError extends Error {
  constructor(
    readonly step: string,
    readonly errors: FieldErrors,
  ) {
    super(`Journey answers are not valid at ${step}.`);
    this.name = "JourneyInvalidError";
  }
}

/** The found item cannot be claimed online (no case, not published, or already closed). */
export class ClaimUnavailableError extends Error {
  constructor(readonly reason: "not_found" | "no_case" | "closed") {
    super(`This item cannot be claimed online (${reason}).`);
    this.name = "ClaimUnavailableError";
  }
}

/** 10 submissions per address per hour, for both reports and claims. */
export const SUBMIT_RATE_RULE: RateRule = { windowSeconds: 60 * 60, max: 10 };

export function consumeSubmitAttempt(db: AuditExecutor, ip: string | null, now?: number): Promise<RateResult> {
  return consumeRateLimit(db, `lfsubmit:${ip ?? "unknown"}`, SUBMIT_RATE_RULE, now);
}

function publicActor(ctx: SubmitContext): CaseActor {
  const context: RequestContext = { ip: ctx.ip ?? null, userAgent: ctx.userAgent ?? null, requestId: ctx.requestId ?? null };
  return { kind: "public", context };
}

function auditContext(ctx: SubmitContext): AuditContext {
  return { actorUserId: null, ip: ctx.ip ?? null, userAgent: ctx.userAgent ?? null, requestId: ctx.requestId ?? null };
}

/** The contact the person gave, or null when a finder gave none. */
export function contactFrom(role: ContactInput["role"], v: DraftValues): ContactInput | null {
  if (!v.name && !v.email && !v.phone && !v.lineId) return null;
  return {
    role,
    name: v.name || null,
    email: v.email || null,
    phone: v.phone || null,
    lineId: v.lineId || null,
    preferredContact: effectivePreferred(v),
    consentContact: v.consent === "yes",
  };
}

const WHERE_NOW_NOTE: Record<string, string> = {
  will_hand_in: "The finder has the item and says they will take it to the TUSU or TUSC desk.",
  left_there: "The finder left the item where they found it.",
  need_help: "The finder has the item and cannot take it to the desk. Contact them to arrange collection.",
};

/** Submits a lost report or a found report. Throws `JourneyInvalidError`, `PiiUnavailableError`, or whatever the database raises (the transaction then leaves nothing behind). */
export async function submitReport(
  db: AuditExecutor,
  kind: "lost" | "found",
  values: DraftValues,
  ctx: SubmitContext,
  opts: { now?: Date; env?: PiiEnv } = {},
): Promise<SubmitOutcome> {
  const now = opts.now ?? new Date();
  const problem = firstProblem(kind, values, now);
  if (problem) throw new JourneyInvalidError(problem.step, problem.errors);
  const occurredOn = parseDate(values.day, values.month, values.year, now)!;
  const actor = publicActor(ctx);
  const contact = contactFrom(kind === "lost" ? "reporter" : "finder", values);
  const locale = isLocale(ctx.locale) ? ctx.locale : "th";
  const category = values.category as Parameters<typeof categoryLabel>[0];

  return db.transaction(async (tx) => {
    const created = await createCase(
      tx,
      {
        service: "lost_found",
        kind,
        subtype: values.category,
        summary: `${kind === "lost" ? "Lost" : "Found"}: ${categoryLabel(category, "en")}`,
        locale,
        contacts: contact ? [contact] : [],
      },
      actor,
      { now, env: opts.env },
    );

    // The reporter writes in one language; the other side stays empty until staff translate it on review.
    const side = (text: string) => ({ th: locale === "th" ? text : "", en: locale === "en" ? text : "" });
    const title = side(values.title);
    const description = side(values.description);
    const note = side(values.locationNote);
    const [item] = await tx
      .insert(lostFoundItems)
      .values({
        reference: created.reference,
        slug: created.reference.toLowerCase(),
        kind,
        titleTh: title.th,
        titleEn: title.en,
        descriptionTh: description.th,
        descriptionEn: description.en,
        category,
        placeId: values.placeId || null,
        locationNoteTh: values.locationNote ? note.th : null,
        locationNoteEn: values.locationNote ? note.en : null,
        occurredOn,
        registerStatus: "open",
        // Waiting for staff review. Public reads only ever see published rows.
        status: "draft",
        // A starting default for staff to correct; the reporter cannot know which body will hold the item.
        owner: "tusc",
        submittedByStudent: true,
        caseId: created.id,
        createdAt: now,
      })
      .returning({ id: lostFoundItems.id });
    if (!item) throw new Error("Could not create the draft listing.");

    if (kind === "lost") {
      const [reporter] = await tx
        .select({ id: caseContacts.id })
        .from(caseContacts)
        .where(and(eq(caseContacts.caseId, created.id), eq(caseContacts.role, "reporter")));
      if (!reporter) throw new Error("The reporter contact was not saved.");
      const id = crypto.randomUUID();
      await tx.insert(lostFoundIdentifyingDetails).values({
        id,
        caseId: created.id,
        contactId: reporter.id,
        detailEnc: encryptPii(values.detail, identifyingDetailAad(id), opts.env),
        createdAt: now,
      });
    } else {
      await appendEvent(tx, created.id, actor, now, { type: "internal_note", body: WHERE_NOW_NOTE[values.whereNow] });
    }

    await recordAudit(tx, {
      ...auditContext(ctx),
      action: "lost_found_item.report",
      entityType: "lost_found_item",
      entityId: item.id,
      after: { reference: created.reference, kind, category, status: "draft", caseId: created.id },
    });
    const link = await issueTrackingLink(tx, created.id, actor, { now });
    return { caseId: created.id, reference: created.reference, token: link.token };
  });
}

export interface ClaimTarget {
  itemId: string;
  caseId: string;
  reference: string;
}

/**
 * The found listing behind `slug`, if it is published, a found item, still
 * open for claims and backed by a case. Reads only the ids; nothing private.
 */
export async function findClaimTarget(db: AuditExecutor, slug: string): Promise<ClaimTarget> {
  const [item] = await db
    .select({ id: lostFoundItems.id, caseId: lostFoundItems.caseId, reference: lostFoundItems.reference, registerStatus: lostFoundItems.registerStatus })
    .from(lostFoundItems)
    .where(and(eq(lostFoundItems.slug, slug), eq(lostFoundItems.status, "published"), eq(lostFoundItems.kind, "found")))
    .limit(1);
  if (!item) throw new ClaimUnavailableError("not_found");
  if (!item.caseId) throw new ClaimUnavailableError("no_case");
  if (item.registerStatus !== "open" && item.registerStatus !== "matched") throw new ClaimUnavailableError("closed");
  const [row] = await db.select({ status: cases.status }).from(cases).where(eq(cases.id, item.caseId));
  if (!row || ["returned", "withdrawn"].includes(row.status)) throw new ClaimUnavailableError("closed");
  return { itemId: item.id, caseId: item.caseId, reference: item.reference };
}

/**
 * The found item case moves to `claim_pending` when it is `logged` or
 * `listed`. The engine's `transition` does not let a public actor do this
 * (FOUND.publicActorTo is empty), so the same writes are made here: lock,
 * status, public event, audit. A case already `ready_to_collect` for someone
 * else is left alone, so a stranger cannot disturb a confirmed match; the
 * claim record is still there for staff.
 */
async function markClaimPending(tx: AuditExecutor, caseId: string, actor: CaseActor, now: Date, audit: AuditContext): Promise<boolean> {
  const row = await lockCase(tx, caseId);
  if (row.status !== "logged" && row.status !== "listed") return false;
  await touchCase(tx, caseId, actor, now, { status: "claim_pending" });
  await appendEvent(tx, caseId, actor, now, {
    type: "status_changed",
    visibility: publicStatusLabel(row.service, row.kind, "claim_pending") ? "public" : "internal",
    fromStatus: row.status,
    toStatus: "claim_pending",
  });
  await recordAudit(tx, { ...audit, action: "case.transition", entityType: "case", entityId: caseId, before: { status: row.status }, after: { status: "claim_pending", via: "public_claim" } });
  return true;
}

/** Submits a claim on a published found item. Throws `JourneyInvalidError`, `ClaimUnavailableError`, `PiiUnavailableError`. */
export async function submitClaim(
  db: AuditExecutor,
  slug: string,
  values: DraftValues,
  ctx: SubmitContext,
  opts: { now?: Date; env?: PiiEnv } = {},
): Promise<SubmitOutcome> {
  const now = opts.now ?? new Date();
  const problem = firstProblem("claim", values, now);
  if (problem) throw new JourneyInvalidError(problem.step, problem.errors);
  const target = await findClaimTarget(db, slug);
  const actor = publicActor(ctx);
  const contact = contactFrom("claimant", values)!;

  return db.transaction(async (tx) => {
    const contactId = await addContact(tx, target.caseId, contact, actor, { now, env: opts.env });
    const id = crypto.randomUUID();
    await tx.insert(lostFoundClaims).values({
      id,
      caseId: target.caseId,
      claimantContactId: contactId,
      answerEnc: encryptPii(values.proof, claimAnswerAad(id), opts.env),
      createdAt: now,
    });
    await appendEvent(tx, target.caseId, actor, now, { type: "internal_note", body: "A claim was made from the public listing.", metadata: { claimId: id } });
    const moved = await markClaimPending(tx, target.caseId, actor, now, auditContext(ctx));
    await recordAudit(tx, {
      ...auditContext(ctx),
      action: "lost_found_claim.create",
      entityType: "case",
      entityId: target.caseId,
      after: { claimId: id, reference: target.reference, movedToClaimPending: moved },
    });
    // The link is for this claim only: it shows the claim, never the item's other claims.
    const link = await issueTrackingLink(tx, target.caseId, actor, { now, claimId: id });
    return { caseId: target.caseId, reference: target.reference, token: link.token };
  });
}

