"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useReducer, useRef, useState } from "react";
import { signOutAction, setAdminLocale } from "@/app/admin/actions";
import { ConsoleIcon, type ConsoleIconName } from "@/components/admin/icons";
import { lockScroll } from "@/components/admin/hooks/scroll-lock";
import { applyThemeOnClient } from "@/components/layout/ThemeToggle";
import type { ResolvedNav, ResolvedNavItem } from "@/lib/admin/nav-match";
import type { GoShortcut } from "@/lib/admin/shortcuts";
import { LOCALE_LABEL, OTHER_LOCALE, type Locale } from "@/lib/i18n/config";
import { fill } from "./fill";
import type { ShellLabels } from "./labels";
import { fuzzyScore, initialRemote, MIN_REMOTE_CHARS, remoteReducer, remoteView } from "./palette-machine";

export { fuzzyScore };

/** One row of the palette. */
interface Entry {
  id: string;
  title: string;
  subtitle?: string;
  href?: string;
  /** Runs instead of navigating. */
  run?: () => void;
  /** The keys that do the same thing, shown at the end of the row. */
  hint?: string;
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
    "paletteTitle" | "palettePlaceholder" | "paletteGoTo" | "paletteCreate" | "paletteResults" | "paletteEmpty" | "paletteLoading" | "paletteError" | "paletteCount" | "paletteKeys" | "paletteClose" | "paletteActions" | "paletteMyCases" | "paletteToggleTheme" | "paletteSwitchLanguage" | "paletteSignOut" | "paletteShortcuts"
  >;
  locale: Locale;
  shortcuts: GoShortcut[];
  onShowShortcuts: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Optional URL for live results. The palette fetches `${searchEndpoint}?q=<query>`
   * (debounced, from two characters) and expects `{ results: PaletteSearchResult[] }`,
   * listed under one heading per `group`. Omit it and only pages and actions are searched.
   */
  searchEndpoint?: string;
}

const DEBOUNCE_MS = 200;

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
export function CommandPalette({ nav, labels, locale, shortcuts, onShowShortcuts, open, onOpenChange, searchEndpoint }: CommandPaletteProps) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const combo = (event.key === "k" || event.key === "K") && (event.metaKey || event.ctrlKey);
      const slash = event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey && !isTypingTarget(event.target);
      if (event.defaultPrevented) return;
      if (combo || slash) {
        event.preventDefault();
        onOpenChange(true);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onOpenChange]);

  if (!open) return null;
  return <PaletteDialog nav={nav} labels={labels} locale={locale} shortcuts={shortcuts} onShowShortcuts={onShowShortcuts} onClose={() => onOpenChange(false)} searchEndpoint={searchEndpoint} />;
}

function PaletteDialog({ nav, labels, locale, shortcuts, onShowShortcuts, onClose, searchEndpoint }: Omit<CommandPaletteProps, "open" | "onOpenChange"> & { onClose: () => void }) {
  const router = useRouter();
  const uid = useId();
  const listId = `${uid}-list`;
  const titleId = `${uid}-title`;
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [remote, dispatchRemote] = useReducer(remoteReducer<PaletteSearchResult>, undefined, initialRemote<PaletteSearchResult>);

  const pages = useMemo<Entry[]>(() => {
    const hintFor = new Map(shortcuts.map((s) => [s.href, `g ${s.key}`]));
    const seen = new Set<string>();
    const entry = (item: ResolvedNavItem, subtitle?: string): Entry => {
      const hint = seen.has(item.href) ? undefined : hintFor.get(item.href);
      seen.add(item.href);
      return { id: item.id, title: item.label, subtitle, href: item.href, icon: item.icon, hint };
    };
    return nav.items.flatMap((item) => {
      const sameAsChild = item.children.some((c) => c.href === item.href);
      const children = item.children.map((c) => entry(c, item.label));
      return sameAsChild ? children : [entry(item), ...children];
    });
  }, [nav, shortcuts]);
  const actions = useMemo<Entry[]>(() => {
    const target = OTHER_LOCALE[locale];
    const out: Entry[] = [];
    if (nav.items.some((i) => i.children.some((c) => c.id === "inbox"))) out.push({ id: "action-my-cases", title: labels.paletteMyCases, href: "/admin/cases?assignee=me&open=1", icon: "cases" });
    out.push(
      {
        id: "action-theme",
        title: labels.paletteToggleTheme,
        icon: "theme",
        run: () => {
          const root = document.documentElement;
          const explicit = root.getAttribute("data-theme");
          const dark = explicit ? explicit === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
          applyThemeOnClient(dark ? "light" : "dark");
        },
      },
      {
        id: "action-language",
        title: fill(labels.paletteSwitchLanguage, { language: LOCALE_LABEL[target] }),
        icon: "language",
        run: () => {
          const data = new FormData();
          data.set("locale", target);
          data.set("returnTo", window.location.pathname + window.location.search);
          void setAdminLocale(data);
        },
      },
      { id: "action-shortcuts", title: labels.paletteShortcuts, icon: "keyboard", hint: "?", run: onShowShortcuts },
      { id: "action-sign-out", title: labels.paletteSignOut, icon: "signOut", run: () => void signOutAction() },
    );
    return out;
  }, [nav, labels, locale, onShowShortcuts]);
  const creates = useMemo<Entry[]>(
    () => nav.quickCreate.map((q) => ({ id: q.id, title: q.label, subtitle: q.groupLabel, href: q.href, icon: q.icon })),
    [nav],
  );

  const trimmed = query.trim();
  const hasEndpoint = Boolean(searchEndpoint);
  const remoteNow = useMemo(() => remoteView(remote, trimmed, hasEndpoint), [remote, trimmed, hasEndpoint]);
  const loading = remoteNow.status === "loading";
  const failed = remoteNow.status === "error";

  const sections = useMemo<Section[]>(() => {
    const out: Section[] = [
      { id: "pages", label: labels.paletteGoTo, entries: filterEntries(pages, query) },
      { id: "create", label: labels.paletteCreate, entries: filterEntries(creates, query) },
      { id: "actions", label: labels.paletteActions, entries: filterEntries(actions, query) },
    ];
    if (remoteNow.status === "ok") {
      const byGroup = new Map<string, Entry[]>();
      for (const r of remoteNow.results) {
        const entry: Entry = { id: `r-${r.id}`, title: r.title, subtitle: r.subtitle, href: r.href, icon: r.icon };
        byGroup.set(r.group, [...(byGroup.get(r.group) ?? []), entry]);
      }
      for (const [group, entries] of byGroup) out.push({ id: `remote-${group}`, label: group || labels.paletteResults, entries });
    }
    return out.filter((s) => s.entries.length > 0);
  }, [pages, creates, actions, query, labels, remoteNow]);

  const flat = useMemo(() => sections.flatMap((s) => s.entries), [sections]);
  const active = flat.length === 0 ? -1 : Math.min(cursor, flat.length - 1);

  useEffect(() => {
    if (!searchEndpoint || trimmed.length < MIN_REMOTE_CHARS) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      dispatchRemote({ type: "start", q: trimmed });
      try {
        const response = await fetch(`${searchEndpoint}?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal, headers: { accept: "application/json" } });
        if (!response.ok) throw new Error(String(response.status));
        const body = (await response.json()) as { results?: PaletteSearchResult[] };
        dispatchRemote({ type: "succeeded", q: trimmed, results: Array.isArray(body.results) ? body.results : [] });
      } catch {
        if (!controller.signal.aborted) dispatchRemote({ type: "failed", q: trimmed });
      }
    }, DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchEndpoint, trimmed]);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const unlock = lockScroll();
    input.current?.focus();
    return () => {
      unlock();
      previous?.focus();
    };
  }, []);

  useEffect(() => {
    if (active < 0) return;
    list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function go(entry: Entry) {
    onClose();
    if (entry.run) entry.run();
    else if (entry.href) router.push(entry.href);
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
                      {entry.hint ? (
                        <kbd className="console-kbd !m-0 !inline" aria-hidden="true">
                          {entry.hint}
                        </kbd>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>

        <p role="status" className={(flat.length === 0 && !loading) || failed ? "console-palette-empty" : "visually-hidden"}>
          {loading ? labels.paletteLoading : failed ? labels.paletteError : flat.length === 0 ? fill(labels.paletteEmpty, { query: trimmed }) : fill(labels.paletteCount, { count: flat.length })}
        </p>
        <p className="console-palette-keys" aria-hidden="true">
          {labels.paletteKeys}
        </p>
      </div>
    </div>
  );
}
