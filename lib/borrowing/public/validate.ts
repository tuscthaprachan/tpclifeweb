/**
 * Server-side validation for the public borrowing journey. Pure functions: the
 * database reads they depend on (the inventory and the holds over the period)
 * come in as a `ValidationContext`, so they are tested without a database and
 * the same code runs page by page and again at the end.
 *
 * Each problem is a shared string key (lib/i18n/strings.ts) plus the values
 * its sentence needs, never prose, so one result serves both languages. The
 * rules themselves live in lib/borrowing/rules.ts; this file only decides
 * which field each problem belongs to and how it is worded.
 *
 * Lengths count characters as a person does (code points), so Thai text is not
 * penalised by its UTF-16 length.
 */

import { availableOver, type Hold, type InventoryCategory } from "../availability";
import { MAX_ADVANCE_DAYS, MAX_LINES, MAX_LOAN_DAYS } from "../constants";
import { hasNotice, lineProblems, periodProblems, shortestNotice, type PeriodProblem } from "../rules";
import { bangkokInstant, dayKeyOf, deskSlots, earliestCollectionDay, isDayKey } from "../time";
import type { LocaleString } from "@/lib/i18n/config";
import type { UiKey } from "@/lib/i18n/strings";
import { QUESTION_STEPS, quantityField, type DraftValues } from "./steps";

export type ErrorVars = Record<string, string | number | LocaleString>;
export interface FieldError {
  key: UiKey;
  vars?: ErrorVars;
}
export type FieldErrors = Record<string, FieldError>;

const fail = (key: UiKey, vars?: ErrorVars): FieldError => (vars ? { key, vars } : { key });

/** What validation needs from the database, loaded once per request. */
export interface ValidationContext {
  now: Date;
  /** Active categories with their active items. */
  inventory: InventoryCategory[];
  /** Holds overlapping the chosen period, for every item. */
  holds: Hold[];
  /** Ids of the faculties on offer. */
  faculties: readonly string[];
}

export const LIMITS = { eventName: 200, venue: 200, purpose: 500, groupName: 200, name: 100, affiliation: 200, email: 254 } as const;

const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

export function emptyValues(): DraftValues {
  return {
    collectDay: "",
    collectMonth: "",
    collectYear: "",
    collectTime: "",
    returnDay: "",
    returnMonth: "",
    returnYear: "",
    returnTime: "",
    items: [],
    quantities: {},
    eventName: "",
    venue: "",
    purpose: "",
    borrower: "",
    groupName: "",
    student: "",
    name: "",
    studentId: "",
    faculty: "",
    affiliation: "",
    phone: "",
    email: "",
    terms: "",
  };
}

const size = (text: string) => [...text].length;

/** Collapses runs of spaces and removes control characters, keeping line breaks in long answers. */
function clean(value: FormDataEntryValue | null | undefined, multiline = false): string {
  const text = typeof value === "string" ? value : "";
  const noControls = text.replace(multiline ? /[\u0000-\u0009\u000B\u000C\u000E-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g, " ");
  const normalised = multiline ? noControls.replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ") : noControls.replace(/\s+/g, " ");
  return normalised.trim();
}

/** Reads the fields one question page owns from a submitted form into draft values. `current` is the draft so far. */
export function readStepValues(step: string, form: FormData, current: DraftValues): Partial<DraftValues> {
  switch (step) {
    case "dates":
      return {
        collectDay: clean(form.get("collect-day")),
        collectMonth: clean(form.get("collect-month")),
        collectYear: clean(form.get("collect-year")),
        collectTime: clean(form.get("collectTime")),
        returnDay: clean(form.get("return-day")),
        returnMonth: clean(form.get("return-month")),
        returnYear: clean(form.get("return-year")),
        returnTime: clean(form.get("returnTime")),
      };
    case "items": {
      const ids = form.getAll("items").flatMap((v) => (typeof v === "string" && v.length <= 40 ? [v] : []));
      const items = [...new Set(ids)];
      return { items, quantities: Object.fromEntries(Object.entries(current.quantities).filter(([id]) => items.includes(id))) };
    }
    case "quantities":
      return { quantities: Object.fromEntries(current.items.map((id) => [id, clean(form.get(quantityField(id)))])) };
    case "event":
      return { eventName: clean(form.get("eventName")), venue: clean(form.get("venue")), purpose: clean(form.get("purpose"), true) };
    case "group": {
      const borrower = clean(form.get("borrower"));
      return { borrower, groupName: borrower === "group" ? clean(form.get("groupName")) : "" };
    }
    case "student":
      return { student: clean(form.get("student")) };
    case "details":
      return {
        name: clean(form.get("name")),
        studentId: clean(form.get("studentId")).replace(/\s+/g, ""),
        faculty: clean(form.get("faculty")),
        affiliation: clean(form.get("affiliation")),
      };
    case "contact":
      return { phone: clean(form.get("phone")), email: clean(form.get("email")) };
    case "terms":
      return { terms: form.get("terms") === "yes" ? "yes" : "" };
    default:
      return {};
  }
}

/** The digits of a Thai mobile number typed with spaces or dashes, or null when it is not one: ten digits starting 0. */
export function normalisePhone(raw: string): string | null {
  if (!/^[0-9 \-]+$/.test(raw)) return null;
  const digits = raw.replace(/[ -]/g, "");
  return /^0\d{9}$/.test(digits) ? digits : null;
}

type DateParts = { day: string; month: string; year: string };
type ParsedDay = { ok: true; key: string } | { ok: false; reason: "missing" | "incomplete" | "invalid" };

/** A day from three typed parts. A Buddhist Era year (2500 and over) is read as the Common Era year. */
export function parseDay({ day, month, year }: DateParts): ParsedDay {
  if (!day && !month && !year) return { ok: false, reason: "missing" };
  if (!day || !month || !year) return { ok: false, reason: "incomplete" };
  if (!/^\d{1,2}$/.test(day) || !/^\d{1,2}$/.test(month) || !/^\d{4}$/.test(year)) return { ok: false, reason: "invalid" };
  const y = Number(year) >= 2500 ? Number(year) - 543 : Number(year);
  const key = `${String(y).padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  return isDayKey(key) ? { ok: true, key } : { ok: false, reason: "invalid" };
}

export interface Period {
  collectAt: Date;
  returnAt: Date;
}

/** The loan period the dates page holds, or null while any part is missing or malformed. */
export function periodOf(v: DraftValues): Period | null {
  const collect = parseDay({ day: v.collectDay, month: v.collectMonth, year: v.collectYear });
  const back = parseDay({ day: v.returnDay, month: v.returnMonth, year: v.returnYear });
  if (!collect.ok || !back.ok) return null;
  const collectAt = bangkokInstant(collect.key, v.collectTime);
  const returnAt = bangkokInstant(back.key, v.returnTime);
  return collectAt && returnAt ? { collectAt, returnAt } : null;
}

const DATE_ERROR = {
  collect: { missing: "brErrCollectMissing", incomplete: "brErrCollectIncomplete", invalid: "brErrCollectInvalid" },
  return: { missing: "brErrReturnMissing", incomplete: "brErrReturnIncomplete", invalid: "brErrReturnInvalid" },
} as const satisfies Record<string, Record<string, UiKey>>;

const PERIOD_FIELD: Record<PeriodProblem, { field: string; error: FieldError }> = {
  collect_past: { field: "collect", error: fail("brErrCollectPast") },
  collect_too_far: { field: "collect", error: fail("brErrCollectTooFar", { n: MAX_ADVANCE_DAYS }) },
  collect_not_desk_day: { field: "collect", error: fail("brErrCollectDeskDay") },
  collect_not_slot: { field: "collectTime", error: fail("brErrCollectTime") },
  return_not_desk_day: { field: "return", error: fail("brErrReturnDeskDay") },
  return_not_slot: { field: "returnTime", error: fail("brErrReturnTime") },
  return_before_collect: { field: "return", error: fail("brErrReturnBefore") },
  loan_too_long: { field: "return", error: fail("brErrLoanTooLong", { n: MAX_LOAN_DAYS }) },
};

function validateDates(v: DraftValues, ctx: ValidationContext): FieldErrors {
  const errors: FieldErrors = {};
  const slots = deskSlots();
  const collect = parseDay({ day: v.collectDay, month: v.collectMonth, year: v.collectYear });
  const back = parseDay({ day: v.returnDay, month: v.returnMonth, year: v.returnYear });
  if (!collect.ok) errors.collect = fail(DATE_ERROR.collect[collect.reason]);
  if (!back.ok) errors.return = fail(DATE_ERROR.return[back.reason]);
  if (!slots.includes(v.collectTime)) errors.collectTime = fail("brErrCollectTime");
  if (!slots.includes(v.returnTime)) errors.returnTime = fail("brErrReturnTime");
  const period = periodOf(v);
  if (!period) return errors;

  for (const problem of periodProblems(period.collectAt, period.returnAt, ctx.now)) {
    const { field, error } = PERIOD_FIELD[problem];
    errors[field] ??= error;
  }
  const notice = shortestNotice(ctx.inventory);
  const earliest = earliestCollectionDay(ctx.now, notice);
  if (!errors.collect && dayKeyOf(period.collectAt) < earliest) errors.collect = fail("brErrCollectNotice", { date: earliest, n: notice });
  return errors;
}

/** Units of an item free for the whole period. */
export function freeFor(item: InventoryCategory["items"][number], ctx: ValidationContext, period: Period): number {
  return availableOver(item, ctx.holds, period.collectAt, period.returnAt);
}

const itemName = (item: { nameTh: string; nameEn: string }): LocaleString => ({ th: item.nameTh, en: item.nameEn });

function validateItems(v: DraftValues, ctx: ValidationContext): FieldErrors {
  const period = periodOf(v);
  if (!period) return {};
  if (v.items.length === 0) return { items: fail("brErrItemsNone") };
  if (v.items.length > MAX_LINES) return { items: fail("brErrItemsTooMany", { n: MAX_LINES }) };
  const category = new Map(ctx.inventory.flatMap((c) => c.items.map((i) => [i.id, c] as const)));
  const item = new Map(ctx.inventory.flatMap((c) => c.items.map((i) => [i.id, i] as const)));
  const gone = v.items.some((id) => {
    const it = item.get(id);
    const cat = category.get(id);
    return !it || !cat || !hasNotice(cat, period.collectAt, ctx.now) || freeFor(it, ctx, period) < 1;
  });
  return gone ? { items: fail("brErrItemsGone") } : {};
}

function validateQuantities(v: DraftValues, ctx: ValidationContext): FieldErrors {
  const errors: FieldErrors = {};
  const period = periodOf(v);
  if (!period) return errors;
  const items = ctx.inventory.flatMap((c) => c.items);
  const lines: Array<{ itemId: string; quantity: number }> = [];
  for (const id of v.items) {
    const item = items.find((i) => i.id === id);
    if (!item) continue;
    const field = quantityField(id);
    const raw = v.quantities[id] ?? "";
    const name = itemName(item);
    if (!raw) {
      errors[field] = fail("brErrQtyMissing", { item: name });
      continue;
    }
    const quantity = /^\d{1,6}$/.test(raw) ? Number(raw) : 0;
    if (quantity < 1) {
      errors[field] = fail("brErrQtyWhole", { item: name });
      continue;
    }
    const free = freeFor(item, ctx, period);
    if (quantity > free) {
      errors[field] = fail("brErrQtyOverFree", { item: name, max: free });
      continue;
    }
    lines.push({ itemId: id, quantity });
  }
  for (const problem of lineProblems(lines, items, ctx.inventory, period.collectAt, ctx.now)) {
    if (problem.code === "over_item_max") {
      const item = items.find((i) => i.id === problem.itemId)!;
      errors[quantityField(problem.itemId)] ??= fail("brErrQtyOverItem", { item: itemName(item), max: problem.max });
    } else if (problem.code === "over_category_max") {
      const category = ctx.inventory.find((c) => c.id === problem.categoryId)!;
      const first = lines.find((l) => category.items.some((i) => i.id === l.itemId));
      if (first) errors[quantityField(first.itemId)] ??= fail("brErrQtyOverCategory", { category: { th: category.nameTh, en: category.nameEn }, max: problem.max });
    }
  }
  return errors;
}

/** Errors for one question page. An empty object means the answers are good. */
export function validateStep(step: string, v: DraftValues, ctx: ValidationContext): FieldErrors {
  const errors: FieldErrors = {};
  switch (step) {
    case "dates":
      return validateDates(v, ctx);
    case "items":
      return validateItems(v, ctx);
    case "quantities":
      return validateQuantities(v, ctx);
    case "event":
      if (!v.eventName) errors.eventName = fail("brErrEvent");
      else if (size(v.eventName) > LIMITS.eventName) errors.eventName = fail("brErrEventLong", { n: LIMITS.eventName });
      if (!v.venue) errors.venue = fail("brErrVenue");
      else if (size(v.venue) > LIMITS.venue) errors.venue = fail("brErrVenueLong", { n: LIMITS.venue });
      if (!v.purpose) errors.purpose = fail("brErrPurpose");
      else if (size(v.purpose) > LIMITS.purpose) errors.purpose = fail("brErrPurposeLong", { n: LIMITS.purpose });
      break;
    case "group":
      if (v.borrower !== "group" && v.borrower !== "personal") errors.borrower = fail("brErrBorrower");
      else if (v.borrower === "group") {
        if (!v.groupName) errors.groupName = fail("brErrGroupName");
        else if (size(v.groupName) > LIMITS.groupName) errors.groupName = fail("brErrGroupNameLong", { n: LIMITS.groupName });
      }
      break;
    case "student":
      if (v.student !== "yes" && v.student !== "no") errors.student = fail("brErrStudent");
      break;
    case "details":
      if (!v.name) errors.name = fail("brErrName");
      else if (size(v.name) > LIMITS.name) errors.name = fail("brErrNameLong", { n: LIMITS.name });
      if (v.student === "yes") {
        if (!/^\d{10}$/.test(v.studentId)) errors.studentId = fail("brErrStudentId");
        if (!ctx.faculties.includes(v.faculty)) errors.faculty = fail("brErrFaculty");
      } else if (!v.affiliation) errors.affiliation = fail("brErrAffiliation");
      else if (size(v.affiliation) > LIMITS.affiliation) errors.affiliation = fail("brErrAffiliationLong", { n: LIMITS.affiliation });
      break;
    case "contact":
      if (!v.phone) errors.phone = fail("brErrPhoneMissing");
      else if (!normalisePhone(v.phone)) errors.phone = fail("brErrPhone");
      if (v.email && (size(v.email) > LIMITS.email || !EMAIL.test(v.email))) errors.email = fail("brErrEmail");
      break;
    case "terms":
      if (v.terms !== "yes") errors.terms = fail("brErrTerms");
      break;
  }
  return errors;
}

/** The first question page with a problem, with its errors, or null when every answer is good. */
export function firstProblem(v: DraftValues, ctx: ValidationContext): { step: string; errors: FieldErrors } | null {
  for (const step of QUESTION_STEPS) {
    const errors = validateStep(step, v, ctx);
    if (Object.keys(errors).length > 0) return { step, errors };
  }
  return null;
}

/** True when the person has already answered `step`, so a problem with it is news to them. Only the three pages that can go stale need it. */
function touched(step: string, v: DraftValues): boolean {
  if (step === "dates") return Boolean(v.collectDay || v.collectMonth || v.collectYear || v.returnDay || v.returnMonth || v.returnYear);
  if (step === "items") return v.items.length > 0;
  if (step === "quantities") return Object.values(v.quantities).some(Boolean);
  return false;
}

/**
 * Where a person who asks for `step` should be sent instead, or null when they
 * may see it. No page may be reached while a question before it is unanswered
 * or no longer holds (the dates moved and an item is no longer free). The
 * errors are returned only for a page they had answered, to show once there.
 */
export function misroute(step: string, v: DraftValues, ctx: ValidationContext): { step: string; errors: FieldErrors } | null {
  const at = QUESTION_STEPS.indexOf(step as (typeof QUESTION_STEPS)[number]);
  const before = at < 0 ? QUESTION_STEPS : QUESTION_STEPS.slice(0, at);
  for (const earlier of before) {
    const errors = validateStep(earlier, v, ctx);
    if (Object.keys(errors).length > 0) return { step: earlier, errors: touched(earlier, v) ? errors : {} };
  }
  return null;
}

/** The earliest day a collection may be on, for the hint and the items page. */
export function earliestDay(ctx: Pick<ValidationContext, "now" | "inventory">): string {
  return earliestCollectionDay(ctx.now, shortestNotice(ctx.inventory));
}
