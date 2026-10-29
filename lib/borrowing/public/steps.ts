/**
 * The pages of the public equipment borrowing journey, in order, and the form
 * fields each owns. Pure data, shared by the pages, the actions and the tests.
 *
 * Every borrower sees every question page in the same order: the period comes
 * first because what is free depends on it, and `details` only changes which
 * fields it asks (a Thammasat student gives a number and faculty, anyone else
 * an organisation). `check` shows every answer with a change link;
 * `confirmation` is the result.
 */

export const BORROW_STEPS = ["dates", "items", "quantities", "event", "group", "student", "details", "contact", "terms", "check", "confirmation"] as const;
export type BorrowStep = (typeof BORROW_STEPS)[number];

/** The pages that ask something, in order. */
export const QUESTION_STEPS = BORROW_STEPS.slice(0, BORROW_STEPS.indexOf("check")) as readonly BorrowStep[];

/** The answers collected so far. Every value is a string as typed; validation parses them. */
export interface DraftValues {
  collectDay: string;
  collectMonth: string;
  collectYear: string;
  collectTime: string;
  returnDay: string;
  returnMonth: string;
  returnYear: string;
  returnTime: string;
  /** Ids of the items chosen. */
  items: string[];
  /** Quantity typed per chosen item id. */
  quantities: Record<string, string>;
  eventName: string;
  venue: string;
  purpose: string;
  /** `group` or `personal`. */
  borrower: string;
  groupName: string;
  /** `yes` or `no`. */
  student: string;
  name: string;
  studentId: string;
  /** The id of the faculty chosen, for a student. */
  faculty: string;
  affiliation: string;
  phone: string;
  email: string;
  terms: string;
}

export function isStep(step: unknown): step is BorrowStep {
  return typeof step === "string" && (BORROW_STEPS as readonly string[]).includes(step);
}

export function nextStep(step: string): BorrowStep | null {
  const i = BORROW_STEPS.indexOf(step as BorrowStep);
  return i >= 0 ? (BORROW_STEPS[i + 1] ?? null) : null;
}

export function previousStep(step: string): BorrowStep | null {
  const i = BORROW_STEPS.indexOf(step as BorrowStep);
  return i > 0 ? (BORROW_STEPS[i - 1] ?? null) : null;
}

export const JOURNEY_BASE = "/borrow";

export function stepPath(step: string): string {
  return `${JOURNEY_BASE}/${step}`;
}

/** Field names the dates page posts. The date inputs are named `<id>-day`, `<id>-month`, `<id>-year`. */
export const DATE_FIELDS = { collect: "collect", return: "return" } as const;

/** The form field name of one item's quantity. */
export const quantityField = (itemId: string) => `qty-${itemId}`;
