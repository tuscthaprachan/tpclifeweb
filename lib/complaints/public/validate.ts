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
import { isIdentity, LECTURER_ANSWERS, LEVELS, NO_PROGRAMME, reachesCase, stepsFor, STEP_FIELDS, type DraftValues } from "./steps";

export type FieldErrors = Partial<Record<string, UiKey>>;

const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

export function emptyValues(): DraftValues {
  return { emergency: "", level: "", faculty: "", programme: "", lecturer: "", identity: "", category: "", description: "", when: "", where: "", remedy: "", name: "", email: "", phone: "", lineId: "", preferred: "", consent: "" };
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
    case "emergency":
      return { emergency: clean(form.get("emergency")) };
    case "level":
      return { level: clean(form.get("level")) };
    case "faculty":
      return { faculty: clean(form.get("faculty")) };
    case "programme":
      return { programme: clean(form.get("programme")) };
    case "lecturer":
      return { lecturer: clean(form.get("lecturer")) };
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

/** A faculty on offer: its slug, and the ids of its programme associations. */
export interface FacultyChoice {
  slug: string;
  programmeIds: readonly string[];
}

/** The faculties on offer, reduced to what validation and routing need. */
export function facultyChoices(faculties: ReadonlyArray<{ slug: string; programmes: ReadonlyArray<{ _id: string }> }>): FacultyChoice[] {
  return faculties.map((f) => ({ slug: f.slug, programmeIds: f.programmes.map((p) => p._id) }));
}

/** Whether the chosen faculty has programme associations to pick from. Without any, the programme page is skipped. */
export function hasProgrammes(faculties: readonly FacultyChoice[], slug: string): boolean {
  return (faculties.find((f) => f.slug === slug)?.programmeIds.length ?? 0) > 0;
}

const TRIAGE_STEPS: readonly string[] = ["emergency", "level", "faculty", "lecturer", "programme"];

/**
 * Where a person who asks for `step` should be sent instead, or null when they
 * may see it. A page that is not on their route goes to the end of it, and no
 * page may be reached while a question before it is unanswered.
 */
export function misroute(step: string, v: DraftValues, categoryKeys: readonly string[], faculties: readonly FacultyChoice[]): string | null {
  const steps = stepsFor(v, hasProgrammes(faculties, v.faculty));
  const at = steps.indexOf(step as (typeof steps)[number]);
  const before = at < 0 ? steps : steps.slice(0, at);
  const unanswered = before.find((s) => TRIAGE_STEPS.includes(s) && Object.keys(validateStep(s, v, categoryKeys, faculties)).length > 0);
  if (unanswered) return unanswered;
  if (at >= 0) return null;
  return reachesCase(v) ? "check" : steps[steps.length - 1]!;
}

/**
 * Errors for one question page. `categoryKeys` are the keys of the categories
 * offered, `faculties` the faculties and their programme associations on
 * offer. An empty object means the answers are good.
 */
export function validateStep(step: string, v: DraftValues, categoryKeys: readonly string[], faculties: readonly FacultyChoice[] = []): FieldErrors {
  const errors: FieldErrors = {};
  switch (step) {
    case "emergency":
      if (v.emergency !== "yes" && v.emergency !== "no") errors.emergency = "cpErrEmergency";
      break;
    case "level":
      if (!(LEVELS as readonly string[]).includes(v.level)) errors.level = "cpErrLevel";
      break;
    case "faculty":
      if (!faculties.some((f) => f.slug === v.faculty)) errors.faculty = "cpErrFaculty";
      break;
    case "programme":
      if (v.programme !== NO_PROGRAMME && !faculties.find((f) => f.slug === v.faculty)?.programmeIds.includes(v.programme)) errors.programme = "cpErrProgramme";
      break;
    case "lecturer":
      if (!(LECTURER_ANSWERS as readonly string[]).includes(v.lecturer)) errors.lecturer = "cpErrLecturer";
      break;
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

/**
 * The first page with a problem, with its errors, or null when every answer is
 * good and leads to a complaint. A route that ends in a signpost or emergency
 * help is not a complaint: it is returned as the page to go back to, with no
 * errors to show.
 */
export function firstProblem(v: DraftValues, categoryKeys: readonly string[]): { step: string; errors: FieldErrors } | null {
  for (const step of ["emergency", "level"]) {
    const errors = validateStep(step, v, categoryKeys);
    if (Object.keys(errors).length > 0) return { step, errors };
  }
  if (!reachesCase(v)) return { step: v.emergency === "yes" ? "urgent" : "signpost", errors: {} };
  for (const step of stepsFor(v)) {
    if (!(step in STEP_FIELDS) || step === "emergency" || step === "level") continue;
    const errors = validateStep(step, v, categoryKeys);
    if (Object.keys(errors).length > 0) return { step, errors };
  }
  return null;
}
