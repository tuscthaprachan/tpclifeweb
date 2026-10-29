/**
 * What the equipment desk does to a loan request after it is opened. These are
 * the bottom halves of the paper forms, as records: approve or decline with a
 * comment (the old signature), the handover with the deposit held and the
 * condition checked (which the paper never recorded), and the return with each
 * item's condition, the compensation and the deposit given back.
 *
 * Each function runs in one transaction with its audit entry, takes the case
 * row's lock, checks access through the engine and refuses the wrong status
 * with `CaseError("invalid_transition")`. Do not move a loan with the engine's
 * `transition` directly: the facts a status carries (decided, collected,
 * returned, settled) would be missing.
 *
 * Reading is split the same way as complaints: `readLoanFacts` holds nothing
 * personal and is not logged; `revealBorrowerDetails` decrypts the student
 * number and affiliation and records who looked.
 */

import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { addPublicUpdate, cleanPublicUpdate, transition, type CaseActor, type PublicUpdateText, type StaffActor } from "@/lib/cases";
import { appendEvent, assertStaff, auditContextOf, lockCase } from "@/lib/cases/internal";
import { assertCaseAccess } from "@/lib/cases/restrictions";
import { CaseError } from "@/lib/cases/types";
import { decryptOptionalPii, type PiiEnv } from "@/lib/crypto/pii";
import { withAudit, type AuditExecutor } from "@/lib/db/audit";
import { borrowingLines, borrowingRequests, DEPOSIT_KINDS, equipmentCategories, equipmentItems, type BorrowerKind, type BorrowingRequestRow, type DepositKind } from "@/lib/db/schema/borrowing";
import { cases, type CaseRow } from "@/lib/db/schema/cases";
import { faculties } from "@/lib/db/schema/content";
import { requestAad } from "./aad";
import { availableOver, loadHolds, lockAndFindShortfalls } from "./availability";
import { BorrowingError } from "./errors";
import { addDays, dayKeyOf, dayStart } from "./time";

/** The field a refused input belongs to, so a form can put the message beside it. */
export type LoanField = "quantities" | "reason" | "checked" | "deposit" | "counts" | "compensation" | "settlement" | "note";

/** A refused input. `field` says where; the message is for logs, not for people. */
export class LoanInputError extends BorrowingError {
  constructor(
    readonly field: LoanField,
    message: string,
  ) {
    super("invalid", message);
    this.name = "LoanInputError";
  }
}

export const COMPENSATION_MAX_BAHT = 100_000;
const NOTE_MAX = 1000;

type Tx = AuditExecutor;

interface Loaded {
  row: CaseRow;
  request: BorrowingRequestRow;
  lines: Array<typeof borrowingLines.$inferSelect>;
}

/** Locks the case and its request, checks the actor and the status, and loads the lines. */
async function openLoan(tx: Tx, caseId: string, actor: CaseActor, statuses: readonly string[]): Promise<Loaded> {
  const row = await lockCase(tx, caseId);
  await assertCaseAccess(tx, row, actor);
  if (row.service !== "borrowing") throw new CaseError("not_found", "Case not found.");
  if (!statuses.includes(row.status)) throw new CaseError("invalid_transition", `A loan that is ${row.status} cannot take this step.`);
  const [request] = await tx.select().from(borrowingRequests).where(eq(borrowingRequests.caseId, caseId)).for("update");
  if (!request) throw new CaseError("not_found", "Case not found.");
  const lines = await tx.select().from(borrowingLines).where(eq(borrowingLines.caseId, caseId)).orderBy(asc(borrowingLines.id));
  return { row, request, lines };
}

const blank = (text: PublicUpdateText | undefined): boolean => !text?.th?.trim() && !text?.en?.trim();

/* Decisions */

export interface ApproveInput {
  /** Lower a line's quantity: line id to the new number (1 up to the requested). Lines left out keep theirs. */
  quantities?: Record<string, number>;
  /** Optional words for the borrower, in either language. */
  note?: PublicUpdateText;
}

/**
 * Approves a request. Stock is checked again with the item rows locked and this
 * request's own hold left out, because anything may have been taken since it
 * was made; if a line no longer fits the approval is refused as `unavailable`
 * with the shortfalls and nothing changes. Staff may lower quantities (never
 * raise them) so a request that half fits can still be granted.
 */
export async function approveLoan(db: AuditExecutor, caseId: string, actor: StaffActor, input: ApproveInput = {}, opts: { now?: Date } = {}): Promise<void> {
  const now = opts.now ?? new Date();
  await withAudit(db, auditContextOf(actor), async (tx, audit) => {
    const { request, lines } = await openLoan(tx, caseId, actor, ["requested"]);
    const wanted = input.quantities ?? {};
    for (const [lineId, quantity] of Object.entries(wanted)) {
      const line = lines.find((l) => l.id === lineId);
      if (!line || !Number.isInteger(quantity) || quantity < 1 || quantity > line.quantity) {
        throw new LoanInputError("quantities", "A quantity can only be lowered, and must stay at 1 or more.");
      }
    }
    const final = lines.map((l) => ({ line: l, quantity: wanted[l.id] ?? l.quantity }));
    const shortfalls = await lockAndFindShortfalls(
      tx,
      final.map((f) => ({ itemId: f.line.itemId, quantity: f.quantity })),
      request.collectAt,
      request.returnDueAt,
      { excludeCaseId: caseId, now },
    );
    if (shortfalls.length > 0) throw new BorrowingError("unavailable", "Some items are no longer available.", { shortfalls });

    const changes = final.filter((f) => f.quantity !== f.line.quantity);
    for (const c of changes) await tx.update(borrowingLines).set({ quantity: c.quantity }).where(eq(borrowingLines.id, c.line.id));
    await tx.update(borrowingRequests).set({ decidedAt: now }).where(eq(borrowingRequests.caseId, caseId));
    await transition(tx, caseId, "approved", actor, { expectedFrom: "requested", now });
    if (changes.length > 0) {
      await appendEvent(tx, caseId, actor, now, { type: "lines_changed", metadata: { changes: changes.map((c) => ({ itemId: c.line.itemId, from: c.line.quantity, to: c.quantity })) } });
    }
    if (!blank(input.note)) await addPublicUpdate(tx, caseId, input.note!, actor, { now });
    await audit({
      action: "borrowing.approve",
      entityType: "case",
      entityId: caseId,
      before: { status: "requested" },
      after: { status: "approved", lowered: changes.length, noted: !blank(input.note) },
    });
  });
}

export interface DeclineInput {
  /** Why, in Thai, English or both (at least one). The borrower reads it. */
  reason: PublicUpdateText;
}

export async function declineLoan(db: AuditExecutor, caseId: string, input: DeclineInput, actor: StaffActor, opts: { now?: Date } = {}): Promise<void> {
  const now = opts.now ?? new Date();
  if (blank(input.reason)) throw new LoanInputError("reason", "A decision to decline needs a reason, in Thai, English or both.");
  cleanPublicUpdate(input.reason, "Reason");
  await withAudit(db, auditContextOf(actor), async (tx, audit) => {
    await openLoan(tx, caseId, actor, ["requested"]);
    await tx.update(borrowingRequests).set({ decidedAt: now }).where(eq(borrowingRequests.caseId, caseId));
    await transition(tx, caseId, "declined", actor, { expectedFrom: "requested", now });
    await addPublicUpdate(tx, caseId, input.reason, actor, { now });
    await audit({ action: "borrowing.decline", entityType: "case", entityId: caseId, before: { status: "requested" }, after: { status: "declined" } });
  });
}

/* Handover */

export interface HandoverInput {
  /** The condition was checked with the borrower. Must be true. */
  checked: boolean;
  depositKind: DepositKind;
  /** How many cards are held, 0 to 5. Never a card number. */
  depositCount: number;
  note?: string;
}

/** Records the equipment going out: the condition check, and the deposit left at the desk. */
export async function recordHandover(db: AuditExecutor, caseId: string, actor: StaffActor, input: HandoverInput, opts: { now?: Date } = {}): Promise<void> {
  const now = opts.now ?? new Date();
  if (input.checked !== true) throw new LoanInputError("checked", "Confirm that the condition was checked with the borrower.");
  if (!DEPOSIT_KINDS.includes(input.depositKind) || !Number.isInteger(input.depositCount) || input.depositCount < 0 || input.depositCount > 5) {
    throw new LoanInputError("deposit", "Say what was left as a deposit and how many, from 0 to 5.");
  }
  const note = input.note?.trim() || null;
  if (note && [...note].length > NOTE_MAX) throw new LoanInputError("note", "The note is too long.");
  await withAudit(db, auditContextOf(actor), async (tx, audit) => {
    await openLoan(tx, caseId, actor, ["approved"]);
    await tx
      .update(borrowingRequests)
      .set({ collectedAt: now, handoverChecked: true, depositKind: input.depositKind, depositCount: input.depositCount })
      .where(eq(borrowingRequests.caseId, caseId));
    await transition(tx, caseId, "on_loan", actor, { expectedFrom: "approved", now });
    await appendEvent(tx, caseId, actor, now, {
      type: "handover_recorded",
      body: note,
      metadata: { checked: true, depositKind: input.depositKind, depositCount: input.depositCount },
    });
    await audit({
      action: "borrowing.handover",
      entityType: "case",
      entityId: caseId,
      before: { status: "approved" },
      after: { status: "on_loan", depositKind: input.depositKind, depositCount: input.depositCount },
    });
  });
}

/* Return */

export interface ReturnLineInput {
  good: number;
  damaged: number;
  lost: number;
}

export interface ReturnInput {
  /** Every line of the loan, by line id. Each must add up to the quantity lent. */
  lines: Record<string, ReturnLineInput>;
  depositReturned: boolean;
  /** Required, in whole baht, when anything is damaged or lost. */
  compensationBaht?: number | null;
  compensationNote?: string | null;
  /** Take the damaged and lost units out of the lendable stock. */
  takeOutOfService?: boolean;
  note?: string;
}

const whole = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0;

/**
 * Records the return, per line: how many came back good, damaged or lost. All
 * good ends the loan as `returned`; anything else leaves it at
 * `compensation_due` with the amount to pay. Units that are not coming back
 * as they were can leave the lendable stock in the same step, so the next
 * borrower is not promised a broken ball.
 */
export async function recordReturn(db: AuditExecutor, caseId: string, actor: StaffActor, input: ReturnInput, opts: { now?: Date } = {}): Promise<{ status: "returned" | "compensation_due" }> {
  const now = opts.now ?? new Date();
  const compensationNote = input.compensationNote?.trim() || null;
  if (compensationNote && [...compensationNote].length > NOTE_MAX) throw new LoanInputError("note", "The note is too long.");
  const note = input.note?.trim() || null;
  if (note && [...note].length > NOTE_MAX) throw new LoanInputError("note", "The note is too long.");
  return withAudit(db, auditContextOf(actor), async (tx, audit) => {
    const { lines } = await openLoan(tx, caseId, actor, ["on_loan"]);
    const given = Object.keys(input.lines);
    if (given.length !== lines.length || lines.some((l) => !input.lines[l.id])) throw new LoanInputError("counts", "Give the condition of every item on the loan.");
    let damaged = 0;
    let lost = 0;
    let good = 0;
    for (const line of lines) {
      const c = input.lines[line.id]!;
      if (!whole(c.good) || !whole(c.damaged) || !whole(c.lost) || c.good + c.damaged + c.lost !== line.quantity) {
        throw new LoanInputError("counts", "For each item, good, damaged and lost must add up to the number lent.");
      }
      good += c.good;
      damaged += c.damaged;
      lost += c.lost;
    }
    const problem = damaged + lost > 0;
    let compensation: number | null = null;
    if (problem) {
      const baht = input.compensationBaht;
      if (baht == null || !Number.isInteger(baht) || baht < 0 || baht > COMPENSATION_MAX_BAHT) {
        throw new LoanInputError("compensation", `Enter the amount to pay in whole baht, from 0 to ${COMPENSATION_MAX_BAHT}.`);
      }
      compensation = baht;
    } else if ((input.compensationBaht ?? 0) > 0) {
      throw new LoanInputError("compensation", "Everything came back in good condition, so there is no amount to pay.");
    }

    for (const line of lines) {
      const c = input.lines[line.id]!;
      await tx.update(borrowingLines).set({ returnedGood: c.good, damaged: c.damaged, lost: c.lost }).where(eq(borrowingLines.id, line.id));
    }
    const removed: Array<{ itemId: string; units: number }> = [];
    if (problem && input.takeOutOfService) {
      const out = lines.map((l) => ({ itemId: l.itemId, units: input.lines[l.id]!.damaged + input.lines[l.id]!.lost })).filter((o) => o.units > 0);
      await tx.select({ id: equipmentItems.id }).from(equipmentItems).where(inArray(equipmentItems.id, out.map((o) => o.itemId))).orderBy(asc(equipmentItems.id)).for("update");
      for (const o of out) {
        await tx
          .update(equipmentItems)
          .set({ outOfService: sql`least(${equipmentItems.totalQuantity}, ${equipmentItems.outOfService} + ${o.units})`, updatedAt: now })
          .where(eq(equipmentItems.id, o.itemId));
        removed.push(o);
      }
    }
    await tx
      .update(borrowingRequests)
      .set({
        returnedAt: now,
        compensationBaht: compensation,
        compensationNote: problem ? compensationNote : null,
        depositReturnedAt: input.depositReturned ? now : null,
      })
      .where(eq(borrowingRequests.caseId, caseId));
    const to = problem ? "compensation_due" : "returned";
    await transition(tx, caseId, to, actor, { expectedFrom: "on_loan", now });
    await appendEvent(tx, caseId, actor, now, {
      type: "return_recorded",
      body: note,
      metadata: { good, damaged, lost, depositReturned: input.depositReturned, compensationBaht: compensation, takenOutOfService: removed },
    });
    await audit({
      action: "borrowing.return",
      entityType: "case",
      entityId: caseId,
      before: { status: "on_loan" },
      after: { status: to, good, damaged, lost, depositReturned: input.depositReturned, compensationBaht: compensation, takenOutOfService: removed },
    });
    return { status: to };
  });
}

export interface SettleInput {
  settlement: "paid" | "replaced" | "waived";
  note?: string;
  depositReturned: boolean;
}

/** Closes a loan that came back with damage or loss: paid, replaced or waived. */
export async function settleLoan(db: AuditExecutor, caseId: string, actor: StaffActor, input: SettleInput, opts: { now?: Date } = {}): Promise<void> {
  const now = opts.now ?? new Date();
  if (!(["paid", "replaced", "waived"] as const).includes(input.settlement)) throw new LoanInputError("settlement", "Say whether it was paid, replaced or waived.");
  const note = input.note?.trim() || null;
  if (note && [...note].length > NOTE_MAX) throw new LoanInputError("note", "The note is too long.");
  await withAudit(db, auditContextOf(actor), async (tx, audit) => {
    const { request } = await openLoan(tx, caseId, actor, ["compensation_due"]);
    await tx
      .update(borrowingRequests)
      .set({ settledAt: now, settlement: input.settlement, depositReturnedAt: input.depositReturned ? (request.depositReturnedAt ?? now) : request.depositReturnedAt })
      .where(eq(borrowingRequests.caseId, caseId));
    await transition(tx, caseId, "settled", actor, { expectedFrom: "compensation_due", now });
    await appendEvent(tx, caseId, actor, now, { type: "compensation_settled", body: note, metadata: { settlement: input.settlement, depositReturned: input.depositReturned } });
    await audit({
      action: "borrowing.settle",
      entityType: "case",
      entityId: caseId,
      before: { status: "compensation_due" },
      after: { status: "settled", settlement: input.settlement, depositReturned: input.depositReturned },
    });
  });
}

/* Closing without a loan */

/** The borrower did not come for an approved request. Frees the stock. */
export async function markNotCollected(db: AuditExecutor, caseId: string, actor: StaffActor, input: { note?: PublicUpdateText } = {}, opts: { now?: Date } = {}): Promise<void> {
  const now = opts.now ?? new Date();
  await withAudit(db, auditContextOf(actor), async (tx, audit) => {
    await openLoan(tx, caseId, actor, ["approved"]);
    await transition(tx, caseId, "not_collected", actor, { expectedFrom: "approved", now });
    if (!blank(input.note)) await addPublicUpdate(tx, caseId, input.note!, actor, { now });
    await audit({ action: "borrowing.not_collected", entityType: "case", entityId: caseId, before: { status: "approved" }, after: { status: "not_collected" } });
  });
}

/** Staff cancel a request that is waiting or approved. The borrower is told why. */
export async function cancelByStaff(db: AuditExecutor, caseId: string, actor: StaffActor, input: { reason: PublicUpdateText }, opts: { now?: Date } = {}): Promise<void> {
  const now = opts.now ?? new Date();
  if (blank(input.reason)) throw new LoanInputError("reason", "A cancellation needs a reason, in Thai, English or both.");
  cleanPublicUpdate(input.reason, "Reason");
  await withAudit(db, auditContextOf(actor), async (tx, audit) => {
    const { row } = await openLoan(tx, caseId, actor, ["requested", "approved"]);
    await transition(tx, caseId, "cancelled", actor, { expectedFrom: row.status, now });
    await addPublicUpdate(tx, caseId, input.reason, actor, { now });
    await audit({ action: "borrowing.cancel_by_staff", entityType: "case", entityId: caseId, before: { status: row.status }, after: { status: "cancelled" } });
  });
}

/* Reading */

export interface LoanLineFact {
  lineId: string;
  itemId: string;
  categoryId: string;
  nameTh: string;
  nameEn: string;
  unitTh: string;
  unitEn: string;
  quantity: number;
  /** Units free for the whole period, leaving this request's own hold out. */
  free: number;
  returnedGood: number | null;
  damaged: number | null;
  lost: number | null;
}

export interface LoanFacts {
  caseId: string;
  reference: string;
  status: string;
  kind: BorrowerKind;
  groupName: string | null;
  eventName: string;
  venue: string;
  purpose: string;
  collectAt: Date;
  returnDueAt: Date;
  termsVersion: string;
  termsAcceptedAt: Date;
  decidedAt: Date | null;
  collectedAt: Date | null;
  handoverChecked: boolean;
  depositKind: DepositKind | null;
  depositCount: number | null;
  /** Cards the chosen categories ask for, to pre-fill the handover. */
  depositCardsAsked: number;
  depositReturnedAt: Date | null;
  returnedAt: Date | null;
  compensationBaht: number | null;
  compensationNote: string | null;
  settledAt: Date | null;
  settlement: BorrowingRequestRow["settlement"];
  /** On loan and past the return time. Computed, never a status. */
  overdue: boolean;
  /** Whether a student number or affiliation is still held. */
  hasDetails: boolean;
  lines: LoanLineFact[];
}

/** The loan's facts, with nothing personal. Needs access to the case; reading is not logged. */
export async function readLoanFacts(db: AuditExecutor, caseId: string, actor: StaffActor, opts: { now?: Date } = {}): Promise<LoanFacts> {
  const now = opts.now ?? new Date();
  const [row] = await db.select().from(cases).where(eq(cases.id, caseId));
  if (!row) throw new CaseError("not_found", "Case not found.");
  await assertCaseAccess(db, row, actor);
  if (row.service !== "borrowing") throw new CaseError("not_found", "Case not found.");
  const [request] = await db.select().from(borrowingRequests).where(eq(borrowingRequests.caseId, caseId));
  if (!request) throw new CaseError("not_found", "Case not found.");
  const rows = await db
    .select({ line: borrowingLines, item: equipmentItems, category: equipmentCategories })
    .from(borrowingLines)
    .innerJoin(equipmentItems, eq(equipmentItems.id, borrowingLines.itemId))
    .innerJoin(equipmentCategories, eq(equipmentCategories.id, equipmentItems.categoryId))
    .where(eq(borrowingLines.caseId, caseId))
    .orderBy(asc(equipmentCategories.position), asc(equipmentItems.position), asc(equipmentItems.nameEn));
  const holds = await loadHolds(db, { from: request.collectAt, to: request.returnDueAt }, { itemIds: rows.map((r) => r.item.id), now });
  return {
    caseId,
    reference: row.reference,
    status: row.status,
    kind: request.borrowerKind as BorrowerKind,
    groupName: request.groupName,
    eventName: request.eventName,
    venue: request.venue,
    purpose: request.purpose,
    collectAt: request.collectAt,
    returnDueAt: request.returnDueAt,
    termsVersion: request.termsVersion,
    termsAcceptedAt: request.termsAcceptedAt,
    decidedAt: request.decidedAt,
    collectedAt: request.collectedAt,
    handoverChecked: request.handoverChecked,
    depositKind: request.depositKind as DepositKind | null,
    depositCount: request.depositCount,
    depositCardsAsked: rows.reduce((max, r) => Math.max(max, r.category.depositCards), 0),
    depositReturnedAt: request.depositReturnedAt,
    returnedAt: request.returnedAt,
    compensationBaht: request.compensationBaht,
    compensationNote: request.compensationNote,
    settledAt: request.settledAt,
    settlement: request.settlement,
    overdue: row.status === "on_loan" && request.returnDueAt.getTime() < now.getTime(),
    hasDetails: !row.piiDeletedAt && Boolean(request.studentIdEnc || request.affiliationEnc),
    lines: rows.map(({ line, item }) => ({
      lineId: line.id,
      itemId: item.id,
      categoryId: item.categoryId,
      nameTh: item.nameTh,
      nameEn: item.nameEn,
      unitTh: item.unitTh,
      unitEn: item.unitEn,
      quantity: line.quantity,
      free: availableOver(item, holds, request.collectAt, request.returnDueAt, caseId),
      returnedGood: line.returnedGood,
      damaged: line.damaged,
      lost: line.lost,
    })),
  };
}

export interface BorrowerDetails {
  studentId: string | null;
  affiliation: string | null;
  faculty: { th: string; en: string } | null;
}

/**
 * Decrypts the student number and affiliation. Records a `details_viewed` event
 * and a `borrowing.view_details` audit entry in the same transaction. Returns
 * null, logging nothing, when retention has already cleared them.
 */
export async function revealBorrowerDetails(db: AuditExecutor, caseId: string, actor: StaffActor, opts: { now?: Date; env?: PiiEnv } = {}): Promise<BorrowerDetails | null> {
  const now = opts.now ?? new Date();
  return withAudit(db, auditContextOf(actor), async (tx, audit) => {
    const row = await lockCase(tx, caseId);
    await assertCaseAccess(tx, row, actor);
    if (row.service !== "borrowing") throw new CaseError("not_found", "Case not found.");
    const [request] = await tx.select().from(borrowingRequests).where(eq(borrowingRequests.caseId, caseId));
    if (!request) throw new CaseError("not_found", "Case not found.");
    if (row.piiDeletedAt || (!request.studentIdEnc && !request.affiliationEnc)) return null;
    const faculty = request.facultyId ? (await tx.select({ th: faculties.nameTh, en: faculties.nameEn }).from(faculties).where(eq(faculties.id, request.facultyId)))[0] : undefined;
    const details: BorrowerDetails = {
      studentId: decryptOptionalPii(request.studentIdEnc, requestAad(caseId, "student_id"), opts.env),
      affiliation: decryptOptionalPii(request.affiliationEnc, requestAad(caseId, "affiliation"), opts.env),
      faculty: faculty ?? null,
    };
    await appendEvent(tx, caseId, actor, now, { type: "details_viewed" });
    await audit({ action: "borrowing.view_details", entityType: "case", entityId: caseId, after: { reference: row.reference } });
    return details;
  });
}

/* The schedule */

export interface ScheduleRow {
  caseId: string;
  reference: string;
  status: string;
  kind: BorrowerKind;
  groupName: string | null;
  eventName: string;
  collectAt: Date;
  returnDueAt: Date;
  returnedAt: Date | null;
  compensationBaht: number | null;
  createdAt: Date;
  items: Array<{ nameTh: string; nameEn: string; unitTh: string; unitEn: string; quantity: number }>;
}

export interface Schedule {
  /** Requests waiting for a decision, oldest first. */
  awaitingDecision: ScheduleRow[];
  collectionsToday: ScheduleRow[];
  /** Approved, collection tomorrow up to seven days ahead. */
  collectionsNext7: ScheduleRow[];
  /** Approved, but the collection time has passed without a handover. */
  collectionsMissed: ScheduleRow[];
  returnsToday: ScheduleRow[];
  returnsNext7: ScheduleRow[];
  overdue: ScheduleRow[];
  compensationDue: ScheduleRow[];
}

/** Everything the desk has to do, grouped by when. Open loans only, so the set is small. */
export async function listSchedule(db: AuditExecutor, actor: StaffActor, now: Date = new Date()): Promise<Schedule> {
  assertStaff(actor, "borrowing");
  const open = await db
    .select({ c: cases, r: borrowingRequests })
    .from(cases)
    .innerJoin(borrowingRequests, eq(borrowingRequests.caseId, cases.id))
    .where(and(eq(cases.service, "borrowing"), inArray(cases.status, ["requested", "approved", "on_loan", "compensation_due"])));
  const ids = open.map((o) => o.c.id);
  const lineRows = ids.length
    ? await db
        .select({ caseId: borrowingLines.caseId, quantity: borrowingLines.quantity, nameTh: equipmentItems.nameTh, nameEn: equipmentItems.nameEn, unitTh: equipmentItems.unitTh, unitEn: equipmentItems.unitEn })
        .from(borrowingLines)
        .innerJoin(equipmentItems, eq(equipmentItems.id, borrowingLines.itemId))
        .where(inArray(borrowingLines.caseId, ids))
        .orderBy(asc(equipmentItems.position), asc(equipmentItems.nameEn))
    : [];
  const rows: ScheduleRow[] = open.map(({ c, r }) => ({
    caseId: c.id,
    reference: c.reference,
    status: c.status,
    kind: r.borrowerKind as BorrowerKind,
    groupName: r.groupName,
    eventName: r.eventName,
    collectAt: r.collectAt,
    returnDueAt: r.returnDueAt,
    returnedAt: r.returnedAt,
    compensationBaht: r.compensationBaht,
    createdAt: c.createdAt,
    items: lineRows.filter((l) => l.caseId === c.id).map(({ caseId: _caseId, ...item }) => item),
  }));

  const today = dayKeyOf(now);
  const todayStart = dayStart(today).getTime();
  const tomorrowStart = dayStart(addDays(today, 1)).getTime();
  const weekEnd = dayStart(addDays(today, 8)).getTime();
  const nowMs = now.getTime();
  const byTime = (key: "collectAt" | "returnDueAt" | "createdAt") => (x: ScheduleRow, y: ScheduleRow) => x[key].getTime() - y[key].getTime();
  const pick = (status: string, key: "collectAt" | "returnDueAt", from: number, to: number) =>
    rows.filter((r) => r.status === status && r[key].getTime() >= from && r[key].getTime() < to).sort(byTime(key));

  return {
    awaitingDecision: rows.filter((r) => r.status === "requested").sort(byTime("createdAt")),
    collectionsToday: pick("approved", "collectAt", todayStart, tomorrowStart),
    collectionsNext7: pick("approved", "collectAt", tomorrowStart, weekEnd),
    collectionsMissed: pick("approved", "collectAt", 0, todayStart),
    returnsToday: pick("on_loan", "returnDueAt", nowMs, tomorrowStart),
    returnsNext7: pick("on_loan", "returnDueAt", tomorrowStart, weekEnd),
    overdue: rows.filter((r) => r.status === "on_loan" && r.returnDueAt.getTime() < nowMs).sort(byTime("returnDueAt")),
    compensationDue: rows.filter((r) => r.status === "compensation_due").sort(byTime("returnDueAt")),
  };
}
