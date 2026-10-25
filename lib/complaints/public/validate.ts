/**
 * Server-side validation for the public complaint journey. Pure functions: they
 * return the key of the shared string (lib/i18n/strings.ts) to show for each
 * field in error, never prose, so the same result serves both languages and
 * the tests need no locale. The browser's own checks are never relied on.
 *
 * Lengths count characters as a person does (code points), so Thai text is not
 * penalised by its UTF-16 length.
 */

import { CASE_PREFERRED_CONTACTS, type CasePreferredContact } from "@/lib/db/schema/cases";
import type { UiKey } from "@/lib/i18n/strings";
import { COMPLAINT_LIMITS as LIMITS } from "../constants";
import { COMPLAINT_STEPS, isIdentity, STEP_FIELDS, stepsFor, type DraftValues } from "./steps";

export type FieldErrors = Partial<Record<string, UiKey>>;

const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

export function emptyValues(): DraftValues {
  return { identity: "", category: "", description: "", when: "", where: "", remedy: "", name: "", email: "", phone: "", lineId: "", preferred: "", consent: "" };
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
    case "identity":
      return { identity: clean(form.get("identity")) };
    case "category":
      return { category: clean(form.get("category")) };
    case "describe":
      return { description: clean(form.get("description"), true) };
    case "when":
      return { when: clean(form.get("when")), where: clean(form.get("where")) };
    case "remedy":
      return { remedy: clean(form.get("remedy"), true) };
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

function validateContact(v: DraftValues): FieldErrors {
  const errors: FieldErrors = {};
  // A named complaint needs a name; a pseudonymous one may give a name that only a service lead will see.
  if (v.identity === "named" && !v.name) errors.name = "cpErrName";
  else if (size(v.name) > LIMITS.name) errors.name = "cpErrNameLong";
  if (v.email && (size(v.email) > LIMITS.email || !EMAIL.test(v.email))) errors.email = "cpErrEmail";
  if (v.phone && (size(v.phone) > LIMITS.phone || !/^[0-9+()\-.\s]+$/.test(v.phone) || phoneDigits(v.phone) < 7)) errors.phone = "cpErrPhone";
  if (v.lineId && (size(v.lineId) > LIMITS.lineId || /\s/.test(v.lineId))) errors.lineId = "cpErrLine";
  const methods = contactMethods(v);
  if (methods.length === 0) errors.email = errors.email ?? "cpErrContactMethod";
  else if (methods.length > 1 && !errors.email && !errors.phone && !errors.lineId && effectivePreferred(v) === null) errors.preferred = "cpErrPreferred";
  if (v.consent !== "yes") errors.consent = "cpErrConsent";
  return errors;
}

/** Errors for one question page. `categoryKeys` are the keys of the categories offered. An empty object means the answers are good. */
export function validateStep(step: string, v: DraftValues, categoryKeys: readonly string[]): FieldErrors {
  const errors: FieldErrors = {};
  switch (step) {
    case "identity":
      if (!isIdentity(v.identity)) errors.identity = "cpErrIdentity";
      break;
    case "category":
      if (!categoryKeys.includes(v.category)) errors.category = "cpErrCategory";
      break;
    case "describe":
      if (!v.description) errors.description = "cpErrDescription";
      else if (size(v.description) > LIMITS.description) errors.description = "cpErrDescriptionLong";
      break;
    case "when":
      if (size(v.when) > LIMITS.when) errors.when = "cpErrWhenLong";
      if (size(v.where) > LIMITS.where) errors.where = "cpErrWhereLong";
      break;
    case "remedy":
      if (size(v.remedy) > LIMITS.remedy) errors.remedy = "cpErrRemedyLong";
      break;
    case "contact":
      Object.assign(errors, validateContact(v));
      break;
  }
  return errors;
}

/** The first question page with a problem, with its errors, or null when every answer is good. */
export function firstProblem(v: DraftValues, categoryKeys: readonly string[]): { step: string; errors: FieldErrors } | null {
  for (const step of COMPLAINT_STEPS) {
    if (!(step in STEP_FIELDS)) continue;
    if (step === "contact" && !stepsFor(v.identity).includes("contact")) continue;
    const errors = validateStep(step, v, categoryKeys);
    if (Object.keys(errors).length > 0) return { step, errors };
  }
  return null;
}
