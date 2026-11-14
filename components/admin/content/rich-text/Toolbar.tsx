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
  /** When the bar is too narrow for everything, lower ranks stay visible first. */
  rank?: number;
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
      /** Like `ToolbarAction.rank`, for the whole menu. */
      rank?: number;
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

  type Unit = { group: ToolbarGroup; action?: ToolbarAction; rank: number; order: number; width: number };
  const units: Unit[] = groups.flatMap((g, gi): Unit[] =>
    g.kind === "menu" ? [{ group: g, rank: g.rank ?? 99, order: gi * 100, width: g.width }] : g.actions.map((action, ai) => ({ group: g, action, rank: action.rank ?? 99, order: gi * 100 + ai, width: BUTTON })),
  );
  const fullWidth = groups.reduce((sum, g) => sum + widthOf(g), 0);
  const compact = width !== null && fullWidth > width;
  const keep = new Set<Unit>();
  if (compact) {
    let used = BUTTON + 26 + GAP;
    for (const unit of [...units].sort((x, y) => x.rank - y.rank || x.order - y.order)) {
      if (used + unit.width + GAP > width) break;
      used += unit.width + GAP;
      keep.add(unit);
    }
  }
  const isShown = (unit: Unit) => !compact || keep.has(unit);
  const visible: { group: ToolbarGroup; actions: ToolbarAction[]; menu: boolean }[] = [];
  const hiddenByGroup: { group: ToolbarGroup; actions: ToolbarAction[] }[] = [];
  for (const g of groups) {
    const mine = units.filter((u) => u.group === g);
    const shownUnits = mine.filter(isShown);
    const shownActions = g.kind === "menu" ? g.actions : shownUnits.map((u) => u.action!);
    if (g.kind === "menu" ? shownUnits.length > 0 : shownActions.length > 0) visible.push({ group: g, actions: shownActions, menu: g.kind === "menu" });
    const hiddenActions = g.kind === "menu" ? (shownUnits.length > 0 ? [] : g.actions) : mine.filter((u) => !isShown(u)).map((u) => u.action!);
    if (hiddenActions.length > 0) hiddenByGroup.push({ group: g, actions: hiddenActions });
  }
  const overflow: MenuItem[] = hiddenByGroup.flatMap((h, gi) =>
    toItems(h.actions, h.group.kind === "menu" && Boolean(h.group.radio)).map((item, i) => ({ ...item, separator: i === 0 && gi > 0 ? true : item.separator })),
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
      {visible.map(({ group, actions }, i) => (
        <div
          key={group.id}
          role="group"
          aria-label={group.label}
          className={`flex items-center gap-[2px] ${i > 0 && !compact ? "ml-[var(--space-1)] border-l border-line-strong pl-[var(--space-2)]" : ""}`}
        >
          {group.kind === "buttons" ? (
            actions.map((action) => (
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
