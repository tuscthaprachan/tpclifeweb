/**
 * Bulk actions on the inbox: assign many cases, or move many to one status.
 * Each case goes through the engine on its own (`assign`, `transition`), so
 * the access rules, the state machine, the events and the audit rows are the
 * single-case ones, and a case that cannot take the action fails alone with a
 * reason while the rest go through. Complaints and loans are not moved here:
 * resolving a complaint needs an outcome and a handover records a deposit, so
 * those keep their own forms.
 */

import { inArray } from "drizzle-orm";
import type { AuditExecutor } from "@/lib/db/audit";
import { cases } from "@/lib/db/schema/cases";
import { expireListing } from "@/lib/lost-found/listing";
import { assign, transition } from "./engine";
import { usesOwnActions } from "./services";
import { CaseError, type StaffActor } from "./types";

export const CASE_BULK_LIMIT = 100;

export type CaseBulkReason = "forbidden" | "not_found" | "invalid_transition" | "stale" | "pii_deleted" | "assignee" | "use_actions" | "invalid" | "error";
export const CASE_BULK_REASONS: readonly CaseBulkReason[] = ["forbidden", "not_found", "invalid_transition", "stale", "pii_deleted", "assignee", "use_actions", "invalid", "error"];

export interface CaseBulkResult {
  done: string[];
  failed: { id: string; reason: CaseBulkReason }[];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Distinct valid ids from a form, in order, up to the limit. */
export function parseCaseIds(values: readonly unknown[]): string[] {
  return [...new Set(values.filter((v): v is string => typeof v === "string" && UUID.test(v)))].slice(0, CASE_BULK_LIMIT);
}

function reasonOf(error: unknown): CaseBulkReason {
  if (error instanceof CaseError) {
    if (error.code === "invalid") return error.message.includes("cannot work") ? "assignee" : "invalid";
    return error.code;
  }
  console.error("[cases] bulk action failed", error instanceof Error ? error.message : error);
  return "error";
}

async function each(ids: readonly string[], work: (id: string) => Promise<CaseBulkReason | null>): Promise<CaseBulkResult> {
  const result: CaseBulkResult = { done: [], failed: [] };
  for (const id of ids) {
    try {
      const reason = await work(id);
      if (reason) result.failed.push({ id, reason });
      else result.done.push(id);
    } catch (error) {
      result.failed.push({ id, reason: reasonOf(error) });
    }
  }
  return result;
}

/** Assigns every case to `assigneeUserId` (or clears it with null). */
export async function bulkAssign(db: AuditExecutor, ids: readonly string[], assigneeUserId: string | null, actor: StaffActor, opts: { now?: Date } = {}): Promise<CaseBulkResult> {
  return each(ids.slice(0, CASE_BULK_LIMIT), async (id) => {
    await assign(db, id, assigneeUserId, actor, opts);
    return null;
  });
}

/** Moves every case to `to` where its state machine allows it. */
export async function bulkTransition(db: AuditExecutor, ids: readonly string[], to: string, actor: StaffActor, opts: { now?: Date } = {}): Promise<CaseBulkResult> {
  const wanted = ids.slice(0, CASE_BULK_LIMIT);
  const rows = wanted.length > 0 ? await db.select({ id: cases.id, service: cases.service }).from(cases).where(inArray(cases.id, [...wanted])) : [];
  const service = new Map(rows.map((r) => [r.id, r.service]));
  return each(wanted, async (id) => {
    const s = service.get(id);
    if (!s) return "not_found";
    if (usesOwnActions(s)) return "use_actions";
    await transition(db, id, to, actor, opts);
    if (s === "lost_found") await expireListing(db, id);
    return null;
  });
}

/** `bulk`, `ok` and `fail` parameters for the redirect back to the inbox. */
export function caseBulkParams(action: "assign" | "transition", result: CaseBulkResult): URLSearchParams {
  const search = new URLSearchParams({ bulk: action, ok: String(result.done.length) });
  for (const f of result.failed) search.append("fail", `${f.id}.${f.reason}`);
  return search;
}

export function parseCaseBulkReport(params: { bulk?: string | string[]; ok?: string | string[]; fail?: string | string[] }): { action: "assign" | "transition"; ok: number; failed: { id: string; reason: CaseBulkReason }[] } | undefined {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const action = first(params.bulk);
  if (action !== "assign" && action !== "transition") return undefined;
  const raw = Array.isArray(params.fail) ? params.fail : params.fail ? [params.fail] : [];
  const failed = raw
    .map((entry) => {
      const [id, reason] = entry.split(".");
      return id && UUID.test(id) && CASE_BULK_REASONS.includes(reason as CaseBulkReason) ? { id, reason: reason as CaseBulkReason } : undefined;
    })
    .filter((f): f is { id: string; reason: CaseBulkReason } => Boolean(f))
    .slice(0, CASE_BULK_LIMIT);
  return { action, ok: Math.max(0, Number.parseInt(first(params.ok) ?? "0", 10) || 0), failed };
}
