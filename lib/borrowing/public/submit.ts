/**
 * Finishing the journey: turns saved answers into a loan request
 * (../create.ts) in one transaction, and counts the attempt against the
 * address's limit first. Also loads what validation needs from the database,
 * because the same checks run page by page and again here.
 */

import { eq } from "drizzle-orm";
import { consumeRateLimit, type RateResult, type RateRule } from "@/lib/auth/rate-limit";
import type { ContactInput } from "@/lib/cases";
import type { PiiEnv } from "@/lib/crypto/pii";
import type { AuditExecutor } from "@/lib/db/audit";
import { faculties } from "@/lib/db/schema/content/faculties";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { loadHolds, listInventory } from "../availability";
import { depositCardsFor } from "../rules";
import { createLoanRequest } from "../create";
import { BorrowingError } from "../errors";
import { quantityField, type DraftValues } from "./steps";
import { firstProblem, normalisePhone, periodOf, type FieldErrors, type ValidationContext } from "./validate";

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
  collectAt: Date;
  /** Original cards to bring at collection. */
  cards: number;
}

/** The answers do not pass validation (they should have been caught page by page, or the stock moved). */
export class JourneyInvalidError extends Error {
  constructor(
    readonly step: string,
    readonly errors: FieldErrors,
  ) {
    super(`Journey answers are not valid at ${step}.`);
    this.name = "JourneyInvalidError";
  }
}

/** 10 requests per address per hour. */
export const SUBMIT_RATE_RULE: RateRule = { windowSeconds: 60 * 60, max: 10 };

export function consumeSubmitAttempt(db: AuditExecutor, ip: string | null, now?: number): Promise<RateResult> {
  return consumeRateLimit(db, `brsubmit:${ip ?? "unknown"}`, SUBMIT_RATE_RULE, now);
}

/** The ids of the faculties a student can pick. */
export async function listFacultyIds(db: AuditExecutor): Promise<string[]> {
  const rows = await db.select({ id: faculties.id }).from(faculties).where(eq(faculties.status, "published"));
  return rows.map((r) => r.id);
}

/** Reads the inventory, the faculties and, once the dates are good, the holds over the period. */
export async function loadContext(db: AuditExecutor, values: DraftValues, opts: { now?: Date } = {}): Promise<ValidationContext> {
  const now = opts.now ?? new Date();
  const period = periodOf(values);
  const [inventory, facultyIds, holds] = await Promise.all([
    listInventory(db, { activeOnly: true }),
    listFacultyIds(db),
    period ? loadHolds(db, { from: period.collectAt, to: period.returnAt }, { now }) : Promise.resolve([]),
  ]);
  return { now, inventory, holds, faculties: facultyIds };
}

/** The borrower's contact: always the phone, the email if given, and the email is preferred when there is one. */
export function contactFrom(v: DraftValues): ContactInput {
  return {
    role: "borrower",
    name: v.name,
    email: v.email || null,
    phone: normalisePhone(v.phone),
    preferredContact: v.email ? "email" : "phone",
    consentContact: true,
  };
}

/** Submits the request. Throws `JourneyInvalidError`, `BorrowingError`, `PiiUnavailableError`; nothing is written then. */
export async function submitRequest(
  db: AuditExecutor,
  values: DraftValues,
  ctx: SubmitContext,
  opts: { now?: Date; env?: PiiEnv } = {},
): Promise<SubmitOutcome> {
  const now = opts.now ?? new Date();
  const context = await loadContext(db, values, { now });
  const problem = firstProblem(values, context);
  if (problem) throw new JourneyInvalidError(problem.step, problem.errors);
  const period = periodOf(values)!;
  const lines = values.items.map((itemId) => ({ itemId, quantity: Number(values.quantities[itemId]) }));
  const chosen = context.inventory.filter((c) => c.items.some((i) => values.items.includes(i.id)));
  const student = values.student === "yes";
  try {
    const created = await createLoanRequest(
      db,
      {
        borrowerKind: values.borrower === "group" ? "group" : "personal",
        groupName: values.borrower === "group" ? values.groupName : null,
        eventName: values.eventName,
        venue: values.venue,
        purpose: values.purpose,
        collectAt: period.collectAt,
        returnDueAt: period.returnAt,
        lines,
        studentId: student ? values.studentId : null,
        facultyId: student ? values.faculty : null,
        affiliation: student ? null : values.affiliation,
        contact: contactFrom(values),
        locale: isLocale(ctx.locale) ? ctx.locale : "th",
      },
      { kind: "public", context: { ip: ctx.ip ?? null, userAgent: ctx.userAgent ?? null, requestId: ctx.requestId ?? null } },
      { now, env: opts.env },
    );
    return { caseId: created.caseId, reference: created.reference, token: created.token, collectAt: period.collectAt, cards: depositCardsFor(chosen) };
  } catch (error) {
    if (error instanceof BorrowingError) throw new JourneyInvalidError(...stepFor(error, values, context));
    throw error;
  }
}

/** Which page to send a person back to when the transaction found the rules or the stock had moved. */
function stepFor(error: BorrowingError, values: DraftValues, context: ValidationContext): [string, FieldErrors] {
  const again = firstProblem(values, context);
  if (error.code === "unavailable") {
    const errors: FieldErrors = {};
    for (const short of error.detail.shortfalls ?? []) {
      const item = context.inventory.flatMap((c) => c.items).find((i) => i.id === short.itemId);
      if (item) errors[quantityField(item.id)] = { key: "brErrQtyOverFree", vars: { item: { th: item.nameTh, en: item.nameEn }, max: short.available } };
    }
    return ["quantities", errors];
  }
  if (error.code === "invalid_period") return ["dates", again?.step === "dates" ? again.errors : { collect: { key: "brErrCollectPast" } }];
  return ["items", again?.step === "items" ? again.errors : { items: { key: "brErrItemsGone" } }];
}
