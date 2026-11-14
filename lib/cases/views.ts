/**
 * Saved inbox views: a name and a query string per person, optionally shared
 * with every member of staff who can open the inbox. Only the owner renames,
 * shares or deletes a view; anyone else gets `not_found`. The stored query is
 * reduced to the filter and sort parameters, so a view never carries a page
 * number or anything else from the address bar.
 */

import { and, asc, count, eq, or } from "drizzle-orm";
import { withAudit, type AuditContext, type AuditExecutor } from "@/lib/db/audit";
import { user } from "@/lib/db/schema/auth";
import { savedCaseViews } from "@/lib/db/schema/saved-case-views";
import { canonicalViewQuery } from "./inbox-query";

export const VIEW_NAME_MAX = 60;
export const VIEWS_PER_PERSON = 30;

export type ViewErrorCode = "name" | "limit" | "not_found";

export class ViewError extends Error {
  constructor(readonly code: ViewErrorCode) {
    super(code);
    this.name = "ViewError";
  }
}

export interface SavedView {
  id: string;
  name: string;
  query: string;
  shared: boolean;
  ownerId: string;
  ownerName: string;
  mine: boolean;
}

function cleanName(name: string): string {
  const text = name.replace(/\s+/g, " ").trim();
  if (!text || text.length > VIEW_NAME_MAX) throw new ViewError("name");
  return text;
}

/** The person's own views and everyone's shared ones: theirs first, then by name. */
export async function listViews(db: AuditExecutor, userId: string): Promise<SavedView[]> {
  const rows = await db
    .select({ id: savedCaseViews.id, name: savedCaseViews.name, query: savedCaseViews.query, shared: savedCaseViews.shared, ownerId: savedCaseViews.userId, ownerName: user.name })
    .from(savedCaseViews)
    .innerJoin(user, eq(user.id, savedCaseViews.userId))
    .where(or(eq(savedCaseViews.userId, userId), eq(savedCaseViews.shared, true)))
    .orderBy(asc(savedCaseViews.name), asc(savedCaseViews.createdAt));
  const views = rows.map((r) => ({ ...r, mine: r.ownerId === userId }));
  return [...views.filter((v) => v.mine), ...views.filter((v) => !v.mine)];
}

export async function createView(db: AuditExecutor, userId: string, input: { name: string; query: string; shared?: boolean }, context: AuditContext = {}): Promise<string> {
  const name = cleanName(input.name);
  const query = canonicalViewQuery(input.query);
  return withAudit(db, { ...context, actorUserId: userId }, async (tx, audit) => {
    const [{ n } = { n: 0 }] = await tx.select({ n: count() }).from(savedCaseViews).where(eq(savedCaseViews.userId, userId));
    if (n >= VIEWS_PER_PERSON) throw new ViewError("limit");
    const [row] = await tx.insert(savedCaseViews).values({ userId, name, query, shared: Boolean(input.shared) }).returning({ id: savedCaseViews.id });
    await audit({ action: "case_view.create", entityType: "case_view", entityId: row!.id, after: { name, query, shared: Boolean(input.shared) } });
    return row!.id;
  });
}

export async function updateView(db: AuditExecutor, userId: string, id: string, input: { name?: string; shared?: boolean }, context: AuditContext = {}): Promise<void> {
  const name = input.name === undefined ? undefined : cleanName(input.name);
  await withAudit(db, { ...context, actorUserId: userId }, async (tx, audit) => {
    const [before] = await tx.select().from(savedCaseViews).where(and(eq(savedCaseViews.id, id), eq(savedCaseViews.userId, userId))).for("update");
    if (!before) throw new ViewError("not_found");
    const set = { ...(name !== undefined ? { name } : {}), ...(input.shared !== undefined ? { shared: input.shared } : {}) };
    if (Object.keys(set).length === 0 || ((set.name ?? before.name) === before.name && (set.shared ?? before.shared) === before.shared)) return;
    await tx.update(savedCaseViews).set(set).where(eq(savedCaseViews.id, id));
    await audit({ action: "case_view.update", entityType: "case_view", entityId: id, before: { name: before.name, shared: before.shared }, after: { name: set.name ?? before.name, shared: set.shared ?? before.shared } });
  });
}

export async function deleteView(db: AuditExecutor, userId: string, id: string, context: AuditContext = {}): Promise<void> {
  await withAudit(db, { ...context, actorUserId: userId }, async (tx, audit) => {
    const rows = await tx.delete(savedCaseViews).where(and(eq(savedCaseViews.id, id), eq(savedCaseViews.userId, userId))).returning({ name: savedCaseViews.name });
    if (rows.length === 0) throw new ViewError("not_found");
    await audit({ action: "case_view.delete", entityType: "case_view", entityId: id, before: { name: rows[0]!.name } });
  });
}
