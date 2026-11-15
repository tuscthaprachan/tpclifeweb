import type { LfState } from "./lf-state";

/** Field names never echoed back to the browser, whatever the form. Hidden ids are not form content. */
const NEVER_ECHOED = /password|passcode|token|secret/i;
const HIDDEN_IDS: ReadonlySet<string> = new Set(["caseId", "org"]);

/**
 * The submitted text fields of a form, for putting back in the inputs after a
 * validation error (React resets an uncontrolled form once its action ends).
 * Files, secret-looking fields and the hidden case ids are left out. A ticked
 * checkbox comes back as its posted value; an unticked one is simply absent.
 */
export function formValues(formData: FormData, omit: readonly string[] = []): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [name, value] of formData.entries()) {
    if (typeof value !== "string" || NEVER_ECHOED.test(name) || HIDDEN_IDS.has(name) || omit.includes(name)) continue;
    if (!(name in values)) values[name] = value;
  }
  return values;
}

/** Adds the submitted values to a state that reports a problem, unless the action already set them; any other state passes through, so a save still clears the fields. */
export function withValues(state: LfState, formData: FormData): LfState {
  if ((state.status !== "invalid" && state.status !== "failed") || state.values) return state;
  return { ...state, values: formValues(formData) };
}
