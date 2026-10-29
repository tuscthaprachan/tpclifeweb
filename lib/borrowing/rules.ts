/**
 * The booking rules a loan request must meet, as pure checks shared by the
 * public journey (to show the right error on the right page) and
 * `createLoanRequest` (which checks again before writing). Each problem is a
 * stable code; the journey maps codes to words.
 */

import type { EquipmentCategoryRow, EquipmentItemRow } from "@/lib/db/schema/borrowing";
import { MAX_ADVANCE_DAYS, MAX_LINES, MAX_LOAN_DAYS } from "./constants";
import { addDays, dayKeyOf, deskSlots, earliestCollectionDay, isDeskDay, timeOf } from "./time";

export type PeriodProblem =
  | "collect_past"
  | "collect_not_desk_day"
  | "collect_not_slot"
  | "collect_too_far"
  | "return_not_desk_day"
  | "return_not_slot"
  | "return_before_collect"
  | "loan_too_long";

/** Problems with a loan period, in the order a person should fix them. */
export function periodProblems(collectAt: Date, returnAt: Date, now: Date): PeriodProblem[] {
  const out: PeriodProblem[] = [];
  const slots = deskSlots();
  const collectDay = dayKeyOf(collectAt);
  const returnDay = dayKeyOf(returnAt);
  const today = dayKeyOf(now);
  if (collectAt.getTime() <= now.getTime()) out.push("collect_past");
  else if (collectDay > addDays(today, MAX_ADVANCE_DAYS)) out.push("collect_too_far");
  if (!isDeskDay(collectDay)) out.push("collect_not_desk_day");
  if (!slots.includes(timeOf(collectAt))) out.push("collect_not_slot");
  if (!isDeskDay(returnDay)) out.push("return_not_desk_day");
  if (!slots.includes(timeOf(returnAt))) out.push("return_not_slot");
  if (returnAt.getTime() <= collectAt.getTime()) out.push("return_before_collect");
  else if (returnDay > addDays(collectDay, MAX_LOAN_DAYS)) out.push("loan_too_long");
  return out;
}

/** The first day `category` can be collected on for a request made at `now`. */
export function earliestFor(category: Pick<EquipmentCategoryRow, "noticeWorkingDays">, now: Date): string {
  return earliestCollectionDay(now, category.noticeWorkingDays);
}

/** True when a collection on `collectAt` gives `category` enough notice. */
export function hasNotice(category: Pick<EquipmentCategoryRow, "noticeWorkingDays">, collectAt: Date, now: Date): boolean {
  return dayKeyOf(collectAt) >= earliestFor(category, now);
}

/** The shortest notice of any active category: the soonest anything can be collected. */
export function shortestNotice(categories: readonly Pick<EquipmentCategoryRow, "noticeWorkingDays" | "active">[]): number {
  const active = categories.filter((c) => c.active);
  return active.length === 0 ? 0 : Math.min(...active.map((c) => c.noticeWorkingDays));
}

export type LineProblem =
  | { code: "no_lines" }
  | { code: "too_many_lines" }
  | { code: "unknown_item"; itemId: string }
  | { code: "not_whole_number"; itemId: string }
  | { code: "short_notice"; itemId: string; categoryId: string }
  | { code: "over_item_max"; itemId: string; max: number }
  | { code: "over_category_max"; categoryId: string; max: number };

/**
 * Problems with the items asked for, apart from availability (which needs the
 * database). `items` and `categories` are the active inventory.
 */
export function lineProblems(
  lines: readonly { itemId: string; quantity: number }[],
  items: readonly EquipmentItemRow[],
  categories: readonly EquipmentCategoryRow[],
  collectAt: Date,
  now: Date,
): LineProblem[] {
  if (lines.length === 0) return [{ code: "no_lines" }];
  if (lines.length > MAX_LINES) return [{ code: "too_many_lines" }];
  const out: LineProblem[] = [];
  const itemById = new Map(items.filter((i) => i.active).map((i) => [i.id, i]));
  const catById = new Map(categories.filter((c) => c.active).map((c) => [c.id, c]));
  const perCategory = new Map<string, number>();
  for (const line of lines) {
    const item = itemById.get(line.itemId);
    const category = item ? catById.get(item.categoryId) : undefined;
    if (!item || !category) {
      out.push({ code: "unknown_item", itemId: line.itemId });
      continue;
    }
    if (!Number.isInteger(line.quantity) || line.quantity < 1) {
      out.push({ code: "not_whole_number", itemId: item.id });
      continue;
    }
    if (!hasNotice(category, collectAt, now)) out.push({ code: "short_notice", itemId: item.id, categoryId: category.id });
    if (item.maxPerRequest != null && line.quantity > item.maxPerRequest) out.push({ code: "over_item_max", itemId: item.id, max: item.maxPerRequest });
    perCategory.set(category.id, (perCategory.get(category.id) ?? 0) + line.quantity);
  }
  for (const [categoryId, total] of perCategory) {
    const max = catById.get(categoryId)?.maxPerRequest;
    if (max != null && total > max) out.push({ code: "over_category_max", categoryId, max });
  }
  return out;
}

/** Cards to leave at collection: the most any chosen category asks for. */
export function depositCardsFor(categories: readonly Pick<EquipmentCategoryRow, "depositCards">[]): number {
  return categories.reduce((max, c) => Math.max(max, c.depositCards), 0);
}
