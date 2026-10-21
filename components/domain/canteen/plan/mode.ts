/**
 * The three planners of /eat/plan, told apart by the `mode` search parameter.
 * Meal is the default and leaves the parameter out of its links.
 */

import type { RawParams } from "@/lib/canteen/params";

import { toSearchParams } from "../query";

export const PLAN_ROUTE = "/eat/plan";

export const PLAN_MODES = ["meal", "week", "group"] as const;
export type PlanMode = (typeof PLAN_MODES)[number];
export const DEFAULT_PLAN_MODE: PlanMode = "meal";

/** The mode a request asks for. Anything unknown is the default. */
export function readPlanMode(raw: RawParams): PlanMode {
  const value = toSearchParams(raw).get("mode");
  return PLAN_MODES.find((mode) => mode === value) ?? DEFAULT_PLAN_MODE;
}

/** The `mode` parameter for a link, or undefined for the default. */
export function planModeParam(mode: PlanMode): { mode?: PlanMode } {
  return mode === DEFAULT_PLAN_MODE ? {} : { mode };
}
