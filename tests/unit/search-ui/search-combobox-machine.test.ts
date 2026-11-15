import { describe, expect, it } from "vitest";
import {
  initialSearchCombobox,
  searchAnnouncement,
  searchComboboxReducer as reduce,
  type SearchComboboxState,
} from "@/components/domain/search/search-combobox-machine";
import type { SearchResult } from "@/lib/search";

const result = (id: string) => ({ record: { id } }) as unknown as SearchResult;
const three = [result("a"), result("b"), result("c")];

function opened(requestId = 1): SearchComboboxState {
  return reduce(reduce(initialSearchCombobox, { type: "typed", requestId, blank: false }), { type: "resultsLoaded", requestId, results: three });
}

describe("search combobox machine", () => {
  it("opens with the results of the current request", () => {
    const state = opened();
    expect(state).toMatchObject({ mode: "open", active: -1, requestId: 1 });
    expect(state.results).toHaveLength(3);
  });

  it("closes when the current request has no results", () => {
    const typed = reduce(opened(), { type: "typed", requestId: 2, blank: false });
    expect(reduce(typed, { type: "resultsLoaded", requestId: 2, results: [] })).toMatchObject({ mode: "closed", results: [] });
  });

  it("drops results for a superseded request (cleared input, in-flight load)", () => {
    const typed = reduce(initialSearchCombobox, { type: "typed", requestId: 1, blank: false });
    const cleared = reduce(typed, { type: "typed", requestId: 2, blank: true });
    const late = reduce(cleared, { type: "resultsLoaded", requestId: 1, results: three });
    expect(late).toBe(cleared);
    expect(late.mode).toBe("closed");
  });

  it("clears results and closes when the input goes blank", () => {
    expect(reduce(opened(), { type: "typed", requestId: 2, blank: true })).toMatchObject({ mode: "closed", results: [], active: -1 });
  });

  it("keeps the list while typing more", () => {
    expect(reduce(opened(), { type: "typed", requestId: 2, blank: false })).toMatchObject({ mode: "open", requestId: 2 });
  });

  it("wraps the active option with move", () => {
    let state = opened();
    state = reduce(state, { type: "move", direction: "next" });
    expect(state.active).toBe(0);
    state = reduce(state, { type: "move", direction: "previous" });
    expect(state.active).toBe(2);
    state = reduce(state, { type: "move", direction: "next" });
    expect(state.active).toBe(0);
  });

  it("ignores move with no results", () => {
    expect(reduce(initialSearchCombobox, { type: "move", direction: "next" })).toBe(initialSearchCombobox);
  });

  it("reopens kept results with ArrowDown after escape", () => {
    const escaped = reduce(reduce(opened(), { type: "move", direction: "next" }), { type: "escape" });
    expect(escaped).toMatchObject({ mode: "closed", active: -1 });
    expect(escaped.results).toHaveLength(3);
    expect(reduce(escaped, { type: "move", direction: "next" })).toMatchObject({ mode: "open", active: 0 });
  });

  it("closes on select", () => {
    expect(reduce(opened(), { type: "select" }).mode).toBe("closed");
  });

  it("closes when focus leaves and stays open when focus moves inside", () => {
    expect(reduce(opened(), { type: "focusOut", requestId: 2, inside: true })).toMatchObject({ mode: "open" });
    expect(reduce(opened(), { type: "focusOut", requestId: 2, inside: false })).toMatchObject({ mode: "closed", requestId: 2 });
  });

  it("drops a pending request after focus leaves", () => {
    const typed = reduce(initialSearchCombobox, { type: "typed", requestId: 1, blank: false });
    const away = reduce(typed, { type: "focusOut", requestId: 2, inside: false });
    expect(reduce(away, { type: "resultsLoaded", requestId: 1, results: three }).mode).toBe("closed");
  });
});

describe("searchAnnouncement", () => {
  it("describes blank, empty and counted queries", () => {
    expect(searchAnnouncement(true, 0)).toEqual({ kind: "none" });
    expect(searchAnnouncement(false, 0)).toEqual({ kind: "empty" });
    expect(searchAnnouncement(false, 4)).toEqual({ kind: "count", count: 4 });
  });
});
