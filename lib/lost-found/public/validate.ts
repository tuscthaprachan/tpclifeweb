/**
 * Server-side validation for the public journeys. Pure functions: they return
 * the key of the shared string (lib/i18n/strings.ts) to show for each field in
 * error, never prose, so the same result serves both languages and the tests
 * need no locale. The browser's own checks are never relied on.
 *
 * Lengths count characters as a person does (code points), so Thai text is
 * not penalised by its UTF-16 length.
 */

import { LOST_FOUND_CATEGORIES } from "@/components/domain/lostfound/categoryLabel";
import { bangkokDateKey } from "@/lib/i18n/format";
import type { UiKey } from "@/lib/i18n/strings";
import { CASE_PREFERRED_CONTACTS, type CasePreferredContact } from "@/lib/db/schema/cases";
import { STEP_FIELDS, STEPS, WHERE_NOW_VALUES, type DraftValues, type JourneyKind } from "./steps";

export type FieldErrors = Partial<Record<string, UiKey>>;

export const LIMITS = { title: 80, description: 600, locationNote: 200, detail: 500, proof: 1000, name: 100, email: 254, phone: 20, lineId: 40 } as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

export function emptyValues(): DraftValues {
  return {
    category: "",
    title: "",
    description: "",
    placeId: "",
    locationNote: "",
    day: "",
    month: "",
    year: "",
    detail: "",
    whereNow: "",
    proof: "",
    name: "",
    email: "",
    phone: "",
    lineId: "",
    preferred: "",
    consent: "",
  };
}

function size(text: string): number {
  return [...text].length;
}

/** Collapses runs of spaces and removes control characters, keeping line breaks in long answers. */
function clean(value: FormDataEntryValue | null | undefined, multiline = false): string {
  const text = typeof value === "string" ? value : "";
  const noControls = text.replace(multiline ? /[\u0000-\u0009\u000B\u000C\u000E-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g, " ");
  const normalised = multiline ? noControls.replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ") : noControls.replace(/\s+/g, " ");
  return normalised.trim();
}

/** Reads the fields one question page owns from a submitted form into draft values. */
export function readStepValues(step: string, form: FormData): Partial<DraftValues> {
  switch (step) {
    case "category":
      return { category: clean(form.get("category")) };
    case "describe":
      return { title: clean(form.get("title")), description: clean(form.get("description"), true) };
    case "where":
      return { placeId: clean(form.get("placeId")), locationNote: clean(form.get("locationNote")) };
    case "when":
      return { day: clean(form.get("when-day")), month: clean(form.get("when-month")), year: clean(form.get("when-year")) };
    case "detail":
      return { detail: clean(form.get("detail"), true) };
    case "now":
      return { whereNow: clean(form.get("whereNow")) };
    case "proof":
      return { proof: clean(form.get("proof"), true) };
    case "contact":
      return {
        name: clean(form.get("name")),
        email: clean(form.get("email")),
        phone: clean(form.get("phone")),
        lineId: clean(form.get("lineId")),
        preferred: clean(form.get("preferred")),
        consent: form.get("consent") === "yes" ? "yes" : "",
      };
    default:
      return {};
  }
}

/**
 * A real, non-future date as "YYYY-MM-DD", or null. Thai readers often write
 * the Buddhist year, so a year above 2400 is read as BE and converted.
 */
export function parseDate(day: string, month: string, year: string, now: Date = new Date()): string | null {
  if (!/^\d{1,2}$/.test(day) || !/^\d{1,2}$/.test(month) || !/^\d{4}$/.test(year)) return null;
  const d = Number(day);
  const m = Number(month);
  let y = Number(year);
  if (y > 2400) y -= 543;
  if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const iso = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const check = new Date(`${iso}T00:00:00Z`);
  // Rejects a date that does not survive round-tripping, such as 31 April, which Date would roll over into May.
  if (check.getUTCFullYear() !== y || check.getUTCMonth() + 1 !== m || check.getUTCDate() !== d) return null;
  if (iso > bangkokDateKey(now)) return null;
  return iso;
}

/** Digits in a phone number, ignoring spacing and punctuation. */
function phoneDigits(phone: string): number {
  return phone.replace(/\D/g, "").length;
}

/** Which ways of contact were given, in a stable order. */
export function contactMethods(v: Pick<DraftValues, "email" | "phone" | "lineId">): CasePreferredContact[] {
  const methods: CasePreferredContact[] = [];
  if (v.email) methods.push("email");
  if (v.phone) methods.push("phone");
  if (v.lineId) methods.push("line");
  return methods;
}

/** The preferred method to store: the only one given, or the person's choice among several. */
export function effectivePreferred(v: Pick<DraftValues, "email" | "phone" | "lineId" | "preferred">): CasePreferredContact | null {
  const methods = contactMethods(v);
  if (methods.length === 1) return methods[0]!;
  return (CASE_PREFERRED_CONTACTS as readonly string[]).includes(v.preferred) && methods.includes(v.preferred as CasePreferredContact) ? (v.preferred as CasePreferredContact) : null;
}

function validateContact(kind: JourneyKind, v: DraftValues): FieldErrors {
  const errors: FieldErrors = {};
  const anyGiven = Boolean(v.name || v.email || v.phone || v.lineId);
  // A finder may give no details at all, unless they asked staff to contact them.
  const optional = kind === "found" && v.whereNow !== "need_help";
  if (optional && !anyGiven) return errors;

  if (!v.name) errors.name = "lfpErrName";
  else if (size(v.name) > LIMITS.name) errors.name = "lfpErrNameLong";
  if (v.email && (size(v.email) > LIMITS.email || !EMAIL.test(v.email))) errors.email = "lfpErrEmail";
  if (v.phone && (size(v.phone) > LIMITS.phone || !/^[0-9+()\-.\s]+$/.test(v.phone) || phoneDigits(v.phone) < 7)) errors.phone = "lfpErrPhone";
  if (v.lineId && (size(v.lineId) > LIMITS.lineId || /\s/.test(v.lineId))) errors.lineId = "lfpErrLine";
  const methods = contactMethods(v);
  if (methods.length === 0) errors.email = errors.email ?? "lfpErrContactMethod";
  else if (methods.length > 1 && !errors.email && !errors.phone && !errors.lineId && effectivePreferred(v) === null) errors.preferred = "lfpErrPreferred";
  if (v.consent !== "yes") errors.consent = "lfpErrConsent";
  return errors;
}

/** Errors for one question page. An empty object means the answers are good. */
export function validateStep(kind: JourneyKind, step: string, v: DraftValues, now: Date = new Date()): FieldErrors {
  const errors: FieldErrors = {};
  switch (step) {
    case "category":
      if (!(LOST_FOUND_CATEGORIES as readonly string[]).includes(v.category)) errors.category = "lfpErrCategory";
      break;
    case "describe":
      if (!v.title) errors.title = "lfpErrTitle";
      else if (size(v.title) > LIMITS.title) errors.title = "lfpErrTitleLong";
      if (!v.description) errors.description = "lfpErrDescription";
      else if (size(v.description) > LIMITS.description) errors.description = "lfpErrDescriptionLong";
      break;
    case "where":
      if (v.placeId && !UUID.test(v.placeId)) errors.placeId = "lfpErrPlace";
      else if (!v.placeId && !v.locationNote) errors.placeId = "lfpErrWhere";
      if (size(v.locationNote) > LIMITS.locationNote) errors.locationNote = "lfpErrWhereLong";
      break;
    case "when":
      if (!parseDate(v.day, v.month, v.year, now)) errors.when = "errorInvalidDate";
      break;
    case "detail":
      if (!v.detail) errors.detail = "lfpErrDetail";
      else if (size(v.detail) > LIMITS.detail) errors.detail = "lfpErrDetailLong";
      break;
    case "now":
      if (!(WHERE_NOW_VALUES as readonly string[]).includes(v.whereNow)) errors.whereNow = "lfpErrWhereNow";
      break;
    case "proof":
      if (!v.proof) errors.proof = "lfpErrProof";
      else if (size(v.proof) > LIMITS.proof) errors.proof = "lfpErrProofLong";
      break;
    case "contact":
      Object.assign(errors, validateContact(kind, v));
      break;
  }
  return errors;
}

/** The first question page with a problem, with its errors, or null when every answer is good. */
export function firstProblem(kind: JourneyKind, v: DraftValues, now: Date = new Date()): { step: string; errors: FieldErrors } | null {
  for (const step of STEPS[kind]) {
    if (!(step in STEP_FIELDS)) continue;
    const errors = validateStep(kind, step, v, now);
    if (Object.keys(errors).length > 0) return { step, errors };
  }
  return null;
}
