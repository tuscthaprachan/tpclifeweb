/**
 * The question pages of the public complaint journey, in order, and the form
 * fields each owns. Pure data, shared by the pages, the actions and the tests.
 *
 * One thing per page. The contact page is skipped for an anonymous complaint,
 * which holds no contact at all. `check` shows every answer with a change
 * link; `confirmation` is the result.
 */

import type { ComplaintIdentity } from "@/lib/db/schema/complaints";

export const COMPLAINT_STEPS = ["identity", "category", "describe", "when", "remedy", "evidence", "contact", "check", "confirmation"] as const;
export type ComplaintStep = (typeof COMPLAINT_STEPS)[number];

/** Form field names a question page submits. */
export const STEP_FIELDS: Record<string, readonly string[]> = {
  identity: ["identity"],
  category: ["category"],
  describe: ["description"],
  when: ["when", "where"],
  remedy: ["remedy"],
  contact: ["name", "email", "phone", "lineId", "preferred", "consent"],
};

/** The answers collected so far. Every value is a string as typed; validation parses them. */
export interface DraftValues {
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

/** The steps this person will see: no contact page when the complaint is anonymous. */
export function stepsFor(identity: string): readonly ComplaintStep[] {
  return identity === "anonymous" ? COMPLAINT_STEPS.filter((s) => s !== "contact") : COMPLAINT_STEPS;
}

export function nextStep(identity: string, step: string): ComplaintStep | null {
  const steps = stepsFor(identity);
  const i = steps.indexOf(step as ComplaintStep);
  return i >= 0 ? (steps[i + 1] ?? null) : null;
}

export function previousStep(identity: string, step: string): ComplaintStep | null {
  const steps = stepsFor(identity);
  const i = steps.indexOf(step as ComplaintStep);
  return i > 0 ? (steps[i - 1] ?? null) : null;
}

export function isIdentity(value: unknown): value is ComplaintIdentity {
  return value === "named" || value === "pseudonymous" || value === "anonymous";
}

export const JOURNEY_BASE = "/complaints";

export function stepPath(step: string): string {
  return `${JOURNEY_BASE}/${step}`;
}
