"use client";

/**
 * The site search box: the first and largest element on the home page.
 *
 * Baseline (works with JavaScript off): a real `<form method="get">` that
 * submits a named `q` input straight to the server-rendered results page
 * (`app/[locale]/search/page.tsx`). Nothing below depends on JavaScript for
 * that to work; every handler here is an enhancement layered on top of a
 * form and button that already do their job natively.
 *
 * Enhancement (JavaScript on): the input becomes an ARIA combobox
 * (WAI-ARIA APG "Editable Combobox With List Autocomplete" pattern) backed
 * by the prebuilt search index, fetched lazily from
 * `/api/search-index/[locale]` on first interaction rather than on mount,
 * so it never competes with first paint. Matching then runs entirely
 * in-memory (`lib/search`), debounced, so typing never issues one network
 * request per keystroke; only the initial index fetch touches the network.
 */

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { liveRegionProps } from "@/lib/a11y";
import { localePath, pick, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { search as runSearch, type SearchResult } from "@/lib/search";
import type { SearchIndex, SearchRecord } from "@/lib/content/types";
import { Button, cx } from "@/components/ui";

interface SearchBarProps {
  locale: Locale;
  /** Pre-fills the box, for example from `?q=` on the results page. */
  defaultValue?: string;
  /** Replaces the default visible label. */
  label?: string;
  /** Replaces the default hint line. */
  hint?: string;
  /** "pill" is the home page's rounded row with a purple pill button. */
  variant?: "default" | "pill";
  className?: string;
}

const DEBOUNCE_MS = 200;
const MAX_SUGGESTIONS = 8;

export function SearchBar({ locale, defaultValue = "", label, hint, variant = "default", className }: SearchBarProps) {
  const pill = variant === "pill";
  const router = useRouter();
  const inputId = useId();
  const listboxId = useId();
  const hintId = useId();

  const [query, setQuery] = useState(defaultValue);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [announcement, setAnnouncement] = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Caches the in-flight (then resolved) index fetch so it happens exactly
  // once per page, no matter how many times focus/change handlers fire.
  const indexPromiseRef = useRef<Promise<SearchRecord[]> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function loadIndex(): Promise<SearchRecord[]> {
    if (indexPromiseRef.current) return indexPromiseRef.current;

    const promise = fetch(`/api/search-index/${locale}`)
      .then((response) => {
        if (!response.ok) throw new Error(`search index request failed: ${response.status}`);
        return response.json() as Promise<SearchIndex>;
      })
      .then((index) => index.records)
      .catch(() => {
        // A failed fetch degrades to "no suggestions": the plain form
        // submit still works, since it never depended on this promise.
        indexPromiseRef.current = null;
        return [] as SearchRecord[];
      });

    indexPromiseRef.current = promise;
    return promise;
  }

  function applyResults(value: string, next: SearchResult[]) {
    setResults(next);
    setActiveIndex(-1);
    setOpen(next.length > 0);
    if (value.trim().length === 0) {
      setAnnouncement("");
    } else if (next.length > 0) {
      setAnnouncement(`${next.length} ${UI.searchResults[locale]}`);
    } else {
      setAnnouncement(UI.searchNoResults[locale]);
    }
  }

  function handleChange(value: string) {
    setQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length === 0) {
      setResults([]);
      setOpen(false);
      setActiveIndex(-1);
      setAnnouncement("");
      return;
    }

    debounceRef.current = setTimeout(() => {
      void loadIndex().then((records) => {
        applyResults(value, runSearch(value, records, { limit: MAX_SUGGESTIONS }));
      });
    }, DEBOUNCE_MS);
  }

  function handleFocus() {
    void loadIndex();
  }

  function closeList() {
    setOpen(false);
    setActiveIndex(-1);
  }

  function goToResult(result: SearchResult) {
    closeList();
    router.push(result.record.path[locale]);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      if (results.length === 0) return;
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      if (results.length === 0) return;
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index <= 0 ? results.length - 1 : index - 1));
    } else if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        closeList();
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
    <form role="search" action={localePath(locale, "/search")} method="get" className={className}>
      <label htmlFor={inputId} className="mb-[var(--space-1)] block text-base font-medium text-ink-900">
        {label ?? UI.searchLabel[locale]}
      </label>
      <p id={hintId} className={cx("mb-[var(--space-2)] text-sm text-ink-600", pill && "max-w-[calc(100%-5.5rem)] sm:max-w-none")}>
        {hint ?? UI.searchHint[locale]}
      </p>

      <div
        className={cx(
          "flex gap-[var(--space-2)]",
          pill &&
            "gap-[var(--space-1)] rounded-pill border-2 border-line-strong bg-surface p-[var(--space-1)]",
        )}
      >
        <div className="relative min-w-0 flex-1">
          <input
            id={inputId}
            name="q"
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-activedescendant={activeId}
            aria-autocomplete="list"
            aria-describedby={hintId}
            autoComplete="off"
            placeholder={label ? undefined : UI.searchPlaceholder[locale]}
            value={query}
            onChange={(event) => handleChange(event.target.value)}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            style={pill ? { borderRadius: "var(--radius-pill)" } : undefined}
            className={cx(
              "min-h-[var(--target-min)] w-full px-[var(--space-3)] py-[var(--space-2)] text-base text-ink-900",
              pill ? "min-h-12 rounded-pill border-0 bg-transparent px-[var(--space-4)]" : "rounded-control border border-line-strong bg-surface",
            )}
          />
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
            className="min-h-12 rounded-pill bg-action px-[var(--space-5)] font-bold text-action-ink hover:bg-action-hover press"
          >
            {UI.searchSubmit[locale]}
          </button>
        ) : (
          <Button type="submit">{UI.searchSubmit[locale]}</Button>
        )}
      </div>

      <p {...liveRegionProps("polite")} className="visually-hidden">
        {announcement}
      </p>
    </form>
  );
}
