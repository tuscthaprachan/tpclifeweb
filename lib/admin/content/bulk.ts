import "server-only";

import { inArray, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { getDb } from "@/lib/db";
import type { AuditExecutor } from "@/lib/db/audit";
import type { ContentActor } from "./access";
import { isUuid } from "./form-state";
import { ContentInUseError, ContentNotFoundError, deleteContent, setStatus, type ContentTable } from "./save";
import type { ContentTypeDef } from "./types";

export type BulkAction = "publish" | "unpublish" | "delete";

export const BULK_ACTIONS: readonly BulkAction[] = ["publish", "unpublish", "delete"];

/** Rows one bulk request may touch; a page holds 25. */
export const BULK_LIMIT = 100;

export type BulkFailureReason = "missingTh" | "missingEn" | "missingBoth" | "notFound" | "inUse" | "error";

export interface BulkFailure {
  id: string;
  reason: BulkFailureReason;
}

export interface BulkResult {
  /** Rows changed, or already in the wanted state. */
  done: string[];
  failed: BulkFailure[];
}

export const isBulkAction = (value: unknown): value is BulkAction => BULK_ACTIONS.includes(value as BulkAction);

/** Whether a type offers bulk actions: a collection with titles, so every row can be named and checked. */
export function supportsBulk(def: ContentTypeDef): boolean {
  return def.kind === "collection" && Boolean(def.columns.title) && Boolean(def.columns.status);
}

/** The valid, distinct ids from a form, capped at `BULK_LIMIT`. */
export function parseIds(values: readonly unknown[]): string[] {
  return [...new Set(values.filter((v): v is string => typeof v === "string" && isUuid(v)))].slice(0, BULK_LIMIT);
}

/** Why a row cannot be published: it needs a title in both languages. */
export function publishBlocker(title: { th: string; en: string }): BulkFailureReason | undefined {
  const th = title.th.trim() === "";
  const en = title.en.trim() === "";
  if (th && en) return "missingBoth";
  if (th) return "missingTh";
  if (en) return "missingEn";
  return undefined;
}

/**
 * Publishes, unpublishes or deletes each id through `setStatus` and
 * `deleteContent`, so revisions, audit entries and cache expiry are exactly
 * those of a single edit. Each row stands alone: one failure never stops the
 * rest, and the result says which rows failed and why.
 */
export async function applyBulk(input: {
  def: ContentTypeDef;
  action: BulkAction;
  ids: readonly string[];
  actor: ContentActor;
  db?: AuditExecutor;
}): Promise<BulkResult> {
  const { def, action, actor } = input;
  const db = input.db ?? getDb();
  const result: BulkResult = { done: [], failed: [] };
  const title = def.columns.title;
  if (!title) return { done: [], failed: input.ids.map((id) => ({ id, reason: "error" })) };
  const table = def.table as ContentTable;

  const found = await db
    .select({ id: def.columns.id, th: title[0], en: title[1], status: def.columns.status as AnyPgColumn })
    .from(def.table)
    .where(inArray(def.columns.id, [...input.ids]) as SQL);
  const byId = new Map(found.map((r) => [r.id as string, r]));

  for (const id of input.ids) {
    const row = byId.get(id);
    if (!row) {
      result.failed.push({ id, reason: "notFound" });
      continue;
    }
    try {
      if (action === "delete") {
        await deleteContent({ entityType: def.entityType, table, actor, db, id });
      } else if (action === "publish") {
        const blocked = publishBlocker({ th: String(row.th ?? ""), en: String(row.en ?? "") });
        if (blocked) {
          result.failed.push({ id, reason: blocked });
          continue;
        }
        if (row.status !== "published") await setStatus({ entityType: def.entityType, table, actor, db, id, status: "published" });
      } else if (row.status !== "draft") {
        await setStatus({ entityType: def.entityType, table, actor, db, id, status: "draft" });
      }
      result.done.push(id);
    } catch (error) {
      const reason: BulkFailureReason = error instanceof ContentNotFoundError ? "notFound" : error instanceof ContentInUseError ? "inUse" : "error";
      result.failed.push({ id, reason });
    }
  }
  return result;
}

/** `ok` and `fail` parameters for the redirect back to the list. */
export function bulkResultParams(action: BulkAction, result: BulkResult): URLSearchParams {
  const search = new URLSearchParams({ bulk: action, ok: String(result.done.length) });
  for (const f of result.failed) search.append("fail", `${f.id}.${f.reason}`);
  return search;
}

const REASONS: readonly BulkFailureReason[] = ["missingTh", "missingEn", "missingBoth", "notFound", "inUse", "error"];

/** Reads a bulk result back from the list's query parameters. */
export function parseBulkResult(params: { bulk?: string; ok?: string; fail?: string | string[] }): { action: BulkAction; ok: number; failed: BulkFailure[] } | undefined {
  if (!isBulkAction(params.bulk)) return undefined;
  const raw = Array.isArray(params.fail) ? params.fail : params.fail ? [params.fail] : [];
  const failed = raw
    .map((entry): BulkFailure | undefined => {
      const [id, reason] = entry.split(".");
      return id && isUuid(id) && REASONS.includes(reason as BulkFailureReason) ? { id, reason: reason as BulkFailureReason } : undefined;
    })
    .filter((f): f is BulkFailure => Boolean(f))
    .slice(0, BULK_LIMIT);
  return { action: params.bulk, ok: Math.max(0, Number.parseInt(params.ok ?? "0", 10) || 0), failed };
}
