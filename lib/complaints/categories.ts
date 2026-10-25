/**
 * Complaint categories and the named staff who may see restricted ones.
 * Reading the list is open (the public journey shows the active ones); every
 * change needs the `admin` role, is checked here and not only in the page, and
 * writes an audit entry in the same transaction.
 *
 * Two changes can expose cases and so need care. Removing the restriction from
 * a category lets every complaints handler see its cases: it needs
 * `confirmUnrestrict`. Restricting a category with nobody named, or removing
 * the last named person, would leave its cases unreachable: both are refused.
 */

import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { hasRole } from "@/lib/auth/roles";
import { withAudit, type AuditExecutor } from "@/lib/db/audit";
import { user } from "@/lib/db/schema/auth";
import { cases } from "@/lib/db/schema/cases";
import { staffRoles } from "@/lib/db/schema/staff-roles";
import { complaintCases, complaintCategories, complaintCategoryAccess, type ComplaintCategoryRow } from "@/lib/db/schema/complaints";
import { auditContextOf } from "@/lib/cases/internal";
import { SERVICES } from "@/lib/cases/services";
import type { StaffActor } from "@/lib/cases/types";

export type CategoryErrorCode = "forbidden" | "not_found" | "invalid" | "conflict" | "needs_confirm" | "no_staff";

export class CategoryError extends Error {
  constructor(
    readonly code: CategoryErrorCode,
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = "CategoryError";
  }
}

export type CategoryView = ComplaintCategoryRow;

export async function listCategories(db: AuditExecutor, opts: { activeOnly?: boolean } = {}): Promise<CategoryView[]> {
  return db
    .select()
    .from(complaintCategories)
    .where(opts.activeOnly ? eq(complaintCategories.active, true) : undefined)
    .orderBy(asc(complaintCategories.position), asc(complaintCategories.nameEn));
}

export async function getCategory(db: AuditExecutor, id: string): Promise<CategoryView | null> {
  const [row] = await db.select().from(complaintCategories).where(eq(complaintCategories.id, id));
  return row ?? null;
}

export async function getCategoryByKey(db: AuditExecutor, key: string): Promise<CategoryView | null> {
  const [row] = await db.select().from(complaintCategories).where(eq(complaintCategories.key, key));
  return row ?? null;
}

export interface CategoryInput {
  nameTh: string;
  nameEn: string;
  hintTh: string;
  hintEn: string;
  acknowledgeDays: number;
  resolveDays: number;
  restricted: boolean;
  offerWellbeing: boolean;
  position: number;
  active: boolean;
}

const KEY = /^[a-z][a-z0-9-]{0,39}$/;

function assertAdmin(actor: StaffActor): void {
  if (!hasRole(actor.roles, "admin")) throw new CategoryError("forbidden", "Only an administrator can change complaint categories.");
}

/** Trims and checks the fields; throws `invalid` naming the first bad field. */
export function cleanCategory(input: CategoryInput): CategoryInput {
  const text = (value: string, field: string, max: number, required: boolean) => {
    const v = value.trim();
    if (required && !v) throw new CategoryError("invalid", `${field} is required.`, field);
    if ([...v].length > max) throw new CategoryError("invalid", `${field} is too long.`, field);
    return v;
  };
  const days = (value: number, field: string) => {
    if (!Number.isInteger(value) || value < 1 || value > 365) throw new CategoryError("invalid", `${field} must be a whole number of working days from 1 to 365.`, field);
    return value;
  };
  const acknowledgeDays = days(input.acknowledgeDays, "acknowledgeDays");
  const resolveDays = days(input.resolveDays, "resolveDays");
  if (resolveDays < acknowledgeDays) throw new CategoryError("invalid", "The resolve target cannot be shorter than the acknowledge target.", "resolveDays");
  if (!Number.isInteger(input.position) || input.position < 0 || input.position > 1000) throw new CategoryError("invalid", "Position must be from 0 to 1000.", "position");
  return {
    nameTh: text(input.nameTh, "nameTh", 80, true),
    nameEn: text(input.nameEn, "nameEn", 80, true),
    hintTh: text(input.hintTh, "hintTh", 200, false),
    hintEn: text(input.hintEn, "hintEn", 200, false),
    acknowledgeDays,
    resolveDays,
    restricted: input.restricted,
    offerWellbeing: input.offerWellbeing,
    position: input.position,
    active: input.active,
  };
}

export async function createCategory(db: AuditExecutor, key: string, input: CategoryInput, actor: StaffActor, opts: { now?: Date } = {}): Promise<string> {
  assertAdmin(actor);
  const now = opts.now ?? new Date();
  const clean = cleanCategory(input);
  if (!KEY.test(key)) throw new CategoryError("invalid", "The key is lower case letters, digits and hyphens, starting with a letter.", "key");
  if (clean.restricted) throw new CategoryError("no_staff", "Name staff for a category before restricting it.", "restricted");
  return withAudit(db, auditContextOf(actor), async (tx, audit) => {
    const [exists] = await tx.select({ id: complaintCategories.id }).from(complaintCategories).where(eq(complaintCategories.key, key));
    if (exists) throw new CategoryError("conflict", "A category with this key already exists.", "key");
    const [row] = await tx.insert(complaintCategories).values({ key, ...clean, createdAt: now, updatedAt: now }).returning({ id: complaintCategories.id });
    await audit({ action: "complaint_category.create", entityType: "complaint_category", entityId: row!.id, after: { key, ...clean } });
    return row!.id;
  });
}

export async function updateCategory(
  db: AuditExecutor,
  id: string,
  input: CategoryInput,
  actor: StaffActor,
  opts: { now?: Date; confirmUnrestrict?: boolean } = {},
): Promise<void> {
  assertAdmin(actor);
  const now = opts.now ?? new Date();
  const clean = cleanCategory(input);
  await withAudit(db, auditContextOf(actor), async (tx, audit) => {
    const [before] = await tx.select().from(complaintCategories).where(eq(complaintCategories.id, id)).for("update");
    if (!before) throw new CategoryError("not_found", "Category not found.");
    if (clean.restricted) {
      const [named] = await tx.select({ n: sql<number>`count(*)::int` }).from(complaintCategoryAccess).where(eq(complaintCategoryAccess.categoryId, id));
      if (!named || named.n === 0) throw new CategoryError("no_staff", "Name at least one member of staff before restricting this category.", "restricted");
    }
    if (before.restricted && !clean.restricted) {
      const [held] = await tx.select({ n: sql<number>`count(*)::int` }).from(complaintCases).where(eq(complaintCases.categoryId, id));
      if (held && held.n > 0 && !opts.confirmUnrestrict) {
        throw new CategoryError("needs_confirm", "Removing the restriction lets every complaints handler see the complaints already in this category.", "restricted");
      }
    }
    await tx.update(complaintCategories).set({ ...clean, updatedAt: now }).where(eq(complaintCategories.id, id));
    const changed = Object.fromEntries(Object.entries(clean).filter(([k, v]) => (before as unknown as Record<string, unknown>)[k] !== v));
    await audit({
      action: "complaint_category.update",
      entityType: "complaint_category",
      entityId: id,
      before: Object.fromEntries(Object.keys(changed).map((k) => [k, (before as unknown as Record<string, unknown>)[k]])),
      after: changed,
    });
  });
}

export interface AccessEntry {
  userId: string;
  name: string;
  email: string;
  grantedAt: Date;
}

/** The named staff for a category, by name. Admin only: the list itself is not public knowledge. */
export async function listCategoryAccess(db: AuditExecutor, categoryId: string, actor: StaffActor): Promise<AccessEntry[]> {
  assertAdmin(actor);
  return db
    .select({ userId: user.id, name: user.name, email: user.email, grantedAt: complaintCategoryAccess.createdAt })
    .from(complaintCategoryAccess)
    .innerJoin(user, eq(user.id, complaintCategoryAccess.userId))
    .where(eq(complaintCategoryAccess.categoryId, categoryId))
    .orderBy(asc(user.name));
}

/** Staff who could be named: they hold a complaints role, in either organisation. */
export async function listNameableStaff(db: AuditExecutor, actor: StaffActor): Promise<Array<{ id: string; name: string; email: string }>> {
  assertAdmin(actor);
  return db
    .selectDistinct({ id: user.id, name: user.name, email: user.email })
    .from(staffRoles)
    .innerJoin(user, eq(user.id, staffRoles.userId))
    .where(and(isNull(staffRoles.revokedAt), inArray(staffRoles.role, [...SERVICES.complaint.roles])))
    .orderBy(asc(user.name));
}

export async function grantCategoryAccess(db: AuditExecutor, categoryId: string, userId: string, actor: StaffActor, opts: { now?: Date } = {}): Promise<void> {
  assertAdmin(actor);
  const now = opts.now ?? new Date();
  await withAudit(db, auditContextOf(actor), async (tx, audit) => {
    const [category] = await tx.select({ id: complaintCategories.id }).from(complaintCategories).where(eq(complaintCategories.id, categoryId));
    if (!category) throw new CategoryError("not_found", "Category not found.");
    const holder = await tx
      .select({ id: staffRoles.id })
      .from(staffRoles)
      .where(and(eq(staffRoles.userId, userId), isNull(staffRoles.revokedAt), inArray(staffRoles.role, [...SERVICES.complaint.roles])))
      .limit(1);
    if (holder.length === 0) throw new CategoryError("invalid", "That person does not hold a complaints role.", "userId");
    const inserted = await tx
      .insert(complaintCategoryAccess)
      .values({ categoryId, userId, grantedBy: actor.userId, createdAt: now })
      .onConflictDoNothing()
      .returning({ userId: complaintCategoryAccess.userId });
    if (inserted.length > 0) await audit({ action: "complaint_category_access.grant", entityType: "complaint_category", entityId: categoryId, after: { userId } });
  });
}

export async function revokeCategoryAccess(db: AuditExecutor, categoryId: string, userId: string, actor: StaffActor): Promise<void> {
  assertAdmin(actor);
  await withAudit(db, auditContextOf(actor), async (tx, audit) => {
    const [category] = await tx.select().from(complaintCategories).where(eq(complaintCategories.id, categoryId)).for("update");
    if (!category) throw new CategoryError("not_found", "Category not found.");
    const named = await tx.select({ userId: complaintCategoryAccess.userId }).from(complaintCategoryAccess).where(eq(complaintCategoryAccess.categoryId, categoryId));
    if (!named.some((n) => n.userId === userId)) return;
    if (category.restricted && named.length <= 1) throw new CategoryError("no_staff", "A restricted category needs at least one named member of staff.");
    await tx.delete(complaintCategoryAccess).where(and(eq(complaintCategoryAccess.categoryId, categoryId), eq(complaintCategoryAccess.userId, userId)));
    if (category.restricted) {
      // A complaint assigned to someone who can no longer see it is unassigned, so it does not sit unseen in their queue.
      await tx
        .update(cases)
        .set({ assignedTo: null })
        .where(and(eq(cases.assignedTo, userId), inArray(cases.id, tx.select({ id: complaintCases.caseId }).from(complaintCases).where(eq(complaintCases.categoryId, categoryId)))));
    }
    await audit({ action: "complaint_category_access.revoke", entityType: "complaint_category", entityId: categoryId, before: { userId } });
  });
}
