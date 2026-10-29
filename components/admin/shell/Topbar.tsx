"use client";

import { useState, useSyncExternalStore } from "react";
import { AdminLanguageSwitch } from "@/components/admin/AdminLanguageSwitch";
import { ConsoleIcon } from "@/components/admin/icons";
import type { Locale } from "@/lib/i18n/config";
import type { ThemeChoice } from "@/lib/theme/config";
import { AccountMenu } from "./AccountMenu";
import { CommandPalette } from "./CommandPalette";
import { useConsoleNav, useShell } from "./ShellContext";
import { ThemeMenu } from "./ThemeMenu";

export interface TopbarProps {
  locale: Locale;
  theme: ThemeChoice;
  user: { name: string; email: string; roles: string[] };
  /** Passed to the command palette for live results. */
  searchEndpoint?: string;
}

const noSubscribe = () => () => {};
function useIsApple(): boolean {
  return useSyncExternalStore(
    noSubscribe,
    () => /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent),
    () => false,
  );
}

export function Topbar({ locale, theme, user, searchEndpoint }: TopbarProps) {
  const { nav, labels } = useConsoleNav();
  const { openDrawer, menuButtonRef } = useShell();
  const [paletteOpen, setPaletteOpen] = useState(false);
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
        <AdminLanguageSwitch locale={locale} />
        <ThemeMenu current={theme} labels={labels} />
        <AccountMenu name={user.name} email={user.email} roles={user.roles} labels={labels} />
      </div>

      <CommandPalette nav={nav} labels={labels} open={paletteOpen} onOpenChange={setPaletteOpen} searchEndpoint={searchEndpoint} />
    </header>
  );
}
