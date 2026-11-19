"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { ConsoleIcon } from "@/components/admin/icons";
import { lockScroll } from "@/components/admin/hooks/scroll-lock";
import { SiteLogo } from "@/components/layout/SiteLogo";
import { findActive, type ResolvedNavItem } from "@/lib/admin/nav-match";
import { useConsoleNav, useShell } from "./ShellContext";

const DESKTOP = "(min-width: 64rem)";
const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Persistent navigation on desktop, an off-canvas drawer below 64rem. On
 * desktop it can collapse to icons only. As a drawer it traps focus, closes on
 * Escape or a click on the overlay, and hands focus back to the menu button.
 */
export function Sidebar() {
  const { nav, labels } = useConsoleNav();
  const { collapsed, toggleCollapsed, drawerOpen, closeDrawer, menuButtonRef } = useShell();
  const pathname = usePathname();
  const currentId = findActive(nav.items, pathname)?.current?.id;
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!drawerOpen) return;
    const desktop = window.matchMedia(DESKTOP);
    if (desktop.matches) return;
    const root = panel.current;
    if (!root) return;
    const unlock = lockScroll();
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
      unlock();
      button?.focus();
    };
  }, [drawerOpen, closeDrawer, menuButtonRef]);

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
        <ul className="m-0 list-none p-0">
          {nav.items
            .filter((item) => !item.hidden)
            .map((item) => (
              <NavEntry key={item.id} item={item} currentId={currentId} onNavigate={closeDrawer} />
            ))}
        </ul>
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

function NavEntry({ item, currentId, onNavigate }: { item: ResolvedNavItem; currentId: string | undefined; onNavigate: () => void }) {
  const children = item.children.filter((child) => !child.hidden);
  return (
    <li>
      <NavLink item={item} currentId={currentId} onNavigate={onNavigate} />
      {children.length > 0 ? (
        <ul className="ms-[var(--space-4)] list-none p-0 lg:[.console-frame[data-collapsed=true]_&]:ms-0">
          {children.map((child) => (
            <li key={child.id}>
              <NavLink item={child} currentId={currentId} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function NavLink({ item, currentId, onNavigate }: { item: ResolvedNavItem; currentId: string | undefined; onNavigate: () => void }) {
  return (
    <Link href={item.href} prefetch={false} onClick={onNavigate} aria-current={item.id === currentId ? "page" : undefined} title={item.label} className="console-nav-link">
      <ConsoleIcon name={item.icon} />
      <span className="console-label">{item.label}</span>
    </Link>
  );
}
