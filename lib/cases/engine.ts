/**
 * The case engine: create, move, annotate and assign cases for every service.
 *
 * Every function takes the database (or a transaction) first and the actor
 * last, runs in one transaction with its audit entry, and checks access itself
 * in the data layer (lib/cases/access.ts). Staff operations throw
 * `CaseError("forbidden")` for staff without a role in the case's service.
 * Pass `{ now }` in tests.
 */

import { and, asc, desc, eq, ilike, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { withAudit, type AuditExecutor } from "@/lib/db/audit";
import { nextReference } from "@/lib/db/references";
import { user } from "@/lib/db/schema/auth";
import { caseEvents, cases, type CaseEventRow, type CaseRow, type CaseService } from "@/lib/db/schema/cases";
import { borrowingRequests } from "@/lib/db/schema/borrowing";
import { complaintCases, complaintCategories } from "@/lib/db/schema/complaints";
import { createNotification, createNotifications } from "@/lib/notifications/create";
import { staffRoles } from "@/lib/db/schema/staff-roles";
import { bangkokDateKey } from "@/lib/i18n/format";
import { complaintEscalated, complaintOverdue } from "@/lib/complaints/overdue";
import { accessibleServices } from "./access";
import { AFTER_TRANSITION, loadGuardFacts } from "./hooks";
import { caseDueAt, dueState, type DueState } from "./due";
import { DEFAULT_CASE_SORT, defaultCaseDir, type CaseSortDir, type CaseSortKey } from "./inbox-query";
import { listMentionable, parseMentions } from "./mentions";
import { assertCaseAccess, canSeeCase, caseVisibleTo } from "./restrictions";
import { insertContact, type ContactInput } from "./contacts";
import { addOneYear, appendEvent, assertStaff, auditContextOf, cleanText, lockCase, NOTE_MAX, touchCase } from "./internal";
import { allowedTransitions, canSystemTransition, getServiceDef, getStatusDef, guardsAllow, guardsFor, initialStatus, isPublicStatus, isTerminalStatus, isValidKind, SERVICES } from "./services";
import { CaseError, type BilingualText, type CaseActor, type PublicUpdateText, type StaffActor, type SystemActor } from "./types";
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

/** At least one language is needed; a blank one is stored as null. */
export function cleanPublicUpdate(text: PublicUpdateText, what: string): { th: string | null; en: string | null } {
  const th = text.th?.trim() ?? "";
  const en = text.en?.trim() ?? "";
  if (!th && !en) throw new CaseError("invalid", `${what} is empty. Write it in Thai, English or both.`);
  return { th: th ? cleanText(th, NOTE_MAX, `${what} (Thai)`) : null, en: en ? cleanText(en, NOTE_MAX, `${what} (English)`) : null };
}

/** Throws `invalid_transition` unless every guard on the move allows it. Facts are read only when a guard applies. */
async function assertGuards(tx: AuditExecutor, row: CaseRow, to: string, now: Date): Promise<void> {
  if (guardsFor(row.service, row.kind, row.status, to).length === 0) return;
  const facts = await loadGuardFacts(tx, row.service, row.id);
  if (!guardsAllow(row.service, row.kind, row.status, to, facts, now)) throw new CaseError("invalid_transition", `${row.status} cannot move to ${to} now.`);
}

/**
 * The columns a move to `to` changes: the status, and the closing clocks. Reaching a terminal status sets
 * `closed_at` and `pii_delete_after` (one year later); leaving one clears both, unless personal data was already deleted.
 */
function statusChange(row: CaseRow, to: string, now: Date): Partial<typeof cases.$inferInsert> {
  const set: Partial<typeof cases.$inferInsert> = { status: to };
  if (isTerminalStatus(row.service, row.kind, to)) {
    set.closedAt = now;
    set.piiDeleteAfter = addOneYear(now);
  } else if (isTerminalStatus(row.service, row.kind, row.status)) {
    if (row.piiDeletedAt) throw new CaseError("pii_deleted", "This case cannot be reopened: its personal data has been deleted.");
    set.closedAt = null;
    set.piiDeleteAfter = null;
  }
  return set;
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
    if (actor.kind === "staff") await assertCaseAccess(tx, row, actor);
    else if (actor.kind === "system") throw new CaseError("forbidden", "Only staff or the person concerned can change a status.");
    if (opts.expectedFrom !== undefined && opts.expectedFrom !== row.status) throw new CaseError("stale", "The case has changed since it was opened.");
    const by = actor.kind === "staff" ? "staff" : "public";
    if (!allowedTransitions(row.service, row.kind, row.status, by).includes(to)) {
      throw new CaseError("invalid_transition", `${row.status} cannot move to ${to}.`);
    }
    await assertGuards(tx, row, to, now);
    const target = getStatusDef(row.service, row.kind, to)!;
    const set = statusChange(row, to, now);
    await touchCase(tx, caseId, actor, now, set);
    await appendEvent(tx, caseId, actor, now, {
      type: "status_changed",
      visibility: isPublicStatus(row.service, row.kind, to) ? "public" : "internal",
      fromStatus: row.status,
      toStatus: to,
      bodyTh: note?.th,
      bodyEn: note?.en,
    });
    await AFTER_TRANSITION[row.service]?.(tx, { caseId, kind: row.kind, from: row.status, to, actor, now });
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

export interface SystemTransitionOptions {
  now?: Date;
  /** The audit action name. Defaults to `case.transition`. */
  auditAction?: string;
  /** Extra fields on the audit entry's `after`. */
  auditAfter?: Record<string, unknown>;
  /** Stored on the status event. */
  metadata?: Record<string, unknown>;
}

/**
 * Makes a move the machine lists in `systemTo`, for a job or for a person's
 * public claim, which `transition` refuses. It runs under the same lock, closing
 * clocks, guards, public event and after-transition hook as `transition`. Returns
 * null, changing nothing, when the case is no longer in a status the system may
 * move to `to` from (someone else moved it first).
 */
export async function systemTransition(db: AuditExecutor, caseId: string, to: string, actor: SystemActor, opts: SystemTransitionOptions = {}): Promise<CaseRow | null> {
  const now = opts.now ?? new Date();
  return withAudit(db, auditContextOf(actor), async (tx, audit) => {
    const row = await lockCase(tx, caseId);
    if (!canSystemTransition(row.service, row.kind, row.status, to)) return null;
    await assertGuards(tx, row, to, now);
    const target = getStatusDef(row.service, row.kind, to)!;
    const set = statusChange(row, to, now);
    await touchCase(tx, caseId, actor, now, set);
    await appendEvent(tx, caseId, actor, now, {
      type: "status_changed",
      visibility: isPublicStatus(row.service, row.kind, to) ? "public" : "internal",
      fromStatus: row.status,
      toStatus: to,
      metadata: opts.metadata,
    });
    await AFTER_TRANSITION[row.service]?.(tx, { caseId, kind: row.kind, from: row.status, to, actor, now });
    await audit({
      action: opts.auditAction ?? "case.transition",
      entityType: "case",
      entityId: caseId,
      before: { status: row.status },
      after: { status: to, ...(target.terminal ? { piiDeleteAfter: set.piiDeleteAfter?.toISOString() } : {}), ...opts.auditAfter },
    });
    return { ...row, ...set, updatedAt: now } as CaseRow;
  });
}

/**
 * Adds a staff-only note (one language). Notes are never deleted by retention, so keep personal details out of them.
 * `@Name` for a member of staff who can see the case is stored as a mention and notifies them; `mentionIds` are
 * the people the autocomplete picked, which settles two people with the same name.
 */
export async function addNote(db: AuditExecutor, caseId: string, body: string, actor: CaseActor, opts: { now?: Date; mentionIds?: readonly string[] } = {}): Promise<string> {
  const now = opts.now ?? new Date();
  const text = cleanText(body, NOTE_MAX, "Note");
  return withAudit(db, auditContextOf(actor), async (tx, audit) => {
    const row = await lockCase(tx, caseId);
    await assertCaseAccess(tx, row, actor);
    const mentions = text.includes("@") ? parseMentions(text, await listMentionable(tx, caseId, row.service), opts.mentionIds ?? []) : { text, ids: [] };
    const id = await appendEvent(tx, caseId, actor, now, { type: "internal_note", body: mentions.text, metadata: mentions.ids.length > 0 ? { mentions: mentions.ids } : null });
    await touchCase(tx, caseId, actor, now);
    await audit({ action: "case.note", entityType: "case", entityId: caseId, after: { eventId: id, ...(mentions.ids.length > 0 ? { mentions: mentions.ids } : {}) } });
    const actorName = actor.kind === "staff" ? await staffName(tx, actor.userId) : "";
    await createNotifications(
      tx,
      mentions.ids
        .filter((userId) => actor.kind !== "staff" || userId !== actor.userId)
        .map((userId) => ({ userId, kind: "case_mention" as const, params: { actor: actorName, reference: row.reference }, href: `/admin/cases/${caseId}#case-timeline`, entityType: "case", entityId: caseId, dedupeKey: `mention:${id}` })),
      now,
    );
    return id;
  });
}

async function staffName(tx: AuditExecutor, userId: string): Promise<string> {
  const [row] = await tx.select({ name: user.name }).from(user).where(eq(user.id, userId));
  return row?.name ?? "";
}

/**
 * Adds an update the person sees on the tracking page. Write it in Thai,
 * English or both: at least one is needed, and the page shows the reader's
 * language, falling back to the other. `metadata` tags the event (for example
 * `{ claimId }`, which keeps it off the case's general timeline).
 */
export async function addPublicUpdate(
  db: AuditExecutor,
  caseId: string,
  text: PublicUpdateText,
  actor: CaseActor,
  opts: { now?: Date; metadata?: Record<string, unknown> } = {},
): Promise<string> {
  const now = opts.now ?? new Date();
  const body = cleanPublicUpdate(text, "Update");
  return withAudit(db, auditContextOf(actor), async (tx, audit) => {
    const row = await lockCase(tx, caseId);
    await assertCaseAccess(tx, row, actor);
    const id = await appendEvent(tx, caseId, actor, now, { type: "public_update", visibility: "public", bodyTh: body.th, bodyEn: body.en, metadata: opts.metadata });
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
    await assertCaseAccess(tx, row, actor);
    if (assigneeUserId !== null && !((await canWorkService(tx, assigneeUserId, row.service)) && (await canSeeCase(tx, caseId, assigneeUserId)))) {
      throw new CaseError("invalid", "That person cannot work on this service.");
    }
    if (assigneeUserId === row.assignedTo) return;
    await touchCase(tx, caseId, actor, now, { assignedTo: assigneeUserId });
    await appendEvent(tx, caseId, actor, now, { type: "assigned", metadata: { from: row.assignedTo, to: assigneeUserId } });
    await audit({ action: "case.assign", entityType: "case", entityId: caseId, before: { assignedTo: row.assignedTo }, after: { assignedTo: assigneeUserId } });
    if (assigneeUserId !== null && actor.kind === "staff" && assigneeUserId !== actor.userId) {
      await createNotification(
        tx,
        { userId: assigneeUserId, kind: "case_assigned", params: { actor: await staffName(tx, actor.userId), reference: row.reference }, href: `/admin/cases/${caseId}`, entityType: "case", entityId: caseId, dedupeKey: `assigned:${caseId}:${now.getTime()}` },
        now,
      );
    }
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
  await assertCaseAccess(db, row, actor);
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
  /** Only complaints that are open and past a target (not acknowledged by its date, or past the resolve date). */
  overdue?: boolean;
  /** Only complaints the daily job has flagged as escalated and that are still open. */
  escalated?: boolean;
  /** Received (opened), updated, due (a complaint's target or a loan's return, none last), reference or status. Default: updated, newest first. */
  sort?: CaseSortKey;
  dir?: CaseSortDir;
  /** The moment "overdue" is judged at. Tests pass it. */
  now?: Date;
  page?: number;
  pageSize?: number;
  /** Return up to `INBOX_EXPORT_LIMIT` rows in one go, for the export. */
  unpaged?: boolean;
}

export interface CaseListRow extends Pick<CaseRow, "id" | "service" | "reference" | "kind" | "status" | "summary" | "assignedTo" | "actingOrganisationId" | "createdAt" | "updatedAt" | "closedAt"> {
  assigneeName: string | null;
  /** A complaint that is open and past a target. Always false for other services. */
  overdue: boolean;
  /** A complaint the daily job has flagged as escalated and that is still open. */
  escalated: boolean;
  /** The complaint's category (English name), for the export. Null for other services. */
  categoryName: string | null;
  /** When the case is next due, if it has a date. */
  dueAt: Date | null;
  dueState: DueState | null;
}

export interface CaseList {
  rows: CaseListRow[];
  total: number;
  page: number;
  pageSize: number;
}

export const INBOX_PAGE_SIZE = 25;
export const INBOX_EXPORT_LIMIT = 5000;

function orderFor(sort: CaseSortKey, dir: CaseSortDir): SQL[] {
  const by = dir === "asc" ? asc : desc;
  switch (sort) {
    case "received":
      return [by(cases.createdAt), desc(cases.id)];
    case "reference":
      return [by(cases.reference)];
    case "status":
      return [by(cases.status), desc(cases.updatedAt)];
    case "due":
      return [sql`${caseDueAt()} ${dir === "asc" ? sql`asc` : sql`desc`} nulls last`, desc(cases.updatedAt)];
    default:
      return [by(cases.updatedAt), by(cases.createdAt)];
  }
}

/** The inbox query: only services the staff member may work and cases they may see, newest activity first unless sorted. */
export async function listCases(db: AuditExecutor, actor: StaffActor, filters: CaseListFilters = {}): Promise<CaseList> {
  const pageSize = filters.unpaged ? INBOX_EXPORT_LIMIT : Math.min(Math.max(filters.pageSize ?? INBOX_PAGE_SIZE, 1), 100);
  const page = filters.unpaged ? 1 : Math.max(Math.floor(filters.page ?? 1), 1);
  const allowed = accessibleServices(actor.roles).filter((s) => !filters.service || s === filters.service);
  if (allowed.length === 0) return { rows: [], total: 0, page, pageSize };

  const q = filters.q?.trim().replace(/[\\%_]/g, (c) => `\\${c}`);
  const assignee = filters.assignee === "me" ? actor.userId : filters.assignee;
  const now = filters.now ?? new Date();
  const sort = filters.sort ?? DEFAULT_CASE_SORT.sort;
  const dir = filters.dir ?? (filters.sort ? defaultCaseDir(sort) : DEFAULT_CASE_SORT.dir);
  const where = and(
    inArray(cases.service, allowed),
    caseVisibleTo(actor.userId),
    filters.overdue ? complaintOverdue(now) : undefined,
    filters.escalated ? complaintEscalated() : undefined,
    filters.status ? eq(cases.status, filters.status) : undefined,
    assignee === "unassigned" ? isNull(cases.assignedTo) : assignee ? eq(cases.assignedTo, assignee) : undefined,
    q ? or(ilike(cases.reference, `%${q}%`)) : undefined,
    filters.openOnly ? isNull(cases.closedAt) : undefined,
  );
  const [{ total } = { total: 0 }] = await db.select({ total: sql<number>`count(*)::int` }).from(cases).leftJoin(complaintCases, eq(complaintCases.caseId, cases.id)).where(where);
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
      categoryName: complaintCategories.nameEn,
      overdue: sql<boolean>`coalesce(${complaintOverdue(now)}, false)`,
      escalated: sql<boolean>`coalesce(${complaintEscalated()}, false)`,
      dueAt: sql<string | null>`${caseDueAt()}`,
    })
    .from(cases)
    .leftJoin(user, eq(user.id, cases.assignedTo))
    .leftJoin(complaintCases, eq(complaintCases.caseId, cases.id))
    .leftJoin(complaintCategories, eq(complaintCategories.id, complaintCases.categoryId))
    .leftJoin(borrowingRequests, eq(borrowingRequests.caseId, cases.id))
    .where(where)
    .orderBy(...orderFor(sort, dir))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  return {
    rows: rows.map(({ dueAt, ...row }) => {
      const due = dueAt ? new Date(dueAt) : null;
      return { ...row, dueAt: due, dueState: dueState(due, now) };
    }),
    total,
    page,
    pageSize,
  };
}
