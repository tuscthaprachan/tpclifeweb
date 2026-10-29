"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ConsoleIcon, type ConsoleIconName } from "@/components/admin/icons";

interface PopoverProps {
  /** Accessible name of the trigger button. */
  label: string;
  /** What the trigger shows: an icon name, or custom content such as initials. */
  trigger: ConsoleIconName | ReactNode;
  children: ReactNode;
  align?: "start" | "end";
  /** Extra classes for the panel. */
  panelClassName?: string;
}

/**
 * A disclosure popover: a button that shows a panel. Closes on Escape (focus
 * returns to the button), on a click outside, and when focus leaves.
 */
export function Popover({ label, trigger, children, align = "end", panelClassName = "" }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={root}
      className="relative"
      onBlur={(event) => {
        if (open && !event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={label}
        title={label}
        onClick={() => setOpen((v) => !v)}
        className="console-icon-button"
      >
        {typeof trigger === "string" ? <ConsoleIcon name={trigger as ConsoleIconName} /> : trigger}
      </button>
      <div
        id={panelId}
        hidden={!open}
        className={`console-popover ${align === "end" ? "console-popover-end" : "console-popover-start"} ${panelClassName}`}
      >
        {children}
      </div>
    </div>
  );
}
