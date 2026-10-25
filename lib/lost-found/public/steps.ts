/**
 * The question pages of each public journey, in order, and the form fields
 * each page owns. Pure data, shared by the pages, the actions and the tests.
 *
 * One thing per page: a page asks one question (or one tight group, such as
 * the title and description of the item, or a name with ways to reach the
 * person). `check` shows every answer with a change link; `confirmation` is
 * the result.
 */

export const JOURNEYS = ["lost", "found", "claim"] as const;
export type JourneyKind = (typeof JOURNEYS)[number];

export const STEPS: Record<JourneyKind, readonly string[]> = {
  lost: ["category", "describe", "where", "when", "detail", "contact", "check", "confirmation"],
  found: ["category", "describe", "where", "when", "now", "contact", "check", "confirmation"],
  claim: ["proof", "contact", "check", "confirmation"],
};

/** Form field names a question page submits. Date parts are submitted as `when-day` and so on. */
export const STEP_FIELDS: Record<string, readonly string[]> = {
  category: ["category"],
  describe: ["title", "description"],
  where: ["placeId", "locationNote"],
  when: ["when-day", "when-month", "when-year"],
  detail: ["detail"],
  now: ["whereNow"],
  proof: ["proof"],
  contact: ["name", "email", "phone", "lineId", "preferred", "consent"],
};

/** The answers collected so far. Every value is a string as typed; validation parses them. */
export interface DraftValues {
  category: string;
  title: string;
  description: string;
  placeId: string;
  locationNote: string;
  day: string;
  month: string;
  year: string;
  detail: string;
  whereNow: string;
  proof: string;
  name: string;
  email: string;
  phone: string;
  lineId: string;
  preferred: string;
  consent: string;
}

export const WHERE_NOW_VALUES = ["will_hand_in", "left_there", "need_help"] as const;
export type WhereNow = (typeof WHERE_NOW_VALUES)[number];

export function isJourney(value: unknown): value is JourneyKind {
  return typeof value === "string" && (JOURNEYS as readonly string[]).includes(value);
}

export function isStep(kind: JourneyKind, step: unknown): step is string {
  return typeof step === "string" && STEPS[kind].includes(step);
}

export function firstStep(kind: JourneyKind): string {
  return STEPS[kind][0]!;
}

/** The step after `step`, or null at the end. */
export function nextStep(kind: JourneyKind, step: string): string | null {
  const steps = STEPS[kind];
  const i = steps.indexOf(step);
  return i >= 0 ? (steps[i + 1] ?? null) : null;
}

export function previousStep(kind: JourneyKind, step: string): string | null {
  const steps = STEPS[kind];
  const i = steps.indexOf(step);
  return i > 0 ? (steps[i - 1] ?? null) : null;
}

/** The locale-free path of a journey's start page. `slug` is the found listing being claimed. */
export function journeyBasePath(kind: JourneyKind, slug?: string): string {
  if (kind === "lost") return "/lost-and-found/report";
  if (kind === "found") return "/lost-and-found/found";
  return `/lost-and-found/${slug ?? ""}/claim`;
}

export function stepPath(kind: JourneyKind, step: string, slug?: string): string {
  return `${journeyBasePath(kind, slug)}/${step}`;
}
