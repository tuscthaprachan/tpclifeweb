import { and, asc, count, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { withAudit, type AuditContext, type AuditExecutor } from "@/lib/db/audit";
import { redirects, type RedirectRow } from "@/lib/db/schema";
import { LOCALES } from "@/lib/i18n/config";
import { buildRedirectMap, type RedirectMap } from "./map";
import { validateRedirect, type RedirectField, type RedirectInput, type RedirectProblem } from "./validate";

export class RedirectInvalidError extends Error {
  constructor(readonly errors: Partial<Record<RedirectField, RedirectProblem>>) {
    super("Redirect is not valid");
    this.name = "RedirectInvalidError";
  }
}

/** Another redirect already starts at that path. */
export class RedirectExistsError extends Error {
  constructor() {
    super("A redirect from that path already exists");
    this.name = "RedirectExistsError";
  }
}

export class RedirectNotFoundError extends Error {
  constructor() {
    super("Redirect not found");
    this.name = "RedirectNotFoundError";
  }
}

export interface RedirectActor {
  userId: string;
  context: AuditContext;
}

const isUniqueViolation = (error: unknown): boolean => {
  for (let e = error as { code?: string; cause?: unknown } | undefined, i = 0; e && i < 4; e = e.cause as typeof e, i++) {
    if (e.code === "23505") return true;
  }
  return false;
};

export interface RedirectList {
  rows: RedirectRow[];
  total: number;
}

/** Newest first. `search` matches either path. */
export async function listRedirects(db: AuditExecutor, options: { search?: string; page?: number; pageSize?: number } = {}): Promise<RedirectList> {
  const { search, page = 1, pageSize = 25 } = options;
  const term = search?.trim();
  const escaped = term?.replace(/[\\%_]/g, (c) => `\\${c}`);
  const where = escaped ? or(ilike(redirects.fromPath, `%${escaped}%`), ilike(redirects.toPath, `%${escaped}%`)) : undefined;
  const rows = await db
    .select()
    .from(redirects)
    .where(where)
    .orderBy(desc(redirects.createdAt), asc(redirects.fromPath))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  const [{ total } = { total: 0 }] = await db.select({ total: count() }).from(redirects).where(where);
  return { rows, total };
}

export async function getRedirect(db: AuditExecutor, id: string): Promise<RedirectRow | undefined> {
  const [row] = await db.select().from(redirects).where(eq(redirects.id, id)).limit(1);
  return row;
}

async function others(db: AuditExecutor, exceptId?: string) {
  return db
    .select({ fromPath: redirects.fromPath, toPath: redirects.toPath })
    .from(redirects)
    .where(exceptId ? ne(redirects.id, exceptId) : undefined);
}

/** Creates a redirect, or edits the one with `id`. Throws `RedirectInvalidError`, `RedirectExistsError` or `RedirectNotFoundError`. */
export async function saveRedirect(
  db: AuditExecutor,
  actor: RedirectActor,
  input: RedirectInput & { id?: string },
): Promise<RedirectRow> {
  const checked = validateRedirect(input, await others(db, input.id));
  if (!checked.ok) throw new RedirectInvalidError(checked.errors);
  const { from, to, status } = checked.value;
  try {
    return await withAudit(db, actor.context, async (tx, audit) => {
      if (input.id) {
        const before = await getRedirect(tx, input.id);
        if (!before) throw new RedirectNotFoundError();
        const [row] = await tx.update(redirects).set({ fromPath: from, toPath: to, status }).where(eq(redirects.id, input.id)).returning();
        await audit({ action: "redirect.update", entityType: "redirects", entityId: row!.id, before, after: row });
        return row!;
      }
      const [row] = await tx.insert(redirects).values({ fromPath: from, toPath: to, status, createdBy: actor.userId }).returning();
      await audit({ action: "redirect.create", entityType: "redirects", entityId: row!.id, after: row });
      return row!;
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new RedirectExistsError();
    throw error;
  }
}

export async function deleteRedirect(db: AuditExecutor, actor: RedirectActor, id: string): Promise<void> {
  await withAudit(db, actor.context, async (tx, audit) => {
    const [row] = await tx.delete(redirects).where(eq(redirects.id, id)).returning();
    if (!row) throw new RedirectNotFoundError();
    await audit({ action: "redirect.delete", entityType: "redirects", entityId: id, before: row });
  });
}

/** The flattened lookup the proxy reads. */
export async function loadRedirectMap(db: AuditExecutor): Promise<RedirectMap> {
  const rows = await db.select({ fromPath: redirects.fromPath, toPath: redirects.toPath, status: redirects.status }).from(redirects);
  return buildRedirectMap(rows);
}

/** Adds `count` to each path's hit counter and stamps the time. Unknown paths are ignored. */
export async function recordRedirectHits(db: AuditExecutor, hits: Record<string, number>, now: Date = new Date()): Promise<number> {
  let touched = 0;
  for (const [path, n] of Object.entries(hits)) {
    if (!Number.isInteger(n) || n <= 0) continue;
    const result = await db
      .update(redirects)
      .set({ hits: sql`${redirects.hits} + ${n}`, lastHitAt: now })
      .where(eq(redirects.fromPath, path))
      .returning({ id: redirects.id });
    touched += result.length;
  }
  return touched;
}

/**
 * Called inside the save transaction when a published item's slug changes.
 * Redirects the old public path to the new one in every language, repoints
 * redirects that ended at the old path so nothing chains, and removes a
 * redirect that started at the new path (the slug is being reused). Returns
 * the rows written, or an empty list when there was nothing to do.
 */
export async function addSlugRedirects(
  tx: AuditExecutor,
  input: { base: string; oldSlug: string; newSlug: string; createdBy?: string | null },
): Promise<RedirectRow[]> {
  const { base, oldSlug, newSlug, createdBy } = input;
  if (!oldSlug || !newSlug || oldSlug === newSlug) return [];
  const written: RedirectRow[] = [];
  for (const locale of LOCALES) {
    const from = `/${locale}${base}/${oldSlug}`;
    const to = `/${locale}${base}/${newSlug}`;
    await tx.delete(redirects).where(eq(redirects.fromPath, to));
    await tx.update(redirects).set({ toPath: to }).where(and(eq(redirects.toPath, from), ne(redirects.fromPath, to)));
    const [row] = await tx
      .insert(redirects)
      .values({ fromPath: from, toPath: to, status: 301, createdBy: createdBy ?? null })
      .onConflictDoUpdate({ target: redirects.fromPath, set: { toPath: to, status: 301 } })
      .returning();
    written.push(row!);
  }
  return written;
}
