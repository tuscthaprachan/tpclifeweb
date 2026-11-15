"use client";

import Link from "next/link";
import { useCallback, useSyncExternalStore } from "react";
import { AdminLanguageSwitch } from "@/components/admin/AdminLanguageSwitch";
import { ConsoleIcon } from "@/components/admin/icons";
import type { GoShortcut } from "@/lib/admin/shortcuts";
import type { Locale } from "@/lib/i18n/config";
import type { ThemeChoice } from "@/lib/theme/config";
import { AccountMenu } from "./AccountMenu";
import { CommandPalette } from "./CommandPalette";
import { useConsoleNav, useShell } from "./ShellContext";
import { ShortcutKeys, ShortcutsDialog } from "./Shortcuts";
import { ThemeMenu } from "./ThemeMenu";

export interface TopbarProps {
  locale: Locale;
  theme: ThemeChoice;
  user: { name: string; email: string; roles: string[] };
  /** The g-prefix pages this person can reach. */
  shortcuts: GoShortcut[];
  /** Passed to the command palette for live results. */
  searchEndpoint?: string;
  /** Unread notifications, counted on the server, and the bell's accessible name for that count. */
  notifications?: { unread: number; label: string };
}

const noSubscribe = () => () => {};
function useIsApple(): boolean {
  return useSyncExternalStore(
    noSubscribe,
    () => /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent),
    () => false,
  );
}

export function Topbar({ locale, theme, user, shortcuts, searchEndpoint, notifications }: TopbarProps) {
  const { nav, labels } = useConsoleNav();
  const { openDrawer, menuButtonRef, overlay, openOverlay, closeOverlay } = useShell();
  const paletteOpen = overlay === "palette";
  const helpOpen = overlay === "help";
  const setPaletteOpen = useCallback((open: boolean) => (open ? openOverlay("palette") : closeOverlay("palette")), [openOverlay, closeOverlay]);
  const openHelp = useCallback(() => openOverlay("help"), [openOverlay]);
  const closeHelp = useCallback(() => closeOverlay("help"), [closeOverlay]);
  const apple = useIsApple();

  return (
    <header className="console-topbar">
      <button ref={menuButtonRef} type="button" onClick={openDrawer} className="console-icon-button console-menu-button" aria-label={labels.openMenu} title={labels.openMenu}>
        <ConsoleIcon name="menu" />
      </button>

      <button type="button" onClick={() => setPaletteOpen(true)} className="console-search-trigger" aria-label={labels.searchHint} title={labels.searchHint}>
        <ConsoleIcon name="search" />
        <span className="console-search-text">{labels.search}</span>
        <kbd className="console-kbd" aria-hidden="true">
          {apple ? "⌘K" : "Ctrl K"}
        </kbd>
      </button>

      <div className="console-topbar-tools">
        {notifications ? (
          <Link href="/admin/notifications" className="console-icon-button gap-[var(--space-1)]" aria-label={notifications.label} title={notifications.label}>
            <ConsoleIcon name="notifications" />
            {notifications.unread > 0 ? <span className="text-sm font-semibold">{notifications.unread > 99 ? "99+" : notifications.unread}</span> : null}
          </Link>
        ) : null}
        <AdminLanguageSwitch locale={locale} />
        <ThemeMenu current={theme} labels={labels} />
        <AccountMenu name={user.name} email={user.email} roles={user.roles} labels={labels} shortcuts={shortcuts} onShowShortcuts={openHelp} />
      </div>

      <CommandPalette nav={nav} labels={labels} locale={locale} shortcuts={shortcuts} onShowShortcuts={openHelp} open={paletteOpen} onOpenChange={setPaletteOpen} searchEndpoint={searchEndpoint} />
      <ShortcutKeys shortcuts={shortcuts} labels={labels} onHelp={openHelp} helpOpen={helpOpen} />
      <ShortcutsDialog open={helpOpen} onClose={closeHelp} shortcuts={shortcuts} labels={labels} apple={apple} />
    </header>
  );
}
