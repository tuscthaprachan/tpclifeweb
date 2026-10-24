/**
 * Shared helpers for the engine modules. Not part of the public API.
 */

import { eq } from "drizzle-orm";
import type { AuditContext, AuditExecutor } from "@/lib/db/audit";
import { caseEvents, cases, type CaseEventType, type CaseEventVisibility, type CaseRow } from "@/lib/db/schema/cases";
import { canAccessService, resolveActingOrganisation } from "./access";
import { CaseError, type CaseActor, type StaffActor } from "./types";

export function auditContextOf(actor: CaseActor): AuditContext {
  const base = { ip: actor.context?.ip ?? null, userAgent: actor.context?.userAgent ?? null, requestId: actor.context?.requestId ?? null };
  return actor.kind === "staff"
    ? { ...base, actorUserId: actor.userId, actorOrganisationId: actor.organisationId }
    : { ...base, actorUserId: null, actorOrganisationId: null };
}

/** Throws unless `actor` is staff who may work `service`, acting for an organisation they hold a role in. */
export function assertStaff(actor: CaseActor, service: CaseRow["service"]): asserts actor is StaffActor {
  if (actor.kind !== "staff" || !canAccessService(actor.roles, service) || resolveActingOrganisation(actor.roles, service, actor.organisationId) !== actor.organisationId) {
    throw new CaseError("forbidden", "You do not have access to this service.");
  }
}

/** Loads a case row, locking it for the rest of the transaction. */
export async function lockCase(tx: AuditExecutor, caseId: string): Promise<CaseRow> {
  const [row] = await tx.select().from(cases).where(eq(cases.id, caseId)).for("update");
  if (!row) throw new CaseError("not_found", "Case not found.");
  return row;
}

export interface NewEvent {
  type: CaseEventType;
  visibility?: CaseEventVisibility;
  body?: string | null;
  bodyTh?: string | null;
  bodyEn?: string | null;
  fromStatus?: string | null;
  toStatus?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function appendEvent(tx: AuditExecutor, caseId: string, actor: CaseActor, now: Date, event: NewEvent): Promise<string> {
  const [row] = await tx
    .insert(caseEvents)
    .values({
      caseId,
      type: event.type,
      visibility: event.visibility ?? "internal",
      body: event.body ?? null,
      bodyTh: event.bodyTh ?? null,
      bodyEn: event.bodyEn ?? null,
      fromStatus: event.fromStatus ?? null,
      toStatus: event.toStatus ?? null,
      actorUserId: actor.kind === "staff" ? actor.userId : null,
      actingOrganisationId: actor.kind === "staff" ? actor.organisationId : null,
      metadata: event.metadata ?? null,
      createdAt: now,
    })
    .returning({ id: caseEvents.id });
  if (!row) throw new Error("Could not record the case event.");
  return row.id;
}

/** Bumps `updated_at` and, for staff, records which organisation acted last. */
export async function touchCase(tx: AuditExecutor, caseId: string, actor: CaseActor, now: Date, set: Partial<typeof cases.$inferInsert> = {}): Promise<void> {
  await tx
    .update(cases)
    .set({ ...set, updatedAt: now, ...(actor.kind === "staff" ? { actingOrganisationId: actor.organisationId } : {}) })
    .where(eq(cases.id, caseId));
}

export const NOTE_MAX = 4000;

export function cleanText(value: string, max: number, what: string): string {
  const text = value.trim();
  if (!text) throw new CaseError("invalid", `${what} is empty.`);
  if (text.length > max) throw new CaseError("invalid", `${what} is longer than ${max} characters.`);
  return text;
}

export function addOneYear(from: Date): Date {
  const d = new Date(from);
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d;
}
