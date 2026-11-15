import type { SearchResult } from "@/lib/search";

/**
 * State of the search suggestion list. `results` survive a close so ArrowDown
 * can reopen them; `requestId` is the id of the latest query and lets late
 * results for an older query be dropped.
 */
export type SearchComboboxState =
  | { mode: "closed"; results: SearchResult[]; active: -1; requestId: number }
  | { mode: "open"; results: SearchResult[]; active: number; requestId: number };

export type SearchComboboxEvent =
  | { type: "typed"; requestId: number; blank: boolean }
  | { type: "resultsLoaded"; requestId: number; results: SearchResult[] }
  | { type: "move"; direction: "next" | "previous" }
  | { type: "escape" }
  | { type: "select" }
  | { type: "focusOut"; requestId: number; inside: boolean };

/** What the live region should say about a settled query. */
export type SearchAnnouncement = { kind: "none" } | { kind: "count"; count: number } | { kind: "empty" };

export const initialSearchCombobox: SearchComboboxState = { mode: "closed", results: [], active: -1, requestId: 0 };

function closed(state: SearchComboboxState, requestId = state.requestId): SearchComboboxState {
  return { mode: "closed", results: state.results, active: -1, requestId };
}

/** Pure transition for the search combobox. */
export function searchComboboxReducer(state: SearchComboboxState, event: SearchComboboxEvent): SearchComboboxState {
  switch (event.type) {
    case "typed":
      if (event.blank) return { mode: "closed", results: [], active: -1, requestId: event.requestId };
      return { ...state, requestId: event.requestId };
    case "resultsLoaded":
      if (event.requestId !== state.requestId) return state;
      if (event.results.length === 0) return { mode: "closed", results: [], active: -1, requestId: state.requestId };
      return { mode: "open", results: event.results, active: -1, requestId: state.requestId };
    case "move": {
      const count = state.results.length;
      if (count === 0) return state;
      const active =
        event.direction === "next" ? (state.active + 1) % count : state.active <= 0 ? count - 1 : state.active - 1;
      return { mode: "open", results: state.results, active, requestId: state.requestId };
    }
    case "escape":
    case "select":
      return state.mode === "open" ? closed(state) : state;
    case "focusOut":
      if (event.inside) return state;
      return state.mode === "open" || state.requestId !== event.requestId ? closed(state, event.requestId) : state;
  }
}

/** The announcement for a query: nothing when blank, otherwise the count or "no results". */
export function searchAnnouncement(blank: boolean, count: number): SearchAnnouncement {
  if (blank) return { kind: "none" };
  return count > 0 ? { kind: "count", count } : { kind: "empty" };
}
