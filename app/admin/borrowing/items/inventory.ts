import "server-only";

/**
 * Editing the equipment inventory: the categories (notice, caps, deposit, own
 * terms) and the items (names, unit, how many, how many are out of service).
 * Every change needs the equipment officer or an administrator, is checked here
 * and not only in the page, validated on the server and written with an audit
 * entry in the same transaction. Nothing is ever deleted: an item that is no
 * longer lent is switched off, so old loans keep their lines.
 */

import { eq } from "drizzle-orm";
import { hasAnyRole } from "@/lib/auth/roles";
import { assertStaff, auditContextOf } from "@/lib/cases/internal";
import type { StaffActor } from "@/lib/cases/types";
import { withAudit, type AuditExecutor } from "@/lib/db/audit";
import { equipmentCategories, equipmentItems, type EquipmentCategoryRow, type EquipmentItemRow } from "@/lib/db/schema/borrowing";

export type InventoryErrorCode = "forbidden" | "not_found" | "invalid" | "conflict";

export class InventoryError extends Error {
  constructor(
    readonly code: InventoryErrorCode,
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = "InventoryError";
  }
}

function assertEditor(actor: StaffActor): void {
  assertStaff(actor, "borrowing");
  if (!hasAnyRole(actor.roles, ["equipment_officer", "admin"])) throw new InventoryError("forbidden", "Only the equipment officer or an administrator can change the inventory.");
}

const bad = (field: string, message: string): never => {
  throw new InventoryError("invalid", message, field);
};

function text(value: string, field: string, max: number, required: boolean): string {
  const v = value.trim();
  if (required && !v) bad(field, `${field} is required.`);
  if ([...v].length > max) bad(field, `${field} is too long.`);
  return v;
}

function whole(value: number, field: string, min: number, max: number): number {
  if (!Number.isInteger(value) || value < min || value > max) bad(field, `${field} must be a whole number from ${min} to ${max}.`);
  return value;
}

/** A cap: blank (null) means no cap. */
function cap(value: number | null, field: string): number | null {
  return value === null ? null : whole(value, field, 1, 1000);
}

export interface CategoryInput {
  nameTh: string;
  nameEn: string;
  hintTh: string;
  hintEn: string;
  noticeWorkingDays: number;
  maxPerRequest: number | null;
  depositCards: number;
  termsTh: string;
  termsEn: string;
  position: number;
  active: boolean;
}

export function cleanCategory(input: CategoryInput): CategoryInput {
  return {
    nameTh: text(input.nameTh, "nameTh", 80, true),
    nameEn: text(input.nameEn, "nameEn", 80, true),
    hintTh: text(input.hintTh, "hintTh", 200, false),
    hintEn: text(input.hintEn, "hintEn", 200, false),
    noticeWorkingDays: whole(input.noticeWorkingDays, "noticeWorkingDays", 0, 30),
    maxPerRequest: cap(input.maxPerRequest, "maxPerRequest"),
    depositCards: whole(input.depositCards, "depositCards", 0, 5),
    termsTh: text(input.termsTh, "termsTh", 1500, false),
    termsEn: text(input.termsEn, "termsEn", 1500, false),
    position: whole(input.position, "position", 0, 1000),
    active: input.active,
  };
}

export async function updateCategory(db: AuditExecutor, id: string, input: CategoryInput, actor: StaffActor, opts: { now?: Date } = {}): Promise<void> {
  assertEditor(actor);
  const clean = cleanCategory(input);
  await withAudit(db, auditContextOf(actor), async (tx, audit) => {
    const [before] = await tx.select().from(equipmentCategories).where(eq(equipmentCategories.id, id)).for("update");
    if (!before) throw new InventoryError("not_found", "Category not found.");
    await tx.update(equipmentCategories).set({ ...clean, updatedAt: opts.now ?? new Date() }).where(eq(equipmentCategories.id, id));
    await audit({ action: "borrowing.category_update", entityType: "equipment_category", entityId: id, before: pickCategory(before), after: clean });
  });
}

const pickCategory = (c: EquipmentCategoryRow): CategoryInput => ({
  nameTh: c.nameTh,
  nameEn: c.nameEn,
  hintTh: c.hintTh,
  hintEn: c.hintEn,
  noticeWorkingDays: c.noticeWorkingDays,
  maxPerRequest: c.maxPerRequest,
  depositCards: c.depositCards,
  termsTh: c.termsTh,
  termsEn: c.termsEn,
  position: c.position,
  active: c.active,
});

export interface ItemInput {
  categoryId: string;
  nameTh: string;
  nameEn: string;
  hintTh: string;
  hintEn: string;
  unitTh: string;
  unitEn: string;
  totalQuantity: number;
  outOfService: number;
  maxPerRequest: number | null;
  position: number;
  active: boolean;
}

export function cleanItem(input: ItemInput): ItemInput {
  const totalQuantity = whole(input.totalQuantity, "totalQuantity", 0, 10000);
  const outOfService = whole(input.outOfService, "outOfService", 0, 10000);
  if (outOfService > totalQuantity) bad("outOfService", "Out of service cannot be more than the total.");
  return {
    categoryId: input.categoryId,
    nameTh: text(input.nameTh, "nameTh", 120, true),
    nameEn: text(input.nameEn, "nameEn", 120, true),
    hintTh: text(input.hintTh, "hintTh", 200, false),
    hintEn: text(input.hintEn, "hintEn", 200, false),
    unitTh: text(input.unitTh, "unitTh", 30, true),
    unitEn: text(input.unitEn, "unitEn", 30, true),
    totalQuantity,
    outOfService,
    maxPerRequest: cap(input.maxPerRequest, "maxPerRequest"),
    position: whole(input.position, "position", 0, 10000),
    active: input.active,
  };
}

const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;

const pickItem = (i: EquipmentItemRow): ItemInput => ({
  categoryId: i.categoryId,
  nameTh: i.nameTh,
  nameEn: i.nameEn,
  hintTh: i.hintTh,
  hintEn: i.hintEn,
  unitTh: i.unitTh,
  unitEn: i.unitEn,
  totalQuantity: i.totalQuantity,
  outOfService: i.outOfService,
  maxPerRequest: i.maxPerRequest,
  position: i.position,
  active: i.active,
});

export async function createItem(db: AuditExecutor, slug: string, input: ItemInput, actor: StaffActor, opts: { now?: Date } = {}): Promise<string> {
  assertEditor(actor);
  if (!SLUG.test(slug)) bad("slug", "The short name is lower case letters, digits and hyphens.");
  const clean = cleanItem(input);
  return withAudit(db, auditContextOf(actor), async (tx, audit) => {
    const [category] = await tx.select({ id: equipmentCategories.id }).from(equipmentCategories).where(eq(equipmentCategories.id, clean.categoryId));
    if (!category) bad("categoryId", "Unknown category.");
    const [taken] = await tx.select({ id: equipmentItems.id }).from(equipmentItems).where(eq(equipmentItems.slug, slug));
    if (taken) throw new InventoryError("conflict", "That short name is already used.", "slug");
    const now = opts.now ?? new Date();
    const [row] = await tx.insert(equipmentItems).values({ ...clean, slug, createdAt: now, updatedAt: now }).returning({ id: equipmentItems.id });
    await audit({ action: "borrowing.item_create", entityType: "equipment_item", entityId: row!.id, after: { slug, ...clean } });
    return row!.id;
  });
}

export async function updateItem(db: AuditExecutor, id: string, input: ItemInput, actor: StaffActor, opts: { now?: Date } = {}): Promise<void> {
  assertEditor(actor);
  const clean = cleanItem(input);
  await withAudit(db, auditContextOf(actor), async (tx, audit) => {
    const [before] = await tx.select().from(equipmentItems).where(eq(equipmentItems.id, id)).for("update");
    if (!before) throw new InventoryError("not_found", "Item not found.");
    const [category] = await tx.select({ id: equipmentCategories.id }).from(equipmentCategories).where(eq(equipmentCategories.id, clean.categoryId));
    if (!category) bad("categoryId", "Unknown category.");
    await tx.update(equipmentItems).set({ ...clean, updatedAt: opts.now ?? new Date() }).where(eq(equipmentItems.id, id));
    await audit({ action: "borrowing.item_update", entityType: "equipment_item", entityId: id, before: pickItem(before), after: clean });
  });
}
