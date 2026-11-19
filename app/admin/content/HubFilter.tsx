"use client";

import { useState, useSyncExternalStore } from "react";
import { ConsoleIcon } from "@/components/admin/icons";

const subscribe = () => () => {};

export interface HubFilterLabels {
  label: string;
  hint: string;
  /** Has a `{count}` placeholder. */
  count: string;
  /** Has a `{query}` placeholder. */
  none: string;
}

function fill(template: string, values: Record<string, string | number>): string {
  return template
    .replace(/\{(\w+):([^|{}]*)\|([^|{}]*)\}/g, (_, key: string, one: string, other: string) => (values[key] === 1 ? one : other))
    .replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}

/**
 * Hides the hub's cards that do not match what is typed. The cards are
 * rendered by the server with their searchable text in `data-hub-text`, and
 * all of them show until this runs, so without JavaScript there is no box and
 * nothing is hidden.
 */
export function HubFilter({ targetId, labels }: { targetId: string; labels: HubFilterLabels }) {
  const enhanced = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState<number | null>(null);

  if (!enhanced) return null;

  function apply(value: string) {
    setQuery(value);
    const root = document.getElementById(targetId);
    if (!root) return;
    const needle = value.trim().toLowerCase();
    let count = 0;
    root.querySelectorAll<HTMLElement>("[data-hub-card]").forEach((card) => {
      const hit = needle === "" || (card.dataset.hubText ?? "").includes(needle);
      card.hidden = !hit;
      if (hit) count += 1;
    });
    root.querySelectorAll<HTMLElement>("[data-hub-section]").forEach((section) => {
      section.hidden = section.querySelector("[data-hub-card]:not([hidden])") === null;
    });
    setShown(needle === "" ? null : count);
  }

  const trimmed = query.trim();
  const status = shown === null ? "" : shown === 0 ? fill(labels.none, { query: trimmed }) : fill(labels.count, { count: shown });

  return (
    <div role="search" className="flex flex-col gap-[var(--space-1)]">
      <label htmlFor="hub-find" className="text-sm font-semibold">
        {labels.label}
      </label>
      <div className="relative max-w-[28rem]">
        <ConsoleIcon name="search" className="pointer-events-none absolute start-[var(--space-3)] top-1/2 -translate-y-1/2 text-ink-600" />
        <input
          id="hub-find"
          type="search"
          value={query}
          onChange={(event) => apply(event.target.value)}
          aria-describedby="hub-find-hint"
          autoComplete="off"
          className="min-h-[var(--target-min)] w-full rounded-control border border-line-strong bg-surface ps-[calc(var(--space-3)+1.75rem)] pe-[var(--space-3)] text-ink-900"
        />
      </div>
      <p id="hub-find-hint" className="m-0 text-sm text-ink-600">
        {labels.hint}
      </p>
      <p role="status" className={shown === 0 ? "m-0 text-ink-900" : "visually-hidden"}>
        {status}
      </p>
    </div>
  );
}
