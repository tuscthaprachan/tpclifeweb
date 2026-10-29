"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ConsoleIcon, type ConsoleIconName } from "@/components/admin/icons";
import type { ResolvedNav } from "@/lib/admin/nav-match";
import { fill } from "./fill";
import type { ShellLabels } from "./labels";

/** One row of the palette. */
interface Entry {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  icon: ConsoleIconName;
  /** Extra words the filter also searches. */
  keywords?: string;
}

interface Section {
  id: string;
  label: string;
  entries: Entry[];
}

/** The shape an async search endpoint must return. */
export interface PaletteSearchResult {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  icon: ConsoleIconName;
  /** Heading the result is listed under, already in the staff member's language. */
  group: string;
}

export interface CommandPaletteProps {
  nav: ResolvedNav;
  labels: Pick<
    ShellLabels,
    "paletteTitle" | "palettePlaceholder" | "paletteGoTo" | "paletteCreate" | "paletteResults" | "paletteEmpty" | "paletteLoading" | "paletteCount" | "paletteKeys" | "paletteClose"
  >;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Optional URL for live results. The palette fetches `${searchEndpoint}?q=<query>`
   * (debounced, from two characters) and expects `{ results: PaletteSearchResult[] }`,
   * listed under one heading per `group`. Omit it and only pages and actions are searched.
   */
  searchEndpoint?: string;
}

const MIN_REMOTE_CHARS = 2;
const DEBOUNCE_MS = 200;

/** Case-insensitive fuzzy score of `query` in `text`; null when it does not match. Higher is better. */
export function fuzzyScore(query: string, text: string): number | null {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const t = text.toLowerCase();
  let total = 0;
  for (const word of q.split(/\s+/)) {
    const at = t.indexOf(word);
    if (at >= 0) {
      total += 100 - Math.min(at, 50) + (at === 0 || t[at - 1] === " " ? 20 : 0);
      continue;
    }
    let cursor = -1;
    let gaps = 0;
    for (const ch of word) {
      const next = t.indexOf(ch, cursor + 1);
      if (next < 0) return null;
      gaps += cursor < 0 ? 0 : next - cursor - 1;
      cursor = next;
    }
    total += Math.max(1, 40 - gaps);
  }
  return total;
}

function filterEntries(entries: Entry[], query: string): Entry[] {
  if (!query.trim()) return entries;
  return entries
    .map((entry) => {
      const title = fuzzyScore(query, entry.title);
      const extra = fuzzyScore(query, `${entry.subtitle ?? ""} ${entry.keywords ?? ""}`);
      const score = title !== null ? title + 50 : extra;
      return { entry, score };
    })
    .filter((x): x is { entry: Entry; score: number } => x.score !== null)
    .sort((x, y) => y.score - x.score)
    .map((x) => x.entry);
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/**
 * Command palette: opens with Ctrl+K, Cmd+K or `/`, filters the console's pages
 * and "Add ..." actions as you type, and optionally lists live results from
 * `searchEndpoint`. Dialog with a combobox and listbox, driven from the keyboard.
 */
export function CommandPalette({ nav, labels, open, onOpenChange, searchEndpoint }: CommandPaletteProps) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const combo = (event.key === "k" || event.key === "K") && (event.metaKey || event.ctrlKey);
      const slash = event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey && !isTypingTarget(event.target);
      if (combo || slash) {
        event.preventDefault();
        onOpenChange(true);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onOpenChange]);

  if (!open) return null;
  return <PaletteDialog nav={nav} labels={labels} onClose={() => onOpenChange(false)} searchEndpoint={searchEndpoint} />;
}

function PaletteDialog({ nav, labels, onClose, searchEndpoint }: Omit<CommandPaletteProps, "open" | "onOpenChange"> & { onClose: () => void }) {
  const router = useRouter();
  const uid = useId();
  const listId = `${uid}-list`;
  const titleId = `${uid}-title`;
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [remote, setRemote] = useState<{ query: string; results: PaletteSearchResult[] } | null>(null);

  const pages = useMemo<Entry[]>(
    () => nav.groups.flatMap((g) => g.items.map((i) => ({ id: i.id, title: i.label, subtitle: g.label, href: i.href, icon: i.icon }))),
    [nav],
  );
  const creates = useMemo<Entry[]>(
    () => nav.quickCreate.map((q) => ({ id: q.id, title: q.label, subtitle: q.groupLabel, href: q.href, icon: q.icon })),
    [nav],
  );

  const trimmed = query.trim();
  const wantsRemote = Boolean(searchEndpoint) && trimmed.length >= MIN_REMOTE_CHARS;
  const loading = wantsRemote && remote?.query !== trimmed;

  const sections = useMemo<Section[]>(() => {
    const out: Section[] = [
      { id: "pages", label: labels.paletteGoTo, entries: filterEntries(pages, query) },
      { id: "create", label: labels.paletteCreate, entries: filterEntries(creates, query) },
    ];
    if (wantsRemote && remote?.query === trimmed) {
      const byGroup = new Map<string, Entry[]>();
      for (const r of remote.results) {
        const entry: Entry = { id: `r-${r.id}`, title: r.title, subtitle: r.subtitle, href: r.href, icon: r.icon };
        byGroup.set(r.group, [...(byGroup.get(r.group) ?? []), entry]);
      }
      for (const [group, entries] of byGroup) out.push({ id: `remote-${group}`, label: group || labels.paletteResults, entries });
    }
    return out.filter((s) => s.entries.length > 0);
  }, [pages, creates, query, labels, remote, trimmed, wantsRemote]);

  const flat = useMemo(() => sections.flatMap((s) => s.entries), [sections]);
  const active = flat.length === 0 ? -1 : Math.min(cursor, flat.length - 1);

  useEffect(() => {
    if (!searchEndpoint || trimmed.length < MIN_REMOTE_CHARS) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`${searchEndpoint}?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal, headers: { accept: "application/json" } });
        if (!response.ok) throw new Error(String(response.status));
        const body = (await response.json()) as { results?: PaletteSearchResult[] };
        setRemote({ query: trimmed, results: Array.isArray(body.results) ? body.results : [] });
      } catch {
        if (!controller.signal.aborted) setRemote({ query: trimmed, results: [] });
      }
    }, DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchEndpoint, trimmed]);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const html = document.documentElement;
    const overflow = html.style.overflow;
    html.style.overflow = "hidden";
    input.current?.focus();
    return () => {
      html.style.overflow = overflow;
      previous?.focus();
    };
  }, []);

  useEffect(() => {
    if (active < 0) return;
    list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function go(entry: Entry) {
    onClose();
    router.push(entry.href);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    switch (event.key) {
      case "Escape":
        event.preventDefault();
        onClose();
        break;
      case "ArrowDown":
        event.preventDefault();
        if (flat.length) setCursor((active + 1) % flat.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        if (flat.length) setCursor((active - 1 + flat.length) % flat.length);
        break;
      case "Home":
        if (flat.length) {
          event.preventDefault();
          setCursor(0);
        }
        break;
      case "End":
        if (flat.length) {
          event.preventDefault();
          setCursor(flat.length - 1);
        }
        break;
      case "Enter": {
        const entry = flat[active];
        if (entry) {
          event.preventDefault();
          go(entry);
        }
        break;
      }
      case "Tab":
        event.preventDefault();
        input.current?.focus();
        break;
    }
  }

  const starts = sections.map((_, n) => sections.slice(0, n).reduce((sum, s) => sum + s.entries.length, 0));
  return (
    <div className="console-palette-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="console-palette" onKeyDown={onKeyDown}>
        <h2 id={titleId} className="visually-hidden">
          {labels.paletteTitle}
        </h2>
        <div className="console-palette-field">
          <ConsoleIcon name="search" />
          <input
            ref={input}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${uid}-opt-${active}` : undefined}
            aria-label={labels.paletteTitle}
            placeholder={labels.palettePlaceholder}
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setCursor(0);
            }}
            className="console-palette-input"
          />
          <button type="button" onClick={onClose} className="console-icon-button" aria-label={labels.paletteClose} title={labels.paletteClose}>
            <ConsoleIcon name="close" />
          </button>
        </div>

        <ul ref={list} id={listId} role="listbox" aria-label={labels.paletteTitle} className="console-palette-list">
          {sections.map((section, n) => (
            <li key={section.id} role="presentation">
              <p id={`${uid}-${section.id}`} className="console-palette-heading">
                {section.label}
              </p>
              <ul role="group" aria-labelledby={`${uid}-${section.id}`} className="m-0 list-none p-0">
                {section.entries.map((entry, j) => {
                  const i = starts[n]! + j;
                  return (
                    <li
                      key={entry.id}
                      id={`${uid}-opt-${i}`}
                      role="option"
                      aria-selected={i === active}
                      data-index={i}
                      onMouseMove={() => setCursor(i)}
                      onClick={() => go(entry)}
                      className="console-palette-option"
                    >
                      <ConsoleIcon name={entry.icon} />
                      <span className="min-w-0 flex-1 truncate">{entry.title}</span>
                      {entry.subtitle ? <span className="console-palette-sub">{entry.subtitle}</span> : null}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>

        <p role="status" className={flat.length === 0 && !loading ? "console-palette-empty" : "visually-hidden"}>
          {loading ? labels.paletteLoading : flat.length === 0 ? fill(labels.paletteEmpty, { query: trimmed }) : fill(labels.paletteCount, { count: flat.length })}
        </p>
        <p className="console-palette-keys" aria-hidden="true">
          {labels.paletteKeys}
        </p>
      </div>
    </div>
  );
}
