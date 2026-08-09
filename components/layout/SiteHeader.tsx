/**
 * The sticky service header: service name, primary navigation, language
 * toggle, search entry point, and the mobile disclosure menu.
 *
 * Two constraints shape this component:
 *
 * 1. 2.4.11 Focus Not Obscured. The header is sticky, so globals.css gives
 *    every focusable element `scroll-margin-top: var(--header-height)`. That
 *    variable has to reflect the header's REAL rendered height, which moves
 *    with the fluid type scale and after web fonts swap in, so it is
 *    measured with a ResizeObserver rather than hardcoded.
 * 2. Everything must work with JavaScript off. The mobile menu is a native
 *    `<details>/<summary>` disclosure: the browser opens and closes it with
 *    no script at all, and the links inside are ordinary `<a>` tags. The
 *    effect below only enhances it, adding `aria-expanded` / `aria-controls`
 *    and closing on Escape with focus returned to the button, none of which
 *    the page depends on to be navigable.
 */

"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { localePath, pick, type Locale, type LocaleString } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { NavItem } from "@/lib/sanity/types";
import { LanguageToggle } from "./LanguageToggle";
import { ServiceNavigation } from "./ServiceNavigation";
import { ShellContainer } from "./ShellContainer";

export function SiteHeader({
  locale,
  serviceName,
  navItems,
}: {
  locale: Locale;
  serviceName: LocaleString;
  navItems: NavItem[];
}) {
  const headerRef = useRef<HTMLElement>(null);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const setHeaderHeightVar = () => {
      document.documentElement.style.setProperty("--header-height", `${el.offsetHeight}px`);
    };
    setHeaderHeightVar();

    const observer = new ResizeObserver(setHeaderHeightVar);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || !detailsRef.current?.open) return;
      detailsRef.current.open = false;
      summaryRef.current?.focus();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const navLabel = UI.mainMenu[locale];

  return (
    <header ref={headerRef} className="sticky top-0 z-[var(--z-header)] border-b border-line bg-surface">
      <ShellContainer className="flex items-center justify-between gap-4 py-3">
        <Link
          href={localePath(locale, "/")}
          className="min-h-[var(--target-min)] text-lg font-semibold text-ink-900 no-underline"
        >
          {pick(serviceName, locale)}
        </Link>

        {/* Desktop: nav, search entry point and the language toggle, always
            in the DOM so they work with no JavaScript. Hidden below `sm` by
            CSS alone, not by script. */}
        <div className="hidden items-center gap-6 sm:flex">
          <ServiceNavigation locale={locale} items={navItems} label={navLabel} />
          <Link
            href={localePath(locale, "/search")}
            className="inline-flex min-h-[var(--target-min)] items-center text-sm font-medium text-ink-900 no-underline hover:text-action"
          >
            {UI.search[locale]}
          </Link>
          <LanguageToggle locale={locale} />
        </div>

        {/* Mobile: native disclosure. Works fully without JavaScript. */}
        <details ref={detailsRef} className="sm:hidden" onToggle={(event) => setOpen(event.currentTarget.open)}>
          <summary
            ref={summaryRef}
            aria-expanded={open}
            aria-controls={menuId}
            className="flex min-h-[var(--target-min)] cursor-pointer list-none items-center rounded-control px-3 py-2 text-sm font-medium text-ink-900 [&::-webkit-details-marker]:hidden"
          >
            {open ? UI.closeMenu[locale] : UI.openMenu[locale]}
          </summary>
          <div id={menuId} className="flex flex-col gap-4 pb-4 pt-2">
            <ServiceNavigation locale={locale} items={navItems} label={navLabel} />
            <Link
              href={localePath(locale, "/search")}
              className="inline-flex min-h-[var(--target-min)] items-center text-sm font-medium text-ink-900 no-underline hover:text-action"
            >
              {UI.search[locale]}
            </Link>
            <LanguageToggle locale={locale} />
          </div>
        </details>
      </ShellContainer>
    </header>
  );
}
