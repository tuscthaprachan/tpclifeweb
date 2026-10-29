"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef } from "react";
import { ConsoleIcon } from "@/components/admin/icons";
import { SiteLogo } from "@/components/layout/SiteLogo";
import { findActive, type ResolvedNavGroup } from "@/lib/admin/nav-match";
import { useConsoleNav, useShell } from "./ShellContext";
import { useStoredString } from "./useStoredString";

const GROUPS_KEY = "trytpc:console:groups-closed";
const DESKTOP = "(min-width: 64rem)";
const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

function parseClosed(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Persistent navigation on desktop, an off-canvas drawer below 64rem. On
 * desktop it can collapse to icons only. As a drawer it traps focus, closes on
 * Escape or a click on the overlay, and hands focus back to the menu button.
 */
export function Sidebar() {
  const { nav, labels } = useConsoleNav();
  const { collapsed, toggleCollapsed, drawerOpen, closeDrawer, menuButtonRef } = useShell();
  const pathname = usePathname();
  const active = findActive(nav.groups, pathname);
  const [closedRaw, setClosedRaw] = useStoredString(GROUPS_KEY);
  const closedGroups = parseClosed(closedRaw);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!drawerOpen) return;
    const desktop = window.matchMedia(DESKTOP);
    if (desktop.matches) return;
    const root = panel.current;
    if (!root) return;
    const html = document.documentElement;
    const previousOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    root.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDrawer();
        return;
      }
      if (event.key !== "Tab" || !root) return;
      const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (!root.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      }
    }
    function onResize(event: MediaQueryListEvent) {
      if (event.matches) closeDrawer();
    }
    document.addEventListener("keydown", onKey);
    desktop.addEventListener("change", onResize);
    const button = menuButtonRef.current;
    return () => {
      document.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onResize);
      html.style.overflow = previousOverflow;
      button?.focus();
    };
  }, [drawerOpen, closeDrawer, menuButtonRef]);

  function toggleGroup(id: string) {
    const next = closedGroups.includes(id) ? closedGroups.filter((g) => g !== id) : [...closedGroups, id];
    setClosedRaw(JSON.stringify(next));
  }

  return (
    <div ref={panel} className="console-sidebar">
      <div className="console-sidebar-head">
        <Link href="/admin" className="console-brand">
          <SiteLogo size={28} priority />
          <span className="console-label console-brand-text">
            <span className="block font-semibold leading-tight">{labels.serviceName}</span>
            <span className="block text-sm leading-tight text-ink-600">{labels.consoleName}</span>
          </span>
        </Link>
        <button type="button" onClick={closeDrawer} className="console-icon-button console-drawer-close" aria-label={labels.closeMenu} title={labels.closeMenu}>
          <ConsoleIcon name="close" />
        </button>
      </div>

      <nav aria-label={labels.nav} className="console-nav">
        {nav.groups.map((group) => (
          <NavGroup
            key={group.id}
            group={group}
            open={!closedGroups.includes(group.id)}
            onToggle={() => toggleGroup(group.id)}
            activeId={active?.item.id}
            onNavigate={closeDrawer}
          />
        ))}
      </nav>

      <div className="console-sidebar-foot">
        <button type="button" onClick={toggleCollapsed} className="console-nav-link console-collapse" title={collapsed ? labels.expand : labels.collapse}>
          <ConsoleIcon name={collapsed ? "expand" : "collapse"} />
          <span className="console-label">{collapsed ? labels.expand : labels.collapse}</span>
        </button>
        <p className="console-label console-note">{labels.notIndexed}</p>
      </div>
    </div>
  );
}

function NavGroup({
  group,
  open,
  onToggle,
  activeId,
  onNavigate,
}: {
  group: ResolvedNavGroup;
  open: boolean;
  onToggle: () => void;
  activeId: string | undefined;
  onNavigate: () => void;
}) {
  const listId = useId();
  return (
    <section className="console-group">
      <h2 className="console-group-heading">
        <button type="button" aria-expanded={open} aria-controls={listId} onClick={onToggle} className="console-group-button">
          <span>{group.label}</span>
          <ConsoleIcon name={open ? "chevronDown" : "chevronRight"} size={14} />
        </button>
      </h2>
      <ul id={listId} hidden={!open} className="console-group-list">
        {group.items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              prefetch={false}
              onClick={onNavigate}
              aria-current={item.id === activeId ? "page" : undefined}
              title={item.label}
              className="console-nav-link"
            >
              <ConsoleIcon name={item.icon} />
              <span className="console-label">{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
