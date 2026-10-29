"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import type { ResolvedNav } from "@/lib/admin/nav-match";
import type { ShellLabels } from "./labels";
import { useStoredString } from "./useStoredString";

const SIDEBAR_KEY = "trytpc:console:sidebar";

interface NavValue {
  nav: ResolvedNav;
  labels: ShellLabels;
}

interface ShellValue {
  collapsed: boolean;
  toggleCollapsed: () => void;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  /** The mobile menu button, so the drawer can hand focus back to it. */
  menuButtonRef: RefObject<HTMLButtonElement | null>;
}

const NavContext = createContext<NavValue | null>(null);
const ShellContext = createContext<ShellValue | null>(null);

/** The resolved navigation and shell strings. Throws outside `ConsoleShell`. */
export function useConsoleNav(): NavValue {
  const value = useContext(NavContext);
  if (!value) throw new Error("useConsoleNav must be used inside ConsoleShell");
  return value;
}

/** Like `useConsoleNav` but null outside the shell (the signed-out layout has no nav). */
export function useOptionalConsoleNav(): NavValue | null {
  return useContext(NavContext);
}

export function useShell(): ShellValue {
  const value = useContext(ShellContext);
  if (!value) throw new Error("useShell must be used inside ConsoleShell");
  return value;
}

/** The grid that holds sidebar, top bar and main, plus the collapsed and drawer state they share. */
export function ShellFrame({ nav, labels, children }: { nav: ResolvedNav; labels: ShellLabels; children: ReactNode }) {
  const [stored, setStored] = useStoredString(SIDEBAR_KEY);
  const collapsed = stored === "collapsed";
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const toggleCollapsed = useCallback(() => setStored(collapsed ? "expanded" : "collapsed"), [collapsed, setStored]);
  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const shell = useMemo(
    () => ({ collapsed, toggleCollapsed, drawerOpen, openDrawer, closeDrawer, menuButtonRef }),
    [collapsed, toggleCollapsed, drawerOpen, openDrawer, closeDrawer],
  );
  const navValue = useMemo(() => ({ nav, labels }), [nav, labels]);

  return (
    <NavContext.Provider value={navValue}>
      <ShellContext.Provider value={shell}>
        <div className="console-frame" data-collapsed={collapsed} data-drawer={drawerOpen}>
          {children}
          <div className="console-overlay" aria-hidden="true" onClick={closeDrawer} />
        </div>
      </ShellContext.Provider>
    </NavContext.Provider>
  );
}
