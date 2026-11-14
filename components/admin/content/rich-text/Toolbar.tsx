"use client";

import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import type { ConsoleIconName } from "@/components/admin/icons";
import { IconButton } from "./IconButton";
import { Menu, type MenuItem } from "./Menu";

export interface ToolbarAction {
  id: string;
  label: string;
  icon: ConsoleIconName;
  /** Already formatted, for example "Ctrl+B". */
  shortcut?: string;
  pressed?: boolean;
  disabled?: boolean;
  /** A rule above this action when it is listed in a menu. */
  separator?: boolean;
  run: () => void;
}

export type ToolbarGroup =
  | { id: string; kind: "buttons"; label: string; actions: ToolbarAction[] }
  | {
      id: string;
      kind: "menu";
      label: string;
      triggerIcon: ConsoleIconName;
      /** Visible text beside the trigger icon. */
      triggerText?: string;
      radio?: boolean;
      /** Approximate width in px, for deciding what fits. */
      width: number;
      actions: ToolbarAction[];
    };

const BUTTON = 32;
const GAP = 2;
const GROUP = 13;

const widthOf = (group: ToolbarGroup) => (group.kind === "buttons" ? group.actions.length * BUTTON + (group.actions.length - 1) * GAP + GROUP : group.width + GROUP);

const label = (a: ToolbarAction) => (a.shortcut ? `${a.label} (${a.shortcut})` : a.label);

function toItems(actions: ToolbarAction[], radio: boolean): MenuItem[] {
  return actions.map((a) => ({
    id: a.id,
    label: a.label,
    icon: a.icon,
    shortcut: a.shortcut,
    radio,
    checked: radio ? (a.pressed ?? false) : a.pressed,
    disabled: a.disabled,
    separator: a.separator,
    run: a.run,
  }));
}

interface ToolbarProps {
  groups: ToolbarGroup[];
  label: string;
  controls: string;
  moreLabel: string;
  onAfterMenu: () => void;
}

/**
 * Icon toolbar in priority order. Groups that do not fit move, whole, into a
 * "More" menu at the end, so nothing wraps and nothing is lost. One tab stop;
 * Left, Right, Home and End move between the buttons.
 */
export function Toolbar({ groups, label: toolbarLabel, controls, moreLabel, onAfterMenu }: ToolbarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth > 0 ? el.clientWidth - 16 : null);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  let shown = groups.length;
  if (width !== null) {
    const total = groups.reduce((sum, g) => sum + widthOf(g), 0);
    if (total > width) {
      let used = BUTTON + GROUP;
      shown = 0;
      for (const g of groups) {
        if (used + widthOf(g) > width) break;
        used += widthOf(g);
        shown++;
      }
    }
  }
  const visible = groups.slice(0, shown);
  const hidden = groups.slice(shown);
  const overflow: MenuItem[] = hidden.flatMap((g, gi) =>
    toItems(g.actions, g.kind === "menu" && Boolean(g.radio)).map((item, i) => ({ ...item, separator: i === 0 && gi > 0 ? true : item.separator })),
  );

  useLayoutEffect(() => {
    const buttons = [...(ref.current?.querySelectorAll<HTMLElement>("[data-tb]") ?? [])];
    const current = buttons.find((b) => b.tabIndex === 0 && !(b as HTMLButtonElement).disabled) ?? buttons.find((b) => !(b as HTMLButtonElement).disabled);
    for (const b of buttons) b.tabIndex = b === current ? 0 : -1;
  });

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest('[role="menu"]')) return;
    const keys: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, Home: -Infinity, End: Infinity };
    if (!(event.key in keys)) return;
    const buttons = [...(ref.current?.querySelectorAll<HTMLElement>("[data-tb]") ?? [])].filter((b) => !(b as HTMLButtonElement).disabled);
    const at = buttons.indexOf(event.target as HTMLElement);
    if (at < 0) return;
    event.preventDefault();
    const step = keys[event.key]!;
    const next = Number.isFinite(step) ? (at + step + buttons.length) % buttons.length : step < 0 ? 0 : buttons.length - 1;
    for (const b of buttons) b.tabIndex = -1;
    buttons[next]!.tabIndex = 0;
    buttons[next]!.focus();
  }

  return (
    <div
      ref={ref}
      role="toolbar"
      aria-label={toolbarLabel}
      aria-controls={controls}
      onKeyDown={onKeyDown}
      className="flex items-center gap-[var(--space-1)] border-b border-line bg-surface-alt p-[var(--space-2)]"
    >
      {visible.map((group, i) => (
        <div key={group.id} role="group" aria-label={group.label} className={`flex items-center gap-[2px] ${i > 0 ? "ml-[var(--space-1)] border-l border-line-strong pl-[var(--space-2)]" : ""}`}>
          {group.kind === "buttons" ? (
            group.actions.map((action) => (
              <IconButton key={action.id} tb icon={action.icon} label={label(action)} pressed={action.pressed} disabled={action.disabled} onClick={action.run} />
            ))
          ) : (
            <Menu
              tb
              label={group.label}
              triggerLabel={group.label}
              icon={group.triggerIcon}
              items={toItems(group.actions, Boolean(group.radio))}
              onAfterRun={onAfterMenu}
            >
              {group.triggerText ? <span className="text-sm">{group.triggerText}</span> : null}
            </Menu>
          )}
        </div>
      ))}
      {overflow.length > 0 ? (
        <div className="ml-auto pl-[var(--space-1)]">
          <Menu tb label={moreLabel} triggerLabel={moreLabel} icon="more" align="end" items={overflow} onAfterRun={onAfterMenu} />
        </div>
      ) : null}
    </div>
  );
}
