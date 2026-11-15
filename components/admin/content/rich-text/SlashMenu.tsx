"use client";

import { useEffect, useId, useState } from "react";
import { freeSpace } from "./viewport";
import { createPortal } from "react-dom";
import { ConsoleIcon } from "@/components/admin/icons";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import type { EditorBridge } from "./bridge";
import type { SlashItem } from "./slash";

interface Open {
  items: SlashItem[];
  active: number;
  rect: DOMRect | null;
  command: (item: SlashItem) => void;
}


/** The insert list that follows the caret. Keyboard: arrows move, Enter or Tab inserts, Escape closes (the editor keeps focus throughout). */
export function SlashMenu({ locale, bridge, onActiveChange, listId }: { locale: Locale; bridge: EditorBridge; onActiveChange: (id: string | null, listId: string | null) => void; listId: string }) {
  const uid = useId();
  const [open, setOpen] = useState<Open | null>(null);

  useEffect(() => {
    bridge.update({
      slash: {
      onStart: (p) => setOpen({ items: p.items, active: 0, rect: p.clientRect?.() ?? null, command: p.command }),
      onUpdate: (p) => setOpen((cur) => ({ items: p.items, active: Math.min(cur?.active ?? 0, Math.max(0, p.items.length - 1)), rect: p.clientRect?.() ?? cur?.rect ?? null, command: p.command })),
      onExit: () => setOpen(null),
      onKeyDown: (event) => {
        if (!open) return false;
        const n = open.items.length;
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          if (n === 0) return true;
          setOpen({ ...open, active: (open.active + (event.key === "ArrowDown" ? 1 : -1) + n) % n });
          return true;
        }
        if (event.key === "Enter" || event.key === "Tab") {
          const item = open.items[open.active];
          if (!item) return event.key === "Tab" ? false : true;
          open.command(item);
          return true;
        }
        return false;
      },
      },
    });
  }, [bridge, open]);

  const activeId = open && open.items[open.active] ? `${uid}-${open.items[open.active]!.id}` : null;
  useEffect(() => {
    onActiveChange(activeId, open ? listId : null);
  }, [activeId, open, listId, onActiveChange]);

  if (!open || typeof document === "undefined") return null;
  const top = (open.rect?.bottom ?? 0) + 4;
  const left = Math.max(8, Math.min(open.rect?.left ?? 0, window.innerWidth - 280));
  const space = freeSpace({ top: open.rect?.top ?? 0, bottom: open.rect?.bottom ?? 0 });
  const below = space.below - 4;
  const above = space.above - 4;
  const flip = below < 200 && above > below;
  const listMax = Math.max(96, Math.min(256, flip ? above : below));
  return createPortal(
    <div data-inert-exempt="" style={{ position: "fixed", ...(flip ? { bottom: window.innerHeight - (open.rect?.top ?? 0) + 4 } : { top }), left, zIndex: "var(--z-overlay)" }} className="w-[17rem] max-w-[calc(100vw-1rem)] rounded-control border border-line-strong bg-surface-overlay p-[var(--space-1)] shadow-[var(--shadow-elevation)]">
      <div id={listId} role="listbox" aria-label={a("edSlashLabel", locale)} style={{ maxHeight: listMax }} className="overflow-y-auto">
        {open.items.map((item, i) => (
          <div
            key={item.id}
            id={`${uid}-${item.id}`}
            role="option"
            aria-selected={i === open.active}
            onMouseDown={(event) => {
              event.preventDefault();
              open.command(item);
            }}
            ref={(el) => {
              if (el && i === open.active) el.scrollIntoView({ block: "nearest" });
            }}
            className={`flex min-h-[var(--target-min)] cursor-pointer items-center gap-[var(--space-2)] rounded-control px-[var(--space-2)] py-[var(--space-1)] text-ink-900 ${
              i === open.active ? "bg-action text-action-ink" : "hover:bg-surface-sunk"
            }`}
          >
            <ConsoleIcon name={item.icon} />
            <span>{item.label}</span>
          </div>
        ))}
        {open.items.length === 0 ? <p className="m-0 px-[var(--space-2)] py-[var(--space-2)] text-sm text-ink-600">{a("edSlashNone", locale)}</p> : null}
      </div>
      <p role="status" className="visually-hidden">
        {open.items.length === 0 ? a("edSlashNone", locale) : a("edSlashCount", locale, { count: open.items.length })}
      </p>
    </div>,
    document.body,
  );
}
