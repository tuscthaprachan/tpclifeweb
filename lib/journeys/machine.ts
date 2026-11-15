/**
 * The route of a public journey, as pure functions. A service declares its
 * pages and its validation; this works out which page a request may see, where
 * a saved answer leads, and which one-time error message a page shows.
 *
 * Pages come from `steps(values, ctx)`: the pages on this person's route, in
 * order, ending at `check` or at a page that ends the journey (emergency help,
 * a signpost). `confirmation` is the result and is not listed.
 */

import type { Locale } from "@/lib/i18n/config";

/** The one-time errors of the last rejected post, shown on the page they belong to. */
export interface Flash<E> {
  step: string;
  /** The errors of the page, keyed by field. */
  errors: E;
}

/** What the machine reads from a journey's saved data. */
export interface DraftShape<V, E, R = unknown> {
  locale: Locale;
  values: V;
  flash?: Flash<E>;
  result?: R;
}

export interface JourneyDefinition<V, E extends object, Ctx> {
  /** The pages on this person's route, in order. */
  steps: (values: V, ctx: Ctx) => readonly string[];
  /** Errors of one question page. Empty for a page that asks nothing, and for an answer that is good. */
  validate: (step: string, values: V, ctx: Ctx) => E;
  /** The first page with a problem, or the page the route ends at when it never reaches `check`. Null when every answer is good. */
  problems: (values: V, ctx: Ctx) => { step: string; errors: E } | null;
  /** Whether a problem with `step` is news to the person, so its errors are shown on the page they are sent to. Default: only when they asked for `check`. */
  explain?: (step: string, values: V, requested: string) => boolean;
  /** The page that lists every answer. Default `check`. */
  check?: string;
  /** The page that shows the result. Default `confirmation`. */
  confirmation?: string;
}

/** Where a request for a page goes. */
export type JourneyRoute<E> =
  | { kind: "unavailable" }
  | { kind: "expired" }
  | { kind: "start" }
  | { kind: "confirmation" }
  | { kind: "show"; step: string }
  | { kind: "redirect"; step: string; errors: E };

export interface RouteInput<D, Ctx> {
  /** False when the database or the encryption key is missing. */
  available: boolean;
  /** The saved journey, or null when there is none or it expired. */
  data: D | null;
  requested: string;
  /** Required whenever `data` is set. */
  ctx?: Ctx;
}

/** Where a saved answer leads. */
export interface AfterSave<E> {
  step: string;
  errors: E;
  /** True when the person should come back to `check` after fixing the page (they came from it). */
  fromCheck: boolean;
}

export function defineJourney<V, E extends object, Ctx>(def: JourneyDefinition<V, E, Ctx>) {
  const check = def.check ?? "check";
  const confirmation = def.confirmation ?? "confirmation";
  const explain = def.explain ?? ((_step: string, _values: V, requested: string) => requested === check);
  const hasErrors = (errors: object) => Object.keys(errors).length > 0;
  const none = {} as E;

  /** The page a request for `requested` is sent to instead, or null when the person may see it. No page is reachable while a question before it is unanswered; a page off the route goes to the end of it. */
  function guard(values: V, requested: string, ctx: Ctx): { step: string; errors: E } | null {
    const steps = def.steps(values, ctx);
    const at = steps.indexOf(requested);
    const before = at < 0 ? steps : steps.slice(0, at);
    for (const earlier of before) {
      const errors = def.validate(earlier, values, ctx);
      if (hasErrors(errors)) return { step: earlier, errors: explain(earlier, values, requested) ? errors : none };
    }
    if (at >= 0) return null;
    return { step: steps[steps.length - 1] ?? check, errors: none };
  }

  /** What to do with a request for a page. */
  function route<D extends DraftShape<V, E>>(input: RouteInput<D, Ctx>): JourneyRoute<E> {
    if (!input.available) return { kind: "unavailable" };
    const { data, requested } = input;
    if (!data) return { kind: "expired" };
    if (data.result) return requested === confirmation ? { kind: "confirmation" } : { kind: "redirect", step: confirmation, errors: none };
    if (requested === confirmation) return { kind: "start" };
    const elsewhere = guard(data.values, requested, input.ctx as Ctx);
    return elsewhere ? { kind: "redirect", ...elsewhere } : { kind: "show", step: requested };
  }

  /**
   * The page after saving `step`. From `check` it returns there, unless the
   * change leaves another page needing an answer; otherwise it is the next
   * page on the route.
   */
  function afterSave(values: V, step: string, opts: { fromCheck: boolean; ctx: Ctx }): AfterSave<E> {
    const steps = def.steps(values, opts.ctx);
    if (opts.fromCheck && steps.includes(check)) {
      const problem = def.problems(values, opts.ctx);
      if (problem) return { step: problem.step, errors: explain(problem.step, values, check) ? problem.errors : none, fromCheck: true };
      return { step: check, errors: none, fromCheck: false };
    }
    return { step: steps[steps.indexOf(step) + 1] ?? check, errors: none, fromCheck: false };
  }

  /** The page before `step` on the route, or null at the first. */
  function previous(values: V, step: string, ctx: Ctx): string | null {
    const steps = def.steps(values, ctx);
    const i = steps.indexOf(step);
    return i > 0 ? (steps[i - 1] ?? null) : null;
  }

  return { steps: def.steps, validate: def.validate, problems: def.problems, guard, route, afterSave, previous, consumeFlash };
}

/**
 * The flash to show on `step`, and the data without it. Any flash is
 * dropped, shown or not, because it is only ever shown once. Returns the same
 * data object when there is nothing to drop, so saving it can be skipped.
 */
export function consumeFlash<D extends { flash?: { step: string } }>(data: D, step: string): { flash: D["flash"]; data: D } {
  if (!data.flash) return { flash: undefined, data };
  return { flash: data.flash.step === step ? data.flash : undefined, data: { ...data, flash: undefined } };
}

/** Saves answers into a draft. A journey that has been sent keeps its result and ignores later edits. */
export function recordAnswers<D extends { locale: Locale; values: unknown; flash?: unknown; result?: unknown }>(
  data: D,
  change: { locale: Locale; merge: (values: D["values"]) => D["values"]; flash?: D["flash"] },
): D {
  if (data.result) return data;
  return { ...data, locale: change.locale, values: change.merge(data.values), flash: change.flash };
}

/** Sets or clears the flash of a draft. A journey that has been sent keeps its result and ignores it. */
export function recordFlash<D extends { flash?: unknown; result?: unknown }>(data: D, flash: D["flash"]): D {
  if (data.result || (!flash && !data.flash)) return data;
  return { ...data, flash };
}
