/**
 * Where a request for an /eat page should really live, or null when it is already there. The server (a full page
 * load of a URL with a query) redirects there, and the browser (a client navigation, which gets the prerendered
 * page) replaces the address with it, so both end at the same URL. Plain module: safe from server and client.
 */

import { readFilters, canonicalMealQuery, tidyQuery, toSearchParams } from "./query";
import { PLAN_ROUTE, readPlanMode } from "./plan/mode";
import { parseWeekRequest, weekHref } from "./budget/week-params";
import { groupHref, isFormSubmission, readGroupState, stateFromForm } from "./group/state";
import { PICK_ROUTE, readPickParams } from "./pick/helpers";
import type { RawParams } from "@/lib/canteen/params";
import { localePath, type Locale } from "@/lib/i18n/config";
import type { CanteenData } from "@/lib/content/types";

/** `path` with the tidy form of the query (empty values dropped), or null when it is already tidy. `path` has its locale prefix. */
export function tidyTarget(path: string, raw: RawParams): string | null {
  const tidy = tidyQuery(raw);
  return tidy === null ? null : tidy ? `${path}?${tidy}` : path;
}

/**
 * /eat/pick: the tidy query with an old meal budget moved to `meal`, and a seed when there is none, so the address
 * bar always holds a reproducible, shareable result. `seed` is the fresh one to use.
 */
export function pickTarget(locale: Locale, raw: RawParams, seed: string): string | null {
  const path = localePath(locale, PICK_ROUTE);
  const canonical = canonicalMealQuery(raw, readPickParams(raw).mode === "meal");
  const params = canonical === null ? toSearchParams(raw) : new URLSearchParams(canonical);
  if (readPickParams(params).seed !== undefined) return canonical === null ? null : canonical ? `${path}?${canonical}` : path;
  params.delete("seed");
  params.set("seed", seed);
  return `${path}?${params.toString()}`;
}

/** /eat/plan, by mode. `seed` is the fresh one to use when a plan or a random group needs one. */
export function planTarget(locale: Locale, raw: RawParams, data: CanteenData, seed: string): string | null {
  const path = localePath(locale, PLAN_ROUTE);
  const mode = readPlanMode(raw);

  if (mode === "meal") {
    const canonical = canonicalMealQuery(raw);
    return canonical === null ? null : canonical ? `${path}?${canonical}` : path;
  }

  if (mode === "week") {
    const tidy = tidyTarget(path, raw);
    if (tidy !== null) return tidy;
    const request = parseWeekRequest(raw);
    if (request.budget !== undefined && request.days.length > 0 && !request.seed) {
      return weekHref(path, { ...request, seed }, readFilters(raw, data));
    }
    return null;
  }

  const groupPath = `${path}?mode=group`;
  if (isFormSubmission(raw)) {
    const { state, hash } = stateFromForm(raw);
    return groupHref(groupPath, state, hash);
  }
  const state = readGroupState(raw);
  if (state.strategy === "random" && state.people.length > 0 && !state.seed) {
    return groupHref(groupPath, { ...state, seed }, "results");
  }
  return null;
}
