/** Outcome of one attempt to fetch the canteen dataset. */
export type LoadOutcome = "ok" | "failed";

/**
 * What the loader does next: `resolve` hands the data on and clears the spent
 * reload flag, `reload` spends the one automatic page reload and waits for it,
 * `reject` surfaces the failure to the error boundary.
 */
export type LoadAction = "resolve" | "reload" | "reject";

/** Decides the next step from whether the one reload is already spent and how the attempt went. */
export function nextLoadAction(reloadSpent: boolean, outcome: LoadOutcome): LoadAction {
  if (outcome === "ok") return "resolve";
  return reloadSpent ? "reject" : "reload";
}
