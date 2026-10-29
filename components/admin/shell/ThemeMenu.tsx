"use client";

import { useEffect, useState } from "react";
import { ConsoleIcon } from "@/components/admin/icons";
import { applyThemeOnClient, THEME_CHANGE_EVENT } from "@/components/layout/ThemeToggle";
import { THEME_CHOICES, type ThemeChoice } from "@/lib/theme/config";
import { Popover } from "./Popover";

export interface ThemeMenuLabels {
  display: string;
  theme: string;
  themeLight: string;
  themeDark: string;
  themeSystem: string;
}

const ICON = { light: "themeLight", dark: "themeDark", system: "themeSystem" } as const;

/** Compact theme picker for the console: one icon button, three choices. Needs JavaScript; the public site's toggle is the no-script one. */
export function ThemeMenu({ current, labels }: { current: ThemeChoice; labels: ThemeMenuLabels }) {
  const [active, setActive] = useState(current);

  useEffect(() => {
    function onChange(event: Event) {
      setActive((event as CustomEvent<ThemeChoice>).detail);
    }
    document.addEventListener(THEME_CHANGE_EVENT, onChange);
    return () => document.removeEventListener(THEME_CHANGE_EVENT, onChange);
  }, []);

  const name: Record<ThemeChoice, string> = { light: labels.themeLight, dark: labels.themeDark, system: labels.themeSystem };

  return (
    <Popover label={labels.display} trigger="theme" panelClassName="console-popover-compact">
      <div role="group" aria-label={labels.theme}>
        <p className="console-popover-title">{labels.theme}</p>
        <ul className="console-menu-list">
          {THEME_CHOICES.map((choice) => {
            const selected = active === choice;
            return (
              <li key={choice}>
                <button type="button" aria-current={selected ? "true" : undefined} onClick={() => applyThemeOnClient(choice)} className="console-menu-item">
                  <ConsoleIcon name={ICON[choice]} />
                  <span className="flex-1 text-left">{name[choice]}</span>
                  {selected ? <ConsoleIcon name="check" size={16} /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </Popover>
  );
}
