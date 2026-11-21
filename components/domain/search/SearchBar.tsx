"use client";

/**
 * The site search box: the first and largest element on the home page.
 *
 * Baseline (works with JavaScript off): a real `<form method="get">` that
 * submits a named `q` input straight to the search results page
 * (`app/[locale]/search/page.tsx`). Nothing below depends on JavaScript for
 * that to work; every handler here is an enhancement layered on top of a
 * form and button that already do their job natively.
 *
 * Enhancement (JavaScript on): the input becomes an ARIA combobox
 * (WAI-ARIA APG "Editable Combobox With List Autocomplete" pattern) backed
 * by the prebuilt search index, fetched lazily from
 * `/api/search-index` on first interaction rather than on mount,
 * so it never competes with first paint. Matching then runs entirely
 * in-memory (`lib/search`), debounced, so typing never issues one network
 * request per keystroke; only the initial index fetch touches the network.
 */

import Form from "next/form";
import { useEffect, useId, useReducer, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { liveRegionProps } from "@/lib/a11y";
import { localePath, pick, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { search as runSearch, type SearchResult } from "@/lib/search";
import type { SearchRecord } from "@/lib/content/types";
import { loadSearchRecords } from "@/lib/search/wire";
import { Button, cx } from "@/components/ui";
import { SearchIcon } from "@/components/ui/icons";
import { useStatusMessage } from "@/components/hooks/use-status-message";
import {
  initialSearchCombobox,
  searchAnnouncement,
  searchComboboxReducer,
} from "./search-combobox-machine";

interface SearchBarProps {
  locale: Locale;
  /** Pre-fills the box, for example from `?q=` on the results page. */
  defaultValue?: string;
  /** Replaces the default visible label. */
  label?: string;
  /** Replaces the default hint line. */
  hint?: string;
  /** Placeholder examples shown in turn while the box is empty and unfocused. */
  examples?: string[];
  /** "pill" is the home page's rounded row with a round icon button. */
  variant?: "default" | "pill";
  className?: string;
}

const DEBOUNCE_MS = 200;
const MAX_SUGGESTIONS = 8;
const EXAMPLE_MS = 3000;

export function SearchBar({ locale, defaultValue = "", label, hint, examples, variant = "default", className }: SearchBarProps) {
  const pill = variant === "pill";
  const router = useRouter();
  const inputId = useId();
  const listboxId = useId();
  const hintId = useId();

  const [query, setQuery] = useState(defaultValue);
  const [focused, setFocused] = useState(false);
  const [exampleTick, setExampleTick] = useState(0);
  const exampleCount = examples?.length ?? 0;
  const [state, dispatch] = useReducer(searchComboboxReducer, initialSearchCombobox);
  const status = useStatusMessage<string>();
  const { show: showStatus, clear: clearStatus } = status;

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  // Caches the in-flight (then resolved) index fetch so it happens exactly
  // once per page, no matter how many times focus/change handlers fire.
  const indexPromiseRef = useRef<Promise<SearchRecord[]> | null>(null);

  const open = state.mode === "open";
  const { results, active: activeIndex } = state;

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (exampleCount < 2 || focused || query !== "") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setExampleTick((tick) => tick + 1), EXAMPLE_MS);
    return () => clearInterval(timer);
  }, [exampleCount, focused, query]);

  const rolling = examples !== undefined && exampleCount > 0;
  const example = rolling ? examples[exampleTick % exampleCount] : undefined;
  const previousExample = rolling && exampleTick > 0 ? examples[(exampleTick - 1) % exampleCount] : undefined;
  const placeholder = example ?? (label ? undefined : UI.searchPlaceholder[locale]);
  const hintText = pill ? hint : (hint ?? UI.searchHint[locale]);

  function loadIndex(): Promise<SearchRecord[]> {
    if (indexPromiseRef.current) return indexPromiseRef.current;

    const promise = loadSearchRecords().catch(() => {
      indexPromiseRef.current = null;
      return [] as SearchRecord[];
    });

    indexPromiseRef.current = promise;
    return promise;
  }

  function handleChange(value: string) {
    setQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    const requestId = ++requestIdRef.current;
    const blank = value.trim().length === 0;
    dispatch({ type: "typed", requestId, blank });

    if (blank) {
      clearStatus();
      return;
    }

    debounceRef.current = setTimeout(() => {
      void loadIndex().then((records) => {
        if (requestId !== requestIdRef.current) return;
        const next = runSearch(value, records, { limit: MAX_SUGGESTIONS });
        dispatch({ type: "resultsLoaded", requestId, results: next });
        const announcement = searchAnnouncement(false, next.length);
        showStatus(
          announcement.kind === "count"
            ? `${announcement.count} ${UI.searchResults[locale]}`
            : UI.searchNoResults[locale],
        );
      });
    }, DEBOUNCE_MS);
  }

  function handleFocus() {
    setFocused(true);
    void loadIndex();
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    const next = event.relatedTarget as Node | null;
    const inside = next !== null && event.currentTarget.contains(next);
    if (inside) return;
    setFocused(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const requestId = ++requestIdRef.current;
    dispatch({ type: "focusOut", requestId, inside });
  }

  function goToResult(result: SearchResult) {
    dispatch({ type: "select" });
    router.push(result.record.path[locale]);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      if (results.length === 0) return;
      event.preventDefault();
      dispatch({ type: "move", direction: "next" });
    } else if (event.key === "ArrowUp") {
      if (results.length === 0) return;
      event.preventDefault();
      dispatch({ type: "move", direction: "previous" });
    } else if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        dispatch({ type: "escape" });
      }
    } else if (event.key === "Enter") {
      if (open && activeIndex >= 0) {
        const target = results[activeIndex];
        if (target) {
          event.preventDefault();
          goToResult(target);
        }
      }
      // No suggestion highlighted: fall through to the native form submit,
      // which is exactly what makes Enter work with JavaScript off too.
    }
  }

  const activeId = activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;

  return (
    <Form role="search" action={localePath(locale, "/search")} className={className}>
      <label htmlFor={inputId} className={pill ? "visually-hidden" : "mb-[var(--space-1)] block text-base font-medium text-ink-900"}>
        {label ?? UI.searchLabel[locale]}
      </label>
      {hintText ? (
        <p id={hintId} className="mb-[var(--space-2)] text-sm text-ink-600">
          {hintText}
        </p>
      ) : null}

      <div
        className={cx(
          "flex gap-[var(--space-2)]",
          pill &&
            "items-center gap-[var(--space-1)] rounded-pill border-2 border-line-strong bg-surface p-[var(--space-1)]",
        )}
      >
        <div className="relative min-w-0 flex-1" onBlur={handleBlur}>
          <input
            id={inputId}
            name="q"
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-activedescendant={activeId}
            aria-autocomplete="list"
            aria-describedby={hintText ? hintId : undefined}
            autoComplete="off"
            placeholder={placeholder}
            value={query}
            onChange={(event) => handleChange(event.target.value)}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            style={pill ? { borderRadius: "var(--radius-pill)" } : undefined}
            className={cx(
              "peer min-h-[var(--target-min)] w-full px-[var(--space-3)] py-[var(--space-2)] text-base text-ink-900",
              pill ? "block h-12 min-h-12 rounded-pill border-0 bg-transparent px-[var(--space-4)] py-0 placeholder:text-ink-600" : "rounded-control border border-line-strong bg-surface",
              rolling && "placeholder:text-transparent",
            )}
          />
          {rolling ? (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 start-[var(--space-4)] end-[var(--space-2)] hidden items-center overflow-hidden text-base text-ink-600 peer-placeholder-shown:flex"
            >
              <span className="relative block h-[1lh] w-full overflow-hidden">
                {previousExample !== undefined ? (
                  <span key={`out-${exampleTick}`} className="search-roll-out absolute inset-0 truncate">
                    {previousExample}
                  </span>
                ) : null}
                <span key={`in-${exampleTick}`} className={cx("absolute inset-0 truncate", exampleTick > 0 && "search-roll-in")}>
                  {example}
                </span>
              </span>
            </span>
          ) : null}
          <ul
            id={listboxId}
            role="listbox"
            aria-label={UI.searchResults[locale]}
            hidden={!open}
            className="absolute z-10 mt-[var(--space-1)] w-full rounded-control border border-line bg-surface shadow-[var(--shadow-elevation)]"
          >
            {results.map((result, index) => (
              <li
                key={result.record.id}
                id={`${listboxId}-option-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                className={cx(
                  "cursor-pointer px-[var(--space-3)] py-[var(--space-2)] text-ink-900",
                  index === activeIndex ? "bg-surface-alt" : undefined,
                )}
                onMouseDown={(event) => {
                  // mousedown, not click: fires before the input's blur, so
                  // the listbox has not already closed by the time this runs.
                  event.preventDefault();
                  goToResult(result);
                }}
              >
                {pick(result.record.title, locale)}
              </li>
            ))}
          </ul>
        </div>

        {pill ? (
          <button
            type="submit"
            style={{ borderRadius: "var(--radius-pill)" }}
            className="inline-flex size-12 shrink-0 items-center justify-center rounded-pill bg-action text-action-ink hover:bg-action-hover press"
          >
            <SearchIcon className="size-6 align-middle" />
            <span className="visually-hidden">{UI.searchSubmit[locale]}</span>
          </button>
        ) : (
          <Button type="submit">{UI.searchSubmit[locale]}</Button>
        )}
      </div>

      <p {...liveRegionProps("polite")} className="visually-hidden">
        {status.value === null ? null : <span key={status.nonce}>{status.value}</span>}
      </p>
    </Form>
  );
}
