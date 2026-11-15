/**
 * What the person holding a tracking link may do next, derived from the case's
 * state machine and the facts its guards read. One answer for every service, so
 * the three tracking pages and their action routes cannot drift from the engine:
 * `withdraw` is the person calling the case off (a withdrawal, or a borrower's
 * cancellation), `reopen` is a resolved complaint inside its window, `survey`
 * is an unanswered satisfaction survey.
 */

import { allowedTransitions, guardsAllow, type GuardFacts } from "./services";
import type { CaseService } from "@/lib/db/schema/cases";

export type PublicAction = "withdraw" | "reopen" | "survey";

/** The case a person is looking at. */
export interface ActionView {
  service: CaseService;
  kind: string;
  status: string;
}

/** Facts beyond the status: the guard facts, and whether the survey can still be answered. */
export interface ActionFacts extends Partial<GuardFacts> {
  surveyOpen?: boolean;
}

/** The statuses that read as the person calling the case off. */
const CALL_OFF = ["withdrawn", "cancelled"] as const;

/** The actions open to the person at `now`, in the order the page lists them. */
export function availableActions(view: ActionView, now: Date, facts: ActionFacts = {}): PublicAction[] {
  const to = allowedTransitions(view.service, view.kind, view.status, "public");
  const actions: PublicAction[] = [];
  if (facts.surveyOpen && view.service === "complaint") actions.push("survey");
  if (to.includes("reopened") && guardsAllow(view.service, view.kind, view.status, "reopened", { resolvedAt: facts.resolvedAt ?? null }, now)) actions.push("reopen");
  if (CALL_OFF.some((status) => to.includes(status))) actions.push("withdraw");
  return actions;
}
