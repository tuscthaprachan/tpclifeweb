/** One row of a repeating list: a stable `key` (never reused) and the value it started with. */
export interface RepeaterRow<T> {
  key: number;
  value: T;
}

/** Where focus goes after a change: into a row, onto the "Add" button, or nowhere. */
export type RepeaterFocus = { target: "row"; key: number } | { target: "add" } | null;

/** What the last event did, for the announcement and the focus hand-off. `serial` grows with every change so a repeat is noticed. */
export type RepeaterChange =
  | { kind: "add"; serial: number; key: number; index: number; total: number; focus: RepeaterFocus }
  | { kind: "remove"; serial: number; key: number; index: number; total: number; focus: RepeaterFocus }
  | { kind: "move"; serial: number; key: number; index: number; total: number; by: -1 | 1; focus: RepeaterFocus };

export interface RepeaterState<T> {
  rows: RepeaterRow<T>[];
  nextKey: number;
  last: RepeaterChange | null;
}

export type RepeaterEvent<T> = { type: "add"; value: T; max?: number } | { type: "remove"; key: number } | { type: "move"; key: number; by: -1 | 1 };

/** Starts with one stable key per stored row. */
export function initialRepeater<T>(initial: readonly T[]): RepeaterState<T> {
  return { rows: initial.map((value, key) => ({ key, value })), nextKey: initial.length, last: null };
}

/**
 * Add appends (ignored at `max`) and focuses the new row. Remove drops a row
 * and hands focus to the row that took its place, else the one before, else
 * the Add button. Move swaps with a neighbour (ignored at the ends) and keeps
 * focus where it was. Unknown keys change nothing.
 */
export function repeaterReducer<T>(state: RepeaterState<T>, event: RepeaterEvent<T>): RepeaterState<T> {
  const serial = (state.last?.serial ?? 0) + 1;
  switch (event.type) {
    case "add": {
      if (event.max !== undefined && state.rows.length >= event.max) return state;
      const key = state.nextKey;
      const rows = [...state.rows, { key, value: event.value }];
      return { rows, nextKey: key + 1, last: { kind: "add", serial, key, index: rows.length - 1, total: rows.length, focus: { target: "row", key } } };
    }
    case "remove": {
      const index = state.rows.findIndex((row) => row.key === event.key);
      if (index < 0) return state;
      const rows = state.rows.filter((row) => row.key !== event.key);
      const neighbour = rows[index] ?? rows[index - 1];
      return { ...state, rows, last: { kind: "remove", serial, key: event.key, index, total: rows.length, focus: neighbour ? { target: "row", key: neighbour.key } : { target: "add" } } };
    }
    case "move": {
      const index = state.rows.findIndex((row) => row.key === event.key);
      const target = index + event.by;
      if (index < 0 || target < 0 || target >= state.rows.length) return state;
      const rows = [...state.rows];
      [rows[index], rows[target]] = [rows[target]!, rows[index]!];
      return { ...state, rows, last: { kind: "move", serial, key: event.key, index: target, total: rows.length, by: event.by, focus: null } };
    }
  }
}
