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

/** Adds the submitted values to a state that reports a problem; a saved or empty state passes through. */
export function withValues<S extends { error?: string; errors?: Record<string, string>; saved?: unknown; values?: Record<string, string> }>(state: S, formData: FormData): S {
  if (state.saved || state.values) return state;
  const failed = state.error !== undefined || Object.keys(state.errors ?? {}).length > 0;
  return failed ? { ...state, values: formValues(formData) } : state;
}
