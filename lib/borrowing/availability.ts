/**
 * How many of an item can be lent over a period. An item's lendable stock is
 * `total_quantity - out_of_service`; a booking holds its quantity from
 * `collect_at` to `return_due_at` while its case is requested, approved or on
 * loan (HOLDING_STATUSES). A request still waiting for a decision holds stock
 * too, so two people cannot both be told the last ball is free. Equipment on
 * loan past its return time is still out, so its hold runs on to `now`.
 *
 * Availability over a period is the stock minus the PEAK of overlapping holds
 * (a sweep over the hold start times), not their sum: two loans on Monday and
 * Wednesday do not stop a third person borrowing the same ball for the week if
 * there are two. Periods are half open, [start, end), so a loan returned at
 * 12:00 and one collected at 12:00 do not clash.
 *
 * The calendar shows a day as the peak over that Bangkok day. The pure
 * functions take their inputs, so they are tested without a database;
 * `assertAvailable` re-checks inside the submitting transaction with the item
 * rows locked, which is what stops two requests racing for the last unit.
 */

import { and, asc, eq, gt, inArray, lt, ne, sql } from "drizzle-orm";
import type { AuditExecutor } from "@/lib/db/audit";
import { borrowingLines, borrowingRequests, equipmentCategories, equipmentItems, type EquipmentCategoryRow, type EquipmentItemRow } from "@/lib/db/schema/borrowing";
import { cases } from "@/lib/db/schema/cases";
import { HOLDING_STATUSES } from "./constants";
import { DAY_MS, dayStart } from "./time";

export interface Hold {
  caseId: string;
  itemId: string;
  quantity: number;
  start: Date;
  end: Date;
}

export interface Stock {
  id: string;
  totalQuantity: number;
  outOfService: number;
}

export function lendable(item: Stock): number {
  return Math.max(0, item.totalQuantity - item.outOfService);
}

/** The most units of one item held at any instant in [start, end). */
export function peakHeld(holds: readonly Hold[], itemId: string, start: Date, end: Date, excludeCaseId?: string): number {
  const s = start.getTime();
  const e = end.getTime();
  const relevant = holds.filter((h) => h.itemId === itemId && h.caseId !== excludeCaseId && h.start.getTime() < e && h.end.getTime() > s);
  if (relevant.length === 0) return 0;
  const points = [s, ...relevant.map((h) => h.start.getTime()).filter((t) => t > s)];
  let peak = 0;
  for (const p of points) {
    let held = 0;
    for (const h of relevant) if (h.start.getTime() <= p && h.end.getTime() > p) held += h.quantity;
    if (held > peak) peak = held;
  }
  return peak;
}

/** Units of `item` free for the whole of [start, end). */
export function availableOver(item: Stock, holds: readonly Hold[], start: Date, end: Date, excludeCaseId?: string): number {
  return Math.max(0, lendable(item) - peakHeld(holds, item.id, start, end, excludeCaseId));
}

/** Units of `item` free for the whole Bangkok day `day`. */
export function availableOnDay(item: Stock, holds: readonly Hold[], day: string): number {
  const start = dayStart(day);
  return availableOver(item, holds, start, new Date(start.getTime() + DAY_MS));
}

/**
 * Holds overlapping [from, to), from requests whose case is in a holding
 * status. Optionally limited to some items.
 */
export async function loadHolds(db: AuditExecutor, range: { from: Date; to: Date }, opts: { itemIds?: readonly string[]; now?: Date } = {}): Promise<Hold[]> {
  const now = opts.now ?? new Date();
  const conditions = [
    inArray(cases.status, [...HOLDING_STATUSES]),
    lt(borrowingRequests.collectAt, range.to),
    // An overdue loan is still out: its hold lasts until now.
    sql`greatest(${borrowingRequests.returnDueAt}, case when ${cases.status} = 'on_loan' then ${now.toISOString()}::timestamptz else ${borrowingRequests.returnDueAt} end) > ${range.from.toISOString()}::timestamptz`,
  ];
  if (opts.itemIds) {
    if (opts.itemIds.length === 0) return [];
    conditions.push(inArray(borrowingLines.itemId, [...opts.itemIds]));
  }
  const rows = await db
    .select({
      caseId: borrowingLines.caseId,
      itemId: borrowingLines.itemId,
      quantity: borrowingLines.quantity,
      start: borrowingRequests.collectAt,
      end: borrowingRequests.returnDueAt,
      status: cases.status,
    })
    .from(borrowingLines)
    .innerJoin(borrowingRequests, eq(borrowingRequests.caseId, borrowingLines.caseId))
    .innerJoin(cases, eq(cases.id, borrowingLines.caseId))
    .where(and(...conditions));
  return rows.map((r) => ({
    caseId: r.caseId,
    itemId: r.itemId,
    quantity: r.quantity,
    start: r.start,
    end: r.status === "on_loan" && r.end.getTime() < now.getTime() ? now : r.end,
  }));
}

export interface InventoryCategory extends EquipmentCategoryRow {
  items: EquipmentItemRow[];
}

/** Categories with their items, in display order. `activeOnly` drops inactive categories and items. */
export async function listInventory(db: AuditExecutor, opts: { activeOnly?: boolean } = {}): Promise<InventoryCategory[]> {
  const [cats, items] = await Promise.all([
    db.select().from(equipmentCategories).orderBy(asc(equipmentCategories.position), asc(equipmentCategories.nameEn)),
    db.select().from(equipmentItems).orderBy(asc(equipmentItems.position), asc(equipmentItems.nameEn)),
  ]);
  return cats
    .filter((c) => !opts.activeOnly || c.active)
    .map((c) => ({ ...c, items: items.filter((i) => i.categoryId === c.id && (!opts.activeOnly || i.active)) }));
}

export interface RequestedLine {
  itemId: string;
  quantity: number;
}

export interface LineShortfall {
  itemId: string;
  requested: number;
  available: number;
}

/**
 * Every line that does not fit in [start, end), given current holds. Empty
 * means the whole request fits. Pass `excludeCaseId` when re-checking a
 * request that already holds stock (approving it, changing its quantities).
 */
export async function findShortfalls(
  db: AuditExecutor,
  lines: readonly RequestedLine[],
  start: Date,
  end: Date,
  opts: { excludeCaseId?: string; now?: Date } = {},
): Promise<LineShortfall[]> {
  if (lines.length === 0) return [];
  const ids = lines.map((l) => l.itemId);
  const [items, holds] = await Promise.all([
    db.select({ id: equipmentItems.id, totalQuantity: equipmentItems.totalQuantity, outOfService: equipmentItems.outOfService, active: equipmentItems.active }).from(equipmentItems).where(inArray(equipmentItems.id, ids)),
    loadHolds(db, { from: start, to: end }, { itemIds: ids, now: opts.now }),
  ]);
  const byId = new Map(items.map((i) => [i.id, i]));
  const out: LineShortfall[] = [];
  for (const line of lines) {
    const item = byId.get(line.itemId);
    const available = item && item.active ? availableOver(item, holds, start, end, opts.excludeCaseId) : 0;
    if (line.quantity > available) out.push({ itemId: line.itemId, requested: line.quantity, available });
  }
  return out;
}

/**
 * Locks the item rows (in id order, so two transactions never deadlock) and
 * returns the shortfalls. Call inside the transaction that writes the request
 * or the decision; refuse it if anything comes back.
 */
export async function lockAndFindShortfalls(
  tx: AuditExecutor,
  lines: readonly RequestedLine[],
  start: Date,
  end: Date,
  opts: { excludeCaseId?: string; now?: Date } = {},
): Promise<LineShortfall[]> {
  const ids = [...new Set(lines.map((l) => l.itemId))].sort();
  if (ids.length > 0) {
    await tx.select({ id: equipmentItems.id }).from(equipmentItems).where(inArray(equipmentItems.id, ids)).orderBy(asc(equipmentItems.id)).for("update");
  }
  return findShortfalls(tx, lines, start, end, opts);
}

/** Lines of other requests that overlap [start, end) on the same items, for a staff "clashes with" list. */
export async function overlappingCases(db: AuditExecutor, caseId: string, itemIds: readonly string[], start: Date, end: Date): Promise<Array<{ caseId: string; reference: string; status: string; itemId: string; quantity: number; collectAt: Date; returnDueAt: Date }>> {
  if (itemIds.length === 0) return [];
  return db
    .select({
      caseId: cases.id,
      reference: cases.reference,
      status: cases.status,
      itemId: borrowingLines.itemId,
      quantity: borrowingLines.quantity,
      collectAt: borrowingRequests.collectAt,
      returnDueAt: borrowingRequests.returnDueAt,
    })
    .from(borrowingLines)
    .innerJoin(borrowingRequests, eq(borrowingRequests.caseId, borrowingLines.caseId))
    .innerJoin(cases, eq(cases.id, borrowingLines.caseId))
    .where(
      and(
        ne(cases.id, caseId),
        inArray(cases.status, [...HOLDING_STATUSES]),
        inArray(borrowingLines.itemId, [...itemIds]),
        lt(borrowingRequests.collectAt, end),
        gt(borrowingRequests.returnDueAt, start),
      ),
    )
    .orderBy(asc(borrowingRequests.collectAt));
}
