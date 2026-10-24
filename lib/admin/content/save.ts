import "server-only";

import { eq, getTableName } from "drizzle-orm";
import type { AnyPgColumn, AnyPgTable } from "drizzle-orm/pg-core";
import { getDb } from "@/lib/db";
import { withAudit, type AuditExecutor } from "@/lib/db/audit";
import { recordRevision } from "@/lib/db/revisions";
import type { ContentStatus } from "@/lib/db/schema/content/enums";
import { revalidateFor, type ContentEntityType } from "@/lib/content/revalidate";
import type { ContentActor } from "./access";

/**
 * The one write path for editable content. Every content type's Server Action
 * saves, publishes, unpublishes and deletes through these three functions, so
 * the row, its audit entry and its revision always commit together, and the
 * cache is expired only after the commit.
 */

/** A table built with `contentColumns()`. */
export type ContentTable = AnyPgTable & {
  id: AnyPgColumn;
  status: AnyPgColumn;
  publishedAt: AnyPgColumn;
  createdBy: AnyPgColumn;
  updatedBy: AnyPgColumn;
};

/** The row to change no longer exists. */
export class ContentNotFoundError extends Error {
  constructor() {
    super("Content not found");
    this.name = "ContentNotFoundError";
  }
}

/** A unique constraint (usually the slug) is already taken. */
export class ContentConflictError extends Error {
  constructor(readonly constraint: string | undefined) {
    super(`Content conflicts with an existing row${constraint ? ` (${constraint})` : ""}`);
    this.name = "ContentConflictError";
  }
}

/** Something still points at the row (a foreign key restricts the delete). */
export class ContentInUseError extends Error {
  constructor() {
    super("Content is still in use");
    this.name = "ContentInUseError";
  }
}

export interface SaveContentInput {
  /** Which public pages and caches to expire. */
  entityType: ContentEntityType;
  table: ContentTable;
  actor: ContentActor;
  /** Omit to insert. */
  id?: string;
  /** Columns to set, camelCase as in the Drizzle table. Do not include id, status or the createdBy/updatedBy columns. */
  values: Record<string, unknown>;
  /** Omit to leave the status alone (new rows start as draft). Publishing sets `publishedAt` if the row has none. */
  status?: ContentStatus;
  /**
   * Replaces child rows (tags, images, stops...) inside the same transaction.
   * Return what was written; it goes into the audit entry and the revision.
   */
  children?: (tx: AuditExecutor, id: string) => Promise<Record<string, unknown> | void>;
  db?: AuditExecutor;
  now?: Date;
}

export interface SaveContentResult {
  id: string;
  created: boolean;
  /** The row as stored. */
  row: Record<string, unknown>;
}

function errorChain(error: unknown): { code?: string; constraint?: string }[] {
  const out: { code?: string; constraint?: string }[] = [];
  for (let e = error as { cause?: unknown } | undefined, i = 0; e && i < 4; e = e.cause as typeof e, i++) {
    out.push(e as { code?: string; constraint?: string });
  }
  return out;
}

function translate(error: unknown): unknown {
  for (const e of errorChain(error)) {
    if (e.code === "23505") return new ContentConflictError(e.constraint);
    if (e.code === "23503") return new ContentInUseError();
  }
  return error;
}

const slugsOf = (...rows: (Record<string, unknown> | undefined)[]): string[] => [
  ...new Set(rows.map((r) => r?.slug).filter((s): s is string => typeof s === "string" && s !== "")),
];

function expire(entityType: ContentEntityType, slugs: string[]): void {
  if (slugs.length === 0) revalidateFor(entityType);
  for (const slug of slugs) revalidateFor(entityType, slug);
}

async function loadRow(tx: AuditExecutor, table: ContentTable, id: string): Promise<Record<string, unknown>> {
  const [row] = (await tx.select().from(table).where(eq(table.id, id)).limit(1)) as Record<string, unknown>[];
  if (!row) throw new ContentNotFoundError();
  return row;
}

/**
 * Inserts or updates a row, in one transaction with its audit entry and a
 * revision snapshot; then expires the caches. Throws `ContentNotFoundError`,
 * `ContentConflictError` (duplicate slug) or whatever the database throws.
 */
export async function saveContent(input: SaveContentInput): Promise<SaveContentResult> {
  const { entityType, table, actor, values, status, children } = input;
  const db = input.db ?? getDb();
  const now = input.now ?? new Date();
  const name = getTableName(table);

  let result: { saved: SaveContentResult; before?: Record<string, unknown> };
  try {
    result = await withAudit(db, actor.context, async (tx, audit) => {
      const before = input.id ? await loadRow(tx, table, input.id) : undefined;

      const set: Record<string, unknown> = { ...values, updatedBy: actor.userId, updatedAt: now };
      if (status) {
        set.status = status;
        if (status === "published") set.publishedAt = values.publishedAt ?? before?.publishedAt ?? now;
      }

      const rows = (before
        ? await tx.update(table).set(set).where(eq(table.id, before.id as string)).returning()
        : await tx.insert(table).values({ ...set, createdBy: actor.userId }).returning()) as Record<string, unknown>[];
      const row = rows[0]!;
      const id = row.id as string;
      const wrote = (await children?.(tx, id)) ?? undefined;
      const snapshot = { row, ...(wrote ?? {}) };

      const became = before && before.status !== row.status ? (row.status === "published" ? "publish" : "unpublish") : undefined;
      await audit({
        action: `${name}.${before ? (became ?? "update") : "create"}`,
        entityType: name,
        entityId: id,
        before,
        after: snapshot,
      });
      await recordRevision(tx, { entityType: name, entityId: id, revision: snapshot, createdBy: actor.userId });
      return { saved: { id, created: !before, row }, before };
    });
  } catch (error) {
    throw translate(error);
  }

  expire(entityType, slugsOf(result.saved.row, result.before));
  return result.saved;
}

/** Publishes or unpublishes without touching any other field. */
export async function setStatus(
  input: Pick<SaveContentInput, "entityType" | "table" | "actor" | "db" | "now"> & { id: string; status: ContentStatus },
): Promise<SaveContentResult> {
  return saveContent({ ...input, values: {} });
}

/** Deletes a row (child rows cascade) with an audit entry and a final revision. Throws `ContentNotFoundError` or `ContentInUseError`. */
export async function deleteContent(
  input: Pick<SaveContentInput, "entityType" | "table" | "actor" | "db"> & { id: string },
): Promise<void> {
  const { entityType, table, actor, id } = input;
  const db = input.db ?? getDb();
  const name = getTableName(table);

  let before: Record<string, unknown>;
  try {
    before = await withAudit(db, actor.context, async (tx, audit) => {
      const row = await loadRow(tx, table, id);
      await tx.delete(table).where(eq(table.id, id));
      await audit({ action: `${name}.delete`, entityType: name, entityId: id, before: row });
      await recordRevision(tx, { entityType: name, entityId: id, revision: { deleted: true, row }, createdBy: actor.userId });
      return row;
    });
  } catch (error) {
    throw translate(error);
  }
  expire(entityType, slugsOf(before));
}
