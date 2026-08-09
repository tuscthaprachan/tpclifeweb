"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cx } from "./cx";

export interface TabItem {
  id: string;
  label: ReactNode;
  panel: ReactNode;
}

interface TabsProps {
  items: TabItem[];
  /**
   * The tablist's accessible name. There is no visible label slot in the
   * WAI-ARIA tabs pattern itself, which is the one place in this library an
   * aria-label is the standard approach rather than a shortcut around one.
   */
  label: string;
  defaultTabId?: string;
  className?: string;
}

/** Roving tabindex: only the active tab is in the Tab order, arrow keys move the ARIA "tab" selection (WAI-ARIA APG tabs pattern). */
export function Tabs({ items, label, defaultTabId, className }: TabsProps) {
  const baseId = useId();
  const firstItem = items[0];
  const [active, setActive] = useState(defaultTabId ?? firstItem?.id ?? "");
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  function focusTab(id: string) {
    setActive(id);
    tabRefs.current[id]?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (items.length === 0) return;
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % items.length;
    else if (event.key === "ArrowLeft") nextIndex = (index - 1 + items.length) % items.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = items.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    const next = items[nextIndex];
    if (next) focusTab(next.id);
  }

  return (
    <div className={className}>
      <div role="tablist" aria-label={label} className="flex flex-wrap gap-[var(--space-2)] border-b border-line">
        {items.map((item, index) => {
          const selected = item.id === active;
          return (
            <button
              key={item.id}
              ref={(node) => {
                tabRefs.current[item.id] = node;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${item.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${item.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(item.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={cx(
                "min-h-[var(--target-min)] border-b-[var(--border-width-thick)] px-[var(--space-3)] py-[var(--space-2)] text-base",
                selected ? "border-action font-semibold text-action" : "border-transparent font-medium text-ink-600 hover:text-ink-900",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          role="tabpanel"
          id={`${baseId}-panel-${item.id}`}
          aria-labelledby={`${baseId}-tab-${item.id}`}
          hidden={item.id !== active}
          tabIndex={0}
          className="pt-[var(--space-4)]"
        >
          {item.panel}
        </div>
      ))}
    </div>
  );
}
