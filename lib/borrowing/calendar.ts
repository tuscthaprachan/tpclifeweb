/**
 * Data for the availability calendar, public and staff. One item's month is a
 * row per Bangkok day with the units free all day, the units held, and the
 * reasons a day cannot be booked (desk closed, already past, inside the
 * category's notice). Holds are loaded once for the whole range and swept per
 * day with the pure functions in availability.ts. The figures come from
 * bookings, so the pages call them a guide, never live.
 */

import { and, asc, eq, inArray, lt } from "drizzle-orm";
import type { AuditExecutor } from "@/lib/db/audit";
import { borrowingLines, borrowingRequests, equipmentCategories, equipmentItems, type EquipmentCategoryRow, type EquipmentItemRow } from "@/lib/db/schema/borrowing";
import { cases } from "@/lib/db/schema/cases";
import { availableOnDay, lendable, listInventory, loadHolds, peakHeld, type Hold } from "./availability";
import { HOLDING_STATUSES } from "./constants";
import { earliestFor } from "./rules";
import { DAY_MS, dayKeyOf, dayStart, daysOfMonth, isDeskDay, weekdayOf } from "./time";

export interface DayBooking {
  caseId: string;
  reference: string;
  status: string;
  quantity: number;
  collectAt: Date;
  returnDueAt: Date;
}

export interface CalendarDay {
  dayKey: string;
  /** 0 = Sunday ... 6 = Saturday. */
  weekday: number;
  deskOpen: boolean;
  /** Units free for the whole day. */
  free: number;
  /** Most units held at any moment of the day. */
  held: number;
  past: boolean;
  /** Before the earliest day this item's category can be collected on. */
  tooSoon: boolean;
  /** Staff only: the bookings that touch this day. */
  bookings?: DayBooking[];
}

export interface MonthAvailability {
  item: EquipmentItemRow;
  category: EquipmentCategoryRow;
  lendable: number;
  month: string;
  today: string;
  /** The first day the category can be collected on, given its notice. */
  earliest: string;
  days: CalendarDay[];
}

export interface MonthOptions {
  /** Staff view: inactive items and categories are shown and each day lists its bookings. */
  staff?: boolean;
}

export async function monthAvailability(db: AuditExecutor, itemSlug: string, month: string, now: Date, opts: MonthOptions = {}): Promise<MonthAvailability | null> {
  const [row] = await db
    .select({ item: equipmentItems, category: equipmentCategories })
    .from(equipmentItems)
    .innerJoin(equipmentCategories, eq(equipmentCategories.id, equipmentItems.categoryId))
    .where(eq(equipmentItems.slug, itemSlug));
  if (!row) return null;
  if (!opts.staff && (!row.item.active || !row.category.active)) return null;

  const keys = daysOfMonth(month);
  const from = dayStart(keys[0]!);
  const to = new Date(dayStart(keys[keys.length - 1]!).getTime() + DAY_MS);
  const holds = await loadHolds(db, { from, to }, { itemIds: [row.item.id], now });
  const bookings = opts.staff ? await loadBookings(db, row.item.id, from, to, now) : [];

  const today = dayKeyOf(now);
  const earliest = earliestFor(row.category, now);
  const days = keys.map((dayKey): CalendarDay => {
    const start = dayStart(dayKey);
    const end = new Date(start.getTime() + DAY_MS);
    const day: CalendarDay = {
      dayKey,
      weekday: weekdayOf(dayKey),
      deskOpen: isDeskDay(dayKey),
      free: availableOnDay(row.item, holds, dayKey),
      held: peakHeld(holds, row.item.id, start, end),
      past: dayKey < today,
      tooSoon: dayKey >= today && dayKey < earliest,
    };
    if (opts.staff) day.bookings = bookings.filter((b) => b.collectAt.getTime() < end.getTime() && b.returnDueAt.getTime() > start.getTime());
    return day;
  });
  return { item: row.item, category: row.category, lendable: lendable(row.item), month, today, earliest, days };
}

/** Holding bookings of one item overlapping [from, to), with their references, soonest first. */
async function loadBookings(db: AuditExecutor, itemId: string, from: Date, to: Date, now: Date): Promise<DayBooking[]> {
  const rows = await db
    .select({
      caseId: cases.id,
      reference: cases.reference,
      status: cases.status,
      quantity: borrowingLines.quantity,
      collectAt: borrowingRequests.collectAt,
      returnDueAt: borrowingRequests.returnDueAt,
    })
    .from(borrowingLines)
    .innerJoin(borrowingRequests, eq(borrowingRequests.caseId, borrowingLines.caseId))
    .innerJoin(cases, eq(cases.id, borrowingLines.caseId))
    .where(and(eq(borrowingLines.itemId, itemId), inArray(cases.status, [...HOLDING_STATUSES]), lt(borrowingRequests.collectAt, to)))
    .orderBy(asc(borrowingRequests.collectAt));
  return rows
    .map((r) => ({ ...r, returnDueAt: r.status === "on_loan" && r.returnDueAt.getTime() < now.getTime() ? now : r.returnDueAt }))
    .filter((r) => r.returnDueAt.getTime() > from.getTime());
}

export interface DayItem {
  item: EquipmentItemRow;
  lendable: number;
  free: number;
}

export interface DayCategory {
  category: EquipmentCategoryRow;
  tooSoon: boolean;
  items: DayItem[];
}

export interface DayAvailability {
  day: string;
  today: string;
  deskOpen: boolean;
  past: boolean;
  categories: DayCategory[];
}

/** Every active item for one Bangkok day, grouped by category in display order. */
export async function dayAvailability(db: AuditExecutor, day: string, now: Date): Promise<DayAvailability> {
  const inventory = await listInventory(db, { activeOnly: true });
  const start = dayStart(day);
  const holds: Hold[] = await loadHolds(db, { from: start, to: new Date(start.getTime() + DAY_MS) }, { now });
  const today = dayKeyOf(now);
  return {
    day,
    today,
    deskOpen: isDeskDay(day),
    past: day < today,
    categories: inventory
      .filter((c) => c.items.length > 0)
      .map((c) => ({
        category: c,
        tooSoon: day >= today && day < earliestFor(c, now),
        items: c.items.map((item) => ({ item, lendable: lendable(item), free: availableOnDay(item, holds, day) })),
      })),
  };
}
