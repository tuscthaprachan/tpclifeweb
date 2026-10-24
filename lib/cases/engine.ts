/**
 * The case engine: create, move, annotate and assign cases for every service.
 *
 * Every function takes the database (or a transaction) first and the actor
 * last, runs in one transaction with its audit entry, and checks access itself
 * in the data layer (lib/cases/access.ts). Staff operations throw
 * `CaseError("forbidden")` for staff without a role in the case's service.
 * Pass `{ now }` in tests.
 */

import { and, asc, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { withAudit, type AuditExecutor } from "@/lib/db/audit";
import { nextReference } from "@/lib/db/references";
import { user } from "@/lib/db/schema/auth";
import { caseEvents, cases, type CaseEventRow, type CaseRow, type CaseService } from "@/lib/db/schema/cases";
import { staffRoles } from "@/lib/db/schema/staff-roles";
import { bangkokDateKey } from "@/lib/i18n/format";
import { accessibleServices } from "./access";
import { insertContact, type ContactInput } from "./contacts";
import { addOneYear, appendEvent, assertStaff, auditContextOf, cleanText, lockCase, NOTE_MAX, touchCase } from "./internal";
import { allowedTransitions, getServiceDef, getStatusDef, initialStatus, isTerminalStatus, isValidKind, SERVICES } from "./services";
import { CaseError, type BilingualText, type CaseActor, type StaffActor } from "./types";
import type { PiiEnv } from "@/lib/crypto/pii";

export interface CreateCaseInput {
  service: CaseService;
  /** The state machine to use: `lost` or `found` for lost_found. */
  kind: string;
  subtype?: string | null;
  /** Short description for staff. Must not contain personal data. */
  summary?: string | null;
  /** The language the person used. */
  locale?: "th" | "en" | null;
  /** The desk that holds the case or item (a TUSU or TUSC organisation id). */
  owningOrganisationId?: number | null;
  /** People to record with the case, encrypted. */
  contacts?: ContactInput[];
}

export interface CreatedCase {
  id: string;
  reference: string;
  status: string;
}

/**
 * Opens a case: allocates its reference (LF/CP, Bangkok year), sets the
 * initial status, records the public `created` event and any contacts, all
 * in one transaction. A `public` actor is a person on a journey, `staff` is a
 * walk-in recorded at the desk. Throws `PiiUnavailableError` if contacts are
 * given and no encryption key is usable, leaving nothing behind.
 */
export async function createCase(db: AuditExecutor, input: CreateCaseInput, actor: CaseActor, opts: { now?: Date; env?: PiiEnv } = {}): Promise<CreatedCase> {
  const now = opts.now ?? new Date();
  if (!isValidKind(input.service, input.kind)) throw new CaseError("invalid", `Unknown kind ${input.kind} for ${input.service}.`);
  const status = initialStatus(input.service, input.kind)!;
  const summary = input.summary?.trim() ? cleanText(input.summary, 300, "Summary") : null;
  const year = Number(bangkokDateKey(now).slice(0, 4));

  return withAudit(db, auditContextOf(actor), async (tx, audit) => {
    if (actor.kind === "staff") assertStaff(actor, input.service);
    const reference = await nextReference(tx, getServiceDef(input.service).prefix, year);
    const [row] = await tx
      .insert(cases)
      .values({
        service: input.service,
        reference,
        kind: input.kind,
        subtype: input.subtype ?? null,
        status,
        summary,
        locale: input.locale ?? null,
        owningOrganisationId: input.owningOrganisationId ?? null,
        actingOrganisationId: actor.kind === "staff" ? actor.organisationId : null,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: cases.id });
    if (!row) throw new Error("Could not create the case.");
    await appendEvent(tx, row.id, actor, now, { type: "created", visibility: "public", toStatus: status });
    for (const contact of input.contacts ?? []) await insertContact(tx, row.id, contact, actor, now, opts.env);
    await audit({
      action: "case.create",
      entityType: "case",
      entityId: row.id,
      after: { reference, service: input.service, kind: input.kind, status, contacts: input.contacts?.length ?? 0 },
    });
    return { id: row.id, reference, status };
  });
}

export interface TransitionOptions {
  /** Refuse (`stale`) unless the case is still in this status, so a form that was open for a while cannot overwrite a newer change. */
  expectedFrom?: string;
  /** Optional bilingual message stored on the event; shown publicly if the new status is public. */
  note?: BilingualText;
  now?: Date;
}

function cleanBilingual(text: BilingualText, what: string): BilingualText {
  return { th: cleanText(text.th, NOTE_MAX, `${what} (Thai)`), en: cleanText(text.en, NOTE_MAX, `${what} (English)`) };
}

/**
 * Moves a case to `to` if its state machine allows it. Records a
 * `status_changed` event (public when the new status has a public label).
 * Reaching a terminal status sets `closed_at` and `pii_delete_after` (one year
 * later); leaving one reopens the case and clears both, unless personal data
 * was already deleted. Staff may take any listed transition; a `public` actor
 * (someone who has just resolved their tracking link) only those in the
 * machine's `publicActorTo`.
 */
export async function transition(db: AuditExecutor, caseId: string, to: string, actor: CaseActor, opts: TransitionOptions = {}): Promise<CaseRow> {
  const now = opts.now ?? new Date();
  const note = opts.note ? cleanBilingual(opts.note, "Message") : null;
  return withAudit(db, auditContextOf(actor), async (tx, audit) => {
    const row = await lockCase(tx, caseId);
    if (actor.kind === "staff") assertStaff(actor, row.service);
    else if (actor.kind === "system") throw new CaseError("forbidden", "Only staff or the person concerned can change a status.");
    if (opts.expectedFrom !== undefined && opts.expectedFrom !== row.status) throw new CaseError("stale", "The case has changed since it was opened.");
    const by = actor.kind === "staff" ? "staff" : "public";
    if (!allowedTransitions(row.service, row.kind, row.status, by).includes(to)) {
      throw new CaseError("invalid_transition", `${row.status} cannot move to ${to}.`);
    }
    const target = getStatusDef(row.service, row.kind, to)!;
    const wasTerminal = isTerminalStatus(row.service, row.kind, row.status);
    const set: Partial<typeof cases.$inferInsert> = { status: to };
    if (target.terminal) {
      set.closedAt = now;
      set.piiDeleteAfter = addOneYear(now);
    } else if (wasTerminal) {
      if (row.piiDeletedAt) throw new CaseError("pii_deleted", "This case cannot be reopened: its personal data has been deleted.");
      set.closedAt = null;
      set.piiDeleteAfter = null;
    }
    await touchCase(tx, caseId, actor, now, set);
    await appendEvent(tx, caseId, actor, now, {
      type: "status_changed",
      visibility: target.publicLabel ? "public" : "internal",
      fromStatus: row.status,
      toStatus: to,
      bodyTh: note?.th,
      bodyEn: note?.en,
    });
    await audit({
      action: "case.transition",
      entityType: "case",
      entityId: caseId,
      before: { status: row.status },
      after: { status: to, ...(target.terminal ? { piiDeleteAfter: set.piiDeleteAfter?.toISOString() } : {}) },
    });
    return { ...row, ...set, updatedAt: now } as CaseRow;
  });
}

/** Adds a staff-only note (one language). Notes are never deleted by retention, so keep personal details out of them. */
export async function addNote(db: AuditExecutor, caseId: string, body: string, actor: CaseActor, opts: { now?: Date } = {}): Promise<string> {
  const now = opts.now ?? new Date();
  const text = cleanText(body, NOTE_MAX, "Note");
  return withAudit(db, auditContextOf(actor), async (tx, audit) => {
    const row = await lockCase(tx, caseId);
    assertStaff(actor, row.service);
    const id = await appendEvent(tx, caseId, actor, now, { type: "internal_note", body: text });
    await touchCase(tx, caseId, actor, now);
    await audit({ action: "case.note", entityType: "case", entityId: caseId, after: { eventId: id } });
    return id;
  });
}

/** Adds an update the person sees on the tracking page. Thai and English are both required. */
export async function addPublicUpdate(db: AuditExecutor, caseId: string, text: BilingualText, actor: CaseActor, opts: { now?: Date } = {}): Promise<string> {
  const now = opts.now ?? new Date();
  const body = cleanBilingual(text, "Update");
  return withAudit(db, auditContextOf(actor), async (tx, audit) => {
    const row = await lockCase(tx, caseId);
    assertStaff(actor, row.service);
    const id = await appendEvent(tx, caseId, actor, now, { type: "public_update", visibility: "public", bodyTh: body.th, bodyEn: body.en });
    await touchCase(tx, caseId, actor, now);
    await audit({ action: "case.public_update", entityType: "case", entityId: caseId, after: { eventId: id } });
    return id;
  });
}

/** Assigns the case to a member of staff, or clears it with null. The assignee must hold a role for the service. */
export async function assign(db: AuditExecutor, caseId: string, assigneeUserId: string | null, actor: CaseActor, opts: { now?: Date } = {}): Promise<void> {
  const now = opts.now ?? new Date();
  return withAudit(db, auditContextOf(actor), async (tx, audit) => {
    const row = await lockCase(tx, caseId);
    assertStaff(actor, row.service);
    if (assigneeUserId !== null && !(await canWorkService(tx, assigneeUserId, row.service))) {
      throw new CaseError("invalid", "That person cannot work on this service.");
    }
    if (assigneeUserId === row.assignedTo) return;
    await touchCase(tx, caseId, actor, now, { assignedTo: assigneeUserId });
    await appendEvent(tx, caseId, actor, now, { type: "assigned", metadata: { from: row.assignedTo, to: assigneeUserId } });
    await audit({ action: "case.assign", entityType: "case", entityId: caseId, before: { assignedTo: row.assignedTo }, after: { assignedTo: assigneeUserId } });
  });
}

async function canWorkService(tx: AuditExecutor, userId: string, service: CaseService): Promise<boolean> {
  const rows = await tx
    .select({ id: staffRoles.id })
    .from(staffRoles)
    .where(and(eq(staffRoles.userId, userId), isNull(staffRoles.revokedAt), inArray(staffRoles.role, [...SERVICES[service].roles])))
    .limit(1);
  return rows.length > 0;
}

/** Staff who may be assigned cases of `service`, for the assign menu. */
export async function listAssignees(db: AuditExecutor, service: CaseService): Promise<Array<{ id: string; name: string; email: string }>> {
  const rows = await db
    .selectDistinct({ id: user.id, name: user.name, email: user.email })
    .from(staffRoles)
    .innerJoin(user, eq(user.id, staffRoles.userId))
    .where(and(isNull(staffRoles.revokedAt), inArray(staffRoles.role, [...SERVICES[service].roles])))
    .orderBy(asc(user.name));
  return rows;
}

/** One case, if the staff member may see its service. */
export async function getCase(db: AuditExecutor, caseId: string, actor: StaffActor): Promise<CaseRow> {
  const [row] = await db.select().from(cases).where(eq(cases.id, caseId));
  if (!row) throw new CaseError("not_found", "Case not found.");
  assertStaff(actor, row.service);
  return row;
}

export interface StaffTimelineEntry extends Pick<CaseEventRow, "id" | "type" | "visibility" | "body" | "bodyTh" | "bodyEn" | "fromStatus" | "toStatus" | "metadata" | "createdAt" | "actingOrganisationId"> {
  actorUserId: string | null;
  actorName: string | null;
}

/** The full timeline, internal and public, oldest first. Staff only. */
export async function staffTimeline(db: AuditExecutor, caseId: string, actor: StaffActor): Promise<StaffTimelineEntry[]> {
  await getCase(db, caseId, actor);
  const rows = await db
    .select({ event: caseEvents, actorName: user.name })
    .from(caseEvents)
    .leftJoin(user, eq(user.id, caseEvents.actorUserId))
    .where(eq(caseEvents.caseId, caseId))
    .orderBy(asc(caseEvents.createdAt), asc(sql`${caseEvents.id}`));
  return rows.map(({ event, actorName }) => ({ ...event, actorName }));
}

export interface CaseListFilters {
  service?: CaseService;
  status?: string;
  /** `me`, `unassigned`, or a user id. */
  assignee?: "me" | "unassigned" | string;
  /** Matches part of the reference. */
  q?: string;
  /** Hide closed cases. */
  openOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export interface CaseListRow extends Pick<CaseRow, "id" | "service" | "reference" | "kind" | "status" | "summary" | "assignedTo" | "actingOrganisationId" | "createdAt" | "updatedAt" | "closedAt"> {
  assigneeName: string | null;
}

export interface CaseList {
  rows: CaseListRow[];
  total: number;
  page: number;
  pageSize: number;
}

export const INBOX_PAGE_SIZE = 25;

/** The inbox query: only services the staff member may work, newest activity first. */
export async function listCases(db: AuditExecutor, actor: StaffActor, filters: CaseListFilters = {}): Promise<CaseList> {
  const pageSize = Math.min(Math.max(filters.pageSize ?? INBOX_PAGE_SIZE, 1), 100);
  const page = Math.max(Math.floor(filters.page ?? 1), 1);
  const allowed = accessibleServices(actor.roles).filter((s) => !filters.service || s === filters.service);
  if (allowed.length === 0) return { rows: [], total: 0, page, pageSize };

  const q = filters.q?.trim().replace(/[\\%_]/g, (c) => `\\${c}`);
  const assignee = filters.assignee === "me" ? actor.userId : filters.assignee;
  const where = and(
    inArray(cases.service, allowed),
    filters.status ? eq(cases.status, filters.status) : undefined,
    assignee === "unassigned" ? isNull(cases.assignedTo) : assignee ? eq(cases.assignedTo, assignee) : undefined,
    q ? or(ilike(cases.reference, `%${q}%`)) : undefined,
    filters.openOnly ? isNull(cases.closedAt) : undefined,
  );
  const [{ total } = { total: 0 }] = await db.select({ total: sql<number>`count(*)::int` }).from(cases).where(where);
  const rows = await db
    .select({
      id: cases.id,
      service: cases.service,
      reference: cases.reference,
      kind: cases.kind,
      status: cases.status,
      summary: cases.summary,
      assignedTo: cases.assignedTo,
      actingOrganisationId: cases.actingOrganisationId,
      createdAt: cases.createdAt,
      updatedAt: cases.updatedAt,
      closedAt: cases.closedAt,
      assigneeName: user.name,
    })
    .from(cases)
    .leftJoin(user, eq(user.id, cases.assignedTo))
    .where(where)
    .orderBy(desc(cases.updatedAt), desc(cases.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  return { rows, total, page, pageSize };
}
