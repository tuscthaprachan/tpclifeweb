"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ConsoleIcon, type ConsoleIconName } from "@/components/admin/icons";
import { ICON_BUTTON } from "./IconButton";

export interface MenuItem {
  id: string;
  label: string;
  icon?: ConsoleIconName;
  /** Shown at the end of the row, for example "Ctrl+B". */
  shortcut?: string;
  /** Makes the row a checkbox (or a radio with `radio`): `true` is chosen. Leave it out for a plain action. */
  checked?: boolean;
  radio?: boolean;
  disabled?: boolean;
  /** A rule above this row. */
  separator?: boolean;
  run: () => void;
}

interface MenuProps {
  /** Names the menu for assistive technology. */
  label: string;
  items: MenuItem[];
  /** What the trigger shows besides its icon. */
  children?: ReactNode;
  icon: ConsoleIconName;
  /** Tooltip and accessible name of the trigger. */
  triggerLabel: string;
  align?: "start" | "end";
  tb?: boolean;
  /** Where focus goes when a row has run (the editor, usually). */
  onAfterRun?: () => void;
}

const roleOf = (item: MenuItem) => (item.checked === undefined ? "menuitem" : item.radio ? "menuitemradio" : "menuitemcheckbox");

/**
 * A button that opens a menu: Enter, Space or ArrowDown opens it with focus on
 * the first (or chosen) row; arrows, Home, End and typing move; Enter and
 * Space act; Escape closes and returns to the button; Tab closes.
 */
export function Menu({ label, items, children, icon, triggerLabel, align = "start", tb, onAfterRun }: MenuProps) {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const focusOnOpen = useRef<"first" | "last" | "checked">("first");

  const rows = () => [...(listRef.current?.querySelectorAll<HTMLButtonElement>('[role^="menuitem"]:not(:disabled)') ?? [])];

  useEffect(() => {
    if (!open) return;
    const list = rows();
    const target =
      focusOnOpen.current === "last" ? list[list.length - 1] : focusOnOpen.current === "checked" ? (list.find((r) => r.getAttribute("aria-checked") === "true") ?? list[0]) : list[0];
    target?.focus();
    const away = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  function close(refocus: boolean) {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }

  function onTriggerKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      event.stopPropagation();
      focusOnOpen.current = event.key === "ArrowUp" ? "last" : "checked";
      setOpen(true);
    }
  }

  function onListKey(event: KeyboardEvent<HTMLDivElement>) {
    const list = rows();
    const index = list.indexOf(document.activeElement as HTMLButtonElement);
    const go = (i: number) => list[(i + list.length) % list.length]?.focus();
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        return go(index + 1);
      case "ArrowUp":
        event.preventDefault();
        return go(index - 1);
      case "Home":
        event.preventDefault();
        return list[0]?.focus();
      case "End":
        event.preventDefault();
        return list[list.length - 1]?.focus();
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        return close(true);
      case "Tab":
        return close(false);
      case "ArrowLeft":
      case "ArrowRight":
        event.stopPropagation();
        return;
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const typed = event.key.toLowerCase();
      const from = list.filter((_, i) => i > index).concat(list.filter((_, i) => i <= index));
      from.find((r) => r.textContent?.trim().toLowerCase().startsWith(typed))?.focus();
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        title={triggerLabel}
        aria-label={triggerLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? `${uid}-menu` : undefined}
        data-tb={tb ? "" : undefined}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          focusOnOpen.current = "checked";
          setOpen((v) => !v);
        }}
        onKeyDown={onTriggerKey}
        className={`${ICON_BUTTON} ${children ? "w-auto gap-[var(--space-1)] px-[var(--space-2)]" : "w-auto px-[var(--space-1)]"}`}
      >
        <ConsoleIcon name={icon} />
        {children}
        <ConsoleIcon name="chevronDown" size={14} />
      </button>
      {open ? (
        <div
          ref={listRef}
          id={`${uid}-menu`}
          role="menu"
          aria-label={label}
          onKeyDown={onListKey}
          className={`absolute top-full z-[var(--z-overlay)] mt-[var(--space-1)] flex max-h-[min(24rem,60vh)] min-w-[14rem] flex-col overflow-y-auto rounded-control border border-line-strong bg-surface-overlay p-[var(--space-1)] shadow-[var(--shadow-elevation)] ${
            align === "end" ? "right-0" : "left-0"
          }`}
        >
          {items.map((item) => (
            <div key={item.id} role="none" className={item.separator ? "mt-[var(--space-1)] border-t border-line pt-[var(--space-1)]" : undefined}>
              <button
                type="button"
                role={roleOf(item)}
                aria-checked={item.checked === undefined ? undefined : item.checked}
                disabled={item.disabled}
                tabIndex={-1}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  close(false);
                  item.run();
                  onAfterRun?.();
                }}
                className="flex min-h-[var(--target-min)] w-full items-center gap-[var(--space-2)] rounded-control px-[var(--space-2)] py-[var(--space-1)] text-left text-base text-ink-900 hover:bg-surface-sunk focus-visible:bg-surface-sunk disabled:cursor-not-allowed disabled:opacity-50"
              >
                {item.icon ? <ConsoleIcon name={item.icon} /> : <span className="size-[18px] shrink-0" aria-hidden="true" />}
                <span className="flex-1">{item.label}</span>
                {item.checked ? <ConsoleIcon name="check" /> : null}
                {item.shortcut ? <span className="text-sm text-ink-600">{item.shortcut}</span> : null}
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
