/**
 * Opening a loan request. ONE transaction, so either everything below exists
 * or nothing does (and the reference number is given back):
 *
 *   the case (service borrowing, kind loan) with the borrower's contact, encrypted
 *   the request row: who it is for, the event, the period, the terms accepted
 *   a line per item
 *   a private tracking link
 *
 * The rules are checked again here, and availability is checked with the item
 * rows locked, so two requests cannot both take the last unit.
 */

import { eq, inArray } from "drizzle-orm";
import { createCase, issueTrackingLink, type CaseActor, type ContactInput } from "@/lib/cases";
import { encryptOptionalPii, type PiiEnv } from "@/lib/crypto/pii";
import { recordAudit, type AuditExecutor } from "@/lib/db/audit";
import { borrowingLines, borrowingRequests, equipmentCategories, equipmentItems, type BorrowerKind } from "@/lib/db/schema/borrowing";
import { organisations } from "@/lib/db/schema/organisations";
import type { Locale } from "@/lib/i18n/config";
import { requestAad } from "./aad";
import { lockAndFindShortfalls, type RequestedLine } from "./availability";
import { LENDING_ORGANISATION_SLUG, TERMS_VERSION } from "./constants";
import { BorrowingError } from "./errors";
import { lineProblems, periodProblems } from "./rules";

export interface NewLoanRequest {
  borrowerKind: BorrowerKind;
  /** Required when `borrowerKind` is `group`. */
  groupName?: string | null;
  eventName: string;
  venue: string;
  purpose: string;
  collectAt: Date;
  returnDueAt: Date;
  lines: RequestedLine[];
  /** Thammasat students give a student number and faculty; others give an affiliation. */
  studentId?: string | null;
  facultyId?: string | null;
  affiliation?: string | null;
  /** The borrower: name and phone, email if given. Role `borrower`. */
  contact: ContactInput;
  locale: Locale;
}

export interface CreatedLoanRequest {
  caseId: string;
  reference: string;
  /** The private tracking token, to be shown once. */
  token: string;
}

const clean = (value: string | null | undefined, max: number) => {
  const v = (value ?? "").trim();
  return v.length > max ? v.slice(0, max) : v;
};

export async function createLoanRequest(
  db: AuditExecutor,
  input: NewLoanRequest,
  actor: CaseActor,
  opts: { now?: Date; env?: PiiEnv } = {},
): Promise<CreatedLoanRequest> {
  const now = opts.now ?? new Date();
  const period = periodProblems(input.collectAt, input.returnDueAt, now);
  if (period.length > 0) throw new BorrowingError("invalid_period", "The loan period breaks the booking rules.", { period });
  const eventName = clean(input.eventName, 200);
  const venue = clean(input.venue, 200);
  const purpose = clean(input.purpose, 1000);
  const groupName = input.borrowerKind === "group" ? clean(input.groupName, 200) : null;
  if (!eventName || !venue || !purpose || (input.borrowerKind === "group" && !groupName)) {
    throw new BorrowingError("invalid", "A loan request needs an event, a venue, a purpose and, for a group, its name.");
  }
  if (input.contact.role !== "borrower") throw new BorrowingError("invalid", "The contact must be the borrower.");

  return db.transaction(async (tx) => {
    const ids = input.lines.map((l) => l.itemId);
    const items = ids.length ? await tx.select().from(equipmentItems).where(inArray(equipmentItems.id, ids)) : [];
    const categories = await tx.select().from(equipmentCategories);
    const lines = lineProblems(input.lines, items, categories, input.collectAt, now);
    if (lines.length > 0) throw new BorrowingError("invalid_lines", "The items break the booking rules.", { lines });
    const shortfalls = await lockAndFindShortfalls(tx, input.lines, input.collectAt, input.returnDueAt, { now });
    if (shortfalls.length > 0) throw new BorrowingError("unavailable", "Some items are no longer available.", { shortfalls });

    const [desk] = await tx.select({ id: organisations.id }).from(organisations).where(eq(organisations.slug, LENDING_ORGANISATION_SLUG));
    const count = input.lines.reduce((sum, l) => sum + l.quantity, 0);
    const created = await createCase(
      tx,
      {
        service: "borrowing",
        kind: "loan",
        summary: `Loan request: ${count} item${count === 1 ? "" : "s"} for ${eventName}`.slice(0, 300),
        locale: input.locale,
        owningOrganisationId: desk?.id ?? null,
        contacts: [input.contact],
      },
      actor,
      { now, env: opts.env },
    );

    await tx.insert(borrowingRequests).values({
      caseId: created.id,
      borrowerKind: input.borrowerKind,
      groupName,
      eventName,
      venue,
      purpose,
      collectAt: input.collectAt,
      returnDueAt: input.returnDueAt,
      studentIdEnc: encryptOptionalPii(clean(input.studentId, 40) || null, requestAad(created.id, "student_id"), opts.env),
      facultyId: input.facultyId ?? null,
      affiliationEnc: encryptOptionalPii(clean(input.affiliation, 200) || null, requestAad(created.id, "affiliation"), opts.env),
      termsVersion: TERMS_VERSION,
      termsAcceptedAt: now,
      createdAt: now,
    });
    await tx.insert(borrowingLines).values(input.lines.map((l) => ({ caseId: created.id, itemId: l.itemId, quantity: l.quantity })));

    await recordAudit(tx, {
      actorUserId: actor.kind === "staff" ? actor.userId : null,
      ip: actor.context?.ip ?? null,
      userAgent: actor.context?.userAgent ?? null,
      requestId: actor.context?.requestId ?? null,
      action: "borrowing.create",
      entityType: "case",
      entityId: created.id,
      after: { reference: created.reference, lines: input.lines.length, units: count, collectAt: input.collectAt.toISOString(), returnDueAt: input.returnDueAt.toISOString() },
    });
    const link = await issueTrackingLink(tx, created.id, actor, { now });
    return { caseId: created.id, reference: created.reference, token: link.token };
  });
}
