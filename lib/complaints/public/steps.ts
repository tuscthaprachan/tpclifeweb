/**
 * The pages of the public issue reporting journey, in order, and the form
 * fields each owns. Pure data, shared by the pages, the actions and the tests.
 *
 * One thing per page. Three questions come first and decide where the issue
 * belongs: `emergency` (yes ends at `urgent`), then `level`. An issue about a
 * course (`faculty`, `lecturer`) or a faculty (`faculty`, `programme`) is not
 * a complaint to the student union: it ends at `signpost`, which says who to
 * contact. Only a university level issue (or "not sure") continues to the
 * complaint questions. The contact page is skipped for an anonymous
 * complaint, which holds no contact at all. `check` shows every answer with a
 * change link; `confirmation` is the result.
 */

import type { ComplaintIdentity } from "@/lib/db/schema/complaints";

export const COMPLAINT_STEPS = ["emergency", "urgent", "level", "faculty", "lecturer", "programme", "signpost", "identity", "category", "describe", "when", "remedy", "evidence", "contact", "check", "confirmation"] as const;
export type ComplaintStep = (typeof COMPLAINT_STEPS)[number];

/** Form field names a question page submits. */
export const STEP_FIELDS: Record<string, readonly string[]> = {
  emergency: ["emergency"],
  level: ["level"],
  faculty: ["faculty"],
  lecturer: ["lecturer"],
  programme: ["programme"],
  identity: ["identity"],
  category: ["category"],
  describe: ["description"],
  when: ["when", "where"],
  remedy: ["remedy"],
  contact: ["name", "email", "phone", "lineId", "preferred", "consent"],
};

/** The answers collected so far. Every value is a string as typed; validation parses them. */
export interface DraftValues {
  emergency: string;
  level: string;
  faculty: string;
  programme: string;
  lecturer: string;
  identity: string;
  category: string;
  description: string;
  when: string;
  where: string;
  remedy: string;
  name: string;
  email: string;
  phone: string;
  lineId: string;
  preferred: string;
  consent: string;
}

export function isStep(step: unknown): step is ComplaintStep {
  return typeof step === "string" && (COMPLAINT_STEPS as readonly string[]).includes(step);
}

export const LEVELS = ["course", "faculty", "university", "unsure"] as const;
export type IssueLevel = (typeof LEVELS)[number];
export const LECTURER_ANSWERS = ["yes", "harassment", "other"] as const;
/** The programme answer for an issue that is faculty-wide, not one programme's. */
export const NO_PROGRAMME = "none";

/** The answers that decide the route. Each may be empty (not answered yet). */
export type RouteValues = Partial<Pick<DraftValues, "emergency" | "level" | "identity">>;

/** True when the answers lead to a complaint to TUSU and TUSC: no emergency, and a university level issue (or not sure). */
export function reachesCase(v: RouteValues): boolean {
  return v.emergency === "no" && (v.level === "university" || v.level === "unsure");
}

/**
 * The pages this person will see, in order. `programmes` says whether the
 * chosen faculty has programme associations to pick from; without any, the
 * programme page is skipped. Before the first questions are answered the
 * complaint pages are listed, so the order of the whole journey can be read.
 */
export function stepsFor(v: RouteValues, programmes = true): readonly ComplaintStep[] {
  if (v.emergency === "yes") return ["emergency", "urgent"];
  if (v.level === "course") return ["emergency", "level", "faculty", "lecturer", "signpost"];
  if (v.level === "faculty") return ["emergency", "level", "faculty", ...(programmes ? (["programme"] as const) : []), "signpost"];
  const complaint = COMPLAINT_STEPS.slice(COMPLAINT_STEPS.indexOf("identity"));
  return ["emergency", "level", ...(v.identity === "anonymous" ? complaint.filter((s) => s !== "contact") : complaint)];
}

export function nextStep(v: RouteValues, step: string, programmes = true): ComplaintStep | null {
  const steps = stepsFor(v, programmes);
  const i = steps.indexOf(step as ComplaintStep);
  return i >= 0 ? (steps[i + 1] ?? null) : null;
}

export function previousStep(v: RouteValues, step: string, programmes = true): ComplaintStep | null {
  const steps = stepsFor(v, programmes);
  const i = steps.indexOf(step as ComplaintStep);
  return i > 0 ? (steps[i - 1] ?? null) : null;
}

/** What to count when a person is routed to `step`: emergency help, a course or a faculty signpost. Null for any page that is not an ending. */
export function signpostLevel(step: string, v: Pick<DraftValues, "level">): "emergency" | "course" | "faculty" | null {
  if (step === "urgent") return "emergency";
  if (step === "signpost") return v.level === "course" ? "course" : "faculty";
  return null;
}

export function isIdentity(value: unknown): value is ComplaintIdentity {
  return value === "named" || value === "pseudonymous" || value === "anonymous";
}

export const JOURNEY_BASE = "/complaints";

export function stepPath(step: string): string {
  return `${JOURNEY_BASE}/${step}`;
}
