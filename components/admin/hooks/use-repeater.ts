"use client";

import { useCallback, useEffect, useReducer, useRef, type RefObject } from "react";
import { useStatusMessage, type StatusMessage } from "@/components/hooks/use-status-message";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { initialRepeater, repeaterReducer, type RepeaterEvent, type RepeaterRow, type RepeaterState } from "./repeater-machine";

const CONTROL = 'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])';

export interface UseRepeaterOptions {
  locale: Locale;
  /** Singular, for "Stop 2 removed". */
  itemLabel: string;
  /** Rows at most; the Add button is ignored beyond it. */
  max?: number;
  /** Called after a real change, so the form can mark itself dirty. */
  onChange?: () => void;
}

export interface UseRepeater<T> {
  rows: RepeaterRow<T>[];
  canAdd: boolean;
  add: (value: T) => void;
  remove: (key: number) => void;
  move: (key: number, by: -1 | 1) => void;
  /** Ref callback for each row's element, so focus can be handed to it. */
  rowRef: (key: number) => (element: HTMLElement | null) => void;
  /** Ref for the element wrapping the Add button. */
  addRef: RefObject<HTMLDivElement | null>;
  /** Render with `RepeaterStatus` inside the list's fieldset. */
  message: StatusMessage<string>;
}

/**
 * The state of a repeating list of form rows: add, remove and move, with a
 * live announcement of each change and focus handed on after it (the new row
 * after Add, the neighbour or the Add button after Remove). Rows keep a stable
 * key, so uncontrolled inputs travel with their row when it moves.
 */
export function useRepeater<T>(initial: readonly T[], { locale, itemLabel, max, onChange }: UseRepeaterOptions): UseRepeater<T> {
  const [state, dispatch] = useReducer(repeaterReducer as (s: RepeaterState<T>, e: RepeaterEvent<T>) => RepeaterState<T>, initial, initialRepeater<T>);
  const message = useStatusMessage<string>();
  const elements = useRef(new Map<number, HTMLElement>());
  const addRef = useRef<HTMLDivElement | null>(null);
  const handled = useRef(0);
  const changed = useRef(onChange);
  useEffect(() => {
    changed.current = onChange;
  });

  const { show } = message;
  const last = state.last;
  useEffect(() => {
    if (!last || last.serial === handled.current) return;
    handled.current = last.serial;
    const n = last.index + 1;
    if (last.kind === "add") show(a("rpAdded", locale, { item: itemLabel, n }));
    else if (last.kind === "remove") show(a("rpRemoved", locale, { item: itemLabel, n }));
    else show(a("rpMoved", locale, { item: itemLabel, n, total: last.total }));

    if (last.kind === "move") {
      const row = elements.current.get(last.key);
      if (row && !row.contains(document.activeElement)) {
        const buttons = row.querySelectorAll<HTMLButtonElement>("[data-row-action]");
        const wanted = Array.from(buttons).find((b) => b.dataset.rowAction === (last.by < 0 ? "up" : "down") && !b.disabled);
        (wanted ?? Array.from(buttons).find((b) => !b.disabled))?.focus();
      }
      return;
    }
    const focus = last.focus;
    if (focus?.target === "row") elements.current.get(focus.key)?.querySelector<HTMLElement>(CONTROL)?.focus();
    else if (focus?.target === "add") addRef.current?.querySelector<HTMLElement>("button")?.focus();
  }, [last, show, locale, itemLabel]);

  const canAdd = max === undefined || state.rows.length < max;
  const add = useCallback(
    (value: T) => {
      if (!canAdd) return;
      dispatch({ type: "add", value, max });
      changed.current?.();
    },
    [canAdd, max],
  );
  const remove = useCallback((key: number) => {
    dispatch({ type: "remove", key });
    changed.current?.();
  }, []);
  const move = useCallback((key: number, by: -1 | 1) => {
    dispatch({ type: "move", key, by });
    changed.current?.();
  }, []);
  const rowRef = useCallback(
    (key: number) => (element: HTMLElement | null) => {
      if (element) elements.current.set(key, element);
      else elements.current.delete(key);
    },
    [],
  );

  return { rows: state.rows, canAdd, add, remove, move, rowRef, addRef, message };
}
