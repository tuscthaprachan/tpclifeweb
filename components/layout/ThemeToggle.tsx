/**
 * Light / Dark / System theme toggle.
 *
 * Modelled as a group of three mutually exclusive submit buttons rather than
 * a native radio group. A native `<input type="radio">` set needs a single
 * `<form>` to submit together, but the no-JavaScript baseline here is "click
 * a choice, it takes effect immediately" (matching LanguageToggle, a plain
 * link one click away), not "pick a radio, then find a separate submit
 * button". Three tiny standalone forms, one per choice, get that same
 * one-click behaviour with real HTML: each is a `<button type="submit">`
 * inside its own `method="get"` form pointed at `/api/theme`, which is
 * indistinguishable from a link in what it does. `aria-current="true"` marks
 * the active choice, the same attribute `ServiceNavigation` uses for "you
 * are on this page", because a theme choice is exactly that kind of state:
 * one of a small fixed set, currently selected, not a toggle that flips on
 * a single control (which is what `aria-pressed` is for).
 *
 * Baseline (JavaScript off): clicking a button submits its form to
 * `/api/theme`, a route handler that sets `THEME_COOKIE` and 303-redirects
 * back to `redirectTo` (the current path, carried as a hidden field). The
 * next response has `data-theme` stamped on `<html>` server-side by
 * `app/[locale]/layout.tsx`, so the new theme is there from first paint,
 * no flash.
 *
 * Enhancement (JavaScript on): `onClick` calls `preventDefault` and applies
 * the choice on the client instead, an instant switch with no navigation at
 * all. It writes the same cookie by hand (mirroring
 * `LanguageToggle`'s `document.cookie` write for `LOCALE_COOKIE`) and flips
 * `data-theme` / `color-scheme` on `<html>` directly, then broadcasts a
 * `CustomEvent` so every mounted instance of this component (there are two:
 * the desktop header and the mobile disclosure panel) reflects the change
 * together, since both can be in the DOM at once even though only one is
 * visible at a given viewport width.
 */

"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckIcon } from "@/components/ui/icons";
import { cx } from "@/components/ui/cx";
import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { THEME_CHOICES, THEME_COOKIE, THEME_COOKIE_MAX_AGE, type ThemeChoice } from "@/lib/theme/config";

const THEME_LABEL_KEY: Record<ThemeChoice, "themeLight" | "themeDark" | "themeSystem"> = {
  light: "themeLight",
  dark: "themeDark",
  system: "themeSystem",
};

const THEME_CHANGE_EVENT = "tpclife:theme-change";

function applyThemeOnClient(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === "system") {
    root.removeAttribute("data-theme");
    root.style.colorScheme = "light dark";
    // Expiring the cookie (max-age=0), not writing "system": the stored
    // cookie's only job is to force a theme, so the honest way to represent
    // "follow the system" is no cookie at all. See lib/theme/config.ts.
    document.cookie = `${THEME_COOKIE}=; path=/; max-age=0; samesite=lax`;
  } else {
    root.setAttribute("data-theme", choice);
    root.style.colorScheme = choice;
    document.cookie = `${THEME_COOKIE}=${choice}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; samesite=lax`;
  }
  document.dispatchEvent(new CustomEvent<ThemeChoice>(THEME_CHANGE_EVENT, { detail: choice }));
}

export function ThemeToggle({
  locale,
  current,
  className = "",
}: {
  locale: Locale;
  /** The theme resolved server-side (from the cookie, or "system" if absent), so first paint already matches. */
  current: ThemeChoice;
  className?: string;
}) {
  const pathname = usePathname();
  const [active, setActive] = useState(current);

  useEffect(() => {
    function onThemeChange(event: Event) {
      setActive((event as CustomEvent<ThemeChoice>).detail);
    }
    document.addEventListener(THEME_CHANGE_EVENT, onThemeChange);
    return () => document.removeEventListener(THEME_CHANGE_EVENT, onThemeChange);
  }, []);

  return (
    <div role="group" aria-label={UI.theme[locale]} className={cx("flex flex-wrap items-center gap-2", className)}>
      {THEME_CHOICES.map((choice) => {
        const selected = active === choice;
        return (
          <form key={choice} action="/api/theme" method="get">
            <input type="hidden" name="redirectTo" value={pathname} />
            <button
              type="submit"
              name="value"
              value={choice}
              aria-current={selected ? "true" : undefined}
              onClick={(event) => {
                event.preventDefault();
                applyThemeOnClient(choice);
              }}
              className={cx(
                "inline-flex min-h-[var(--target-min)] min-w-[var(--target-min)] items-center gap-[var(--space-1)]",
                "rounded-control border px-[var(--space-3)] py-[var(--space-1)] text-sm font-medium no-underline",
                /*
                 * 1.4.11 Non-text Contrast: the border colour change between
                 * states must itself clear 3:1 against the surrounding
                 * surface, which --line-strong and --colour-action both do
                 * (see tokens.css). 1.4.1 Use of Colour: the selected state
                 * is never colour alone, it also gets a checkmark icon and a
                 * bold aria-current, so it survives a colour-blind reading
                 * and a screen reader equally.
                 */
                selected
                  ? "border-action bg-surface-alt text-action"
                  : "border-line-strong bg-surface text-ink-900 hover:bg-surface-alt hover:text-ink-900",
              )}
            >
              {selected ? <CheckIcon /> : null}
              {UI[THEME_LABEL_KEY[choice]][locale]}
            </button>
          </form>
        );
      })}
    </div>
  );
}
