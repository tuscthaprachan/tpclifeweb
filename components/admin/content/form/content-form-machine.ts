import type { SaveIntent } from "@/lib/admin/content/form-state";

/**
 * A content form's life. `saving` remembers whether the person kept editing
 * while the save ran, so those edits are kept or warned about rather than
 * lost when the page reloads with the stored values. `error` is a failed save:
 * the form keeps what was typed and is still unsaved.
 */
export type ContentFormState =
  | { status: "clean" }
  | { status: "dirty" }
  | { status: "saving"; intent: SaveIntent; editedDuring: boolean }
  | { status: "error"; intent: SaveIntent };

export type ContentFormEvent = { type: "edit" } | { type: "submit"; intent: SaveIntent } | { type: "succeeded" } | { type: "failed" };

export const initialContentForm: ContentFormState = { status: "clean" };

/**
 * `edit` dirties a clean form, and marks a saving one `editedDuring`. `submit`
 * starts a save from any state except saving (a second submit is ignored).
 * `succeeded` cleans the form unless it was edited during the save, in which
 * case it stays dirty. `failed` moves a save to `error`. Events that do not
 * apply to the current state change nothing.
 */
export function contentFormReducer(state: ContentFormState, event: ContentFormEvent): ContentFormState {
  switch (event.type) {
    case "edit":
      if (state.status === "saving") return state.editedDuring ? state : { ...state, editedDuring: true };
      return state.status === "clean" ? { status: "dirty" } : state;
    case "submit":
      return state.status === "saving" ? state : { status: "saving", intent: event.intent, editedDuring: false };
    case "succeeded":
      if (state.status !== "saving") return state;
      return state.editedDuring ? { status: "dirty" } : { status: "clean" };
    case "failed":
      return state.status === "saving" ? { status: "error", intent: state.intent } : state;
  }
}

/** True while there is something not saved: the leave warning and the "unsaved" bar follow this. */
export function isContentFormDirty(state: ContentFormState): boolean {
  return state.status !== "clean";
}

/** True while a save runs; Delete, Duplicate and further saves are held off. */
export function isContentFormSaving(state: ContentFormState): state is Extract<ContentFormState, { status: "saving" }> {
  return state.status === "saving";
}

/** True when the form is closing mid-save with edits the stored values will not contain. */
export function hasEditsInFlight(state: ContentFormState): boolean {
  return state.status === "saving" && state.editedDuring;
}
