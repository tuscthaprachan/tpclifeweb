/**
 * Finishing the journey: turns saved answers into a complaint (../create.ts),
 * in one transaction, and counts the attempt against the address's limit first.
 */

import { consumeRateLimit, type RateResult, type RateRule } from "@/lib/auth/rate-limit";
import type { ContactInput, RequestContext } from "@/lib/cases";
import type { PiiEnv } from "@/lib/crypto/pii";
import type { AuditExecutor } from "@/lib/db/audit";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { listCategories } from "../categories";
import { createComplaint } from "../create";
import { isIdentity, type DraftValues } from "./steps";
import { effectivePreferred, firstProblem, type FieldErrors } from "./validate";

export interface SubmitContext {
  locale: Locale;
  ip?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

export interface SubmitOutcome {
  caseId: string;
  reference: string;
  /** The private tracking token, to be shown once. */
  token: string;
  categoryKey: string;
}

/** The answers do not pass validation (they should have been caught page by page). */
export class JourneyInvalidError extends Error {
  constructor(
    readonly step: string,
    readonly errors: FieldErrors,
  ) {
    super(`Journey answers are not valid at ${step}.`);
    this.name = "JourneyInvalidError";
  }
}

/** 10 complaints per address per hour. */
export const SUBMIT_RATE_RULE: RateRule = { windowSeconds: 60 * 60, max: 10 };
/** 30 evidence uploads per address per hour. */
export const UPLOAD_RATE_RULE: RateRule = { windowSeconds: 60 * 60, max: 30 };

export function consumeSubmitAttempt(db: AuditExecutor, ip: string | null, now?: number): Promise<RateResult> {
  return consumeRateLimit(db, `cpsubmit:${ip ?? "unknown"}`, SUBMIT_RATE_RULE, now);
}

export function consumeUploadAttempt(db: AuditExecutor, ip: string | null, now?: number): Promise<RateResult> {
  return consumeRateLimit(db, `cpupload:${ip ?? "unknown"}`, UPLOAD_RATE_RULE, now);
}

/** The contact to store: none for an anonymous complaint; for a pseudonymous one the name is optional. */
export function contactFrom(v: DraftValues): ContactInput | null {
  if (v.identity === "anonymous") return null;
  return {
    role: "reporter",
    name: v.name || null,
    email: v.email || null,
    phone: v.phone || null,
    lineId: v.lineId || null,
    preferredContact: effectivePreferred(v),
    consentContact: v.consent === "yes",
  };
}

/** Submits the complaint. Throws `JourneyInvalidError`, `ComplaintError`, `PiiUnavailableError`; nothing is written then. */
export async function submitComplaint(
  db: AuditExecutor,
  values: DraftValues,
  ctx: SubmitContext,
  opts: { journeyId?: string | null; now?: Date; env?: PiiEnv } = {},
): Promise<SubmitOutcome> {
  const categories = await listCategories(db, { activeOnly: true });
  const problem = firstProblem(values, categories.map((c) => c.key));
  if (problem) throw new JourneyInvalidError(problem.step, problem.errors);
  if (!isIdentity(values.identity)) throw new JourneyInvalidError("identity", { identity: "cpErrIdentity" });
  const category = categories.find((c) => c.key === values.category)!;
  const context: RequestContext = { ip: ctx.ip ?? null, userAgent: ctx.userAgent ?? null, requestId: ctx.requestId ?? null };
  const created = await createComplaint(
    db,
    {
      categoryId: category.id,
      identity: values.identity,
      description: values.description,
      when: values.when || null,
      where: values.where || null,
      remedy: values.remedy || null,
      contact: contactFrom(values),
      locale: isLocale(ctx.locale) ? ctx.locale : "th",
      journeyId: opts.journeyId ?? null,
    },
    { kind: "public", context },
    { now: opts.now, env: opts.env },
  );
  return { ...created, categoryKey: category.key };
}
