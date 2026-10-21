/**
 * The sticky service header: service name, primary navigation, search entry
 * point, the language toggle, the theme toggle, and the mobile disclosure
 * menu.
 *
 * Three constraints shape this component:
 *
 * 1. 2.4.11 Focus Not Obscured. The header is sticky, so globals.css gives
 *    every focusable element `scroll-margin-top: var(--header-height)`. That
 *    variable has to reflect the header BAR's real rendered height, which
 *    moves with the fluid type scale and after web fonts swap in, so it is
 *    measured with a ResizeObserver rather than hardcoded. It deliberately
 *    measures only the always-visible bar (the ResizeObserver is attached to
 *    `<header>`, and the open mobile panel is positioned OUT of that
 *    element's normal flow, see point 3), so opening the mobile menu never
 *    inflates `--header-height` and pushes the rest of the page's scroll
 *    offsets around.
 * 2. Everything must work with JavaScript off. The mobile menu is a native
 *    `<details>/<summary>` disclosure: the browser opens and closes it with
 *    no script at all, and the links inside are ordinary `<a>` tags. The
 *    effect below only enhances it, adding `aria-expanded` / `aria-controls`
 *    and closing on Escape with focus returned to the button, none of which
 *    the page depends on to be navigable.
 * 3. The open mobile panel must be a full-width sheet below the header bar,
 *    not a narrow column squeezed beside the logo. `<details>` has to stay a
 *    flex ITEM of the logo/burger row so the burger sits in the right place
 *    when closed, but its content (the panel) must not be sized by that
 *    narrow flex item once open. The fix is ordinary CSS, not a different
 *    element: the panel is `position: absolute` and deliberately carries NO
 *    `position: relative` of its own on `<details>`, so the browser looks
 *    past both `<details>` (content-sized, narrow) and `<ShellContainer>`
 *    (padded, non-positioned) to the nearest positioned ancestor, which is
 *    `<header>` itself (`position: sticky` establishes a containing block
 *    exactly like `relative` would). `inset-x-0` on the panel is therefore
 *    relative to the FULL header, not to the burger button, which is what
 *    makes it a full-width sheet with no extra markup or JavaScript.
 */

"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { cx } from "@/components/ui/cx";
import { MenuIcon, SearchIcon } from "@/components/ui/icons";
import { SearchBar } from "@/components/domain/search/SearchBar";
import { localePath, pick, type Locale, type LocaleString } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { ThemeChoice } from "@/lib/theme/config";
import type { NavItem } from "@/lib/sanity/types";
import { LanguageToggle } from "./LanguageToggle";
import { ServiceNavigation } from "./ServiceNavigation";
import { ShellContainer } from "./ShellContainer";
import { SiteLogo } from "./SiteLogo";
import { ThemeToggle } from "./ThemeToggle";

/*
 * Nav switches to the desktop layout at `lg` (80rem / 1280px), not the
 * previous `sm` (48rem / 768px). There are EIGHT primary nav items, several
 * with long Thai labels ("ทำเนียบชุมนุมและหน่วยงาน", "ความคืบหน้านโยบาย"),
 * measuring ~956px including gaps. That does not fit in a 768–1024px row at
 * any reasonable type size, so `lg` is the point this component switches
 * away from the mobile disclosure menu. (The desktop row itself now shows
 * only the pinned items plus a "More" disclosure, see nav-groups.ts, but
 * the mobile menu still lists every item.)
 *
 * At `lg` and up the header is deliberately TWO rows, not one:
 *
 *   Row 1 (utility row): the service-name link on the left; the search
 *   link, LanguageToggle and ThemeToggle grouped on the right.
 *   Row 2 (navigation row): ServiceNavigation, horizontal, full shell
 *   width, separated from row 1 by a `border-line` rule.
 *
 * This is not an accident of `flex-wrap`, it is a real design decision.
 * `ShellContainer` caps content at `--width-content` (1180px), so widening
 * the viewport past `lg` gives the header no extra room: the nav (956px)
 * plus the utility-row controls (brand name, search link, language toggle,
 * three-state theme toggle, easily 450px+) never both fit on one 1148px
 * line at any viewport width. Putting them on two intentional rows, each of
 * which comfortably fits its own content on one line, is the fix; raising
 * the breakpoint further would not help, because the shell width is capped
 * regardless of viewport.
 *
 * The breakpoint is spelled out as the literal Tailwind classes `lg:flex` /
 * `lg:hidden` / `lg:block` below rather than built from a shared constant:
 * Tailwind scans source files for complete, literal class name strings at
 * build time (see the same note on components/ui/Stack.tsx), so a class
 * assembled from a template string at runtime never gets its CSS generated
 * at all. This comment is the single place that breakpoint is explained;
 * every `lg:` usage below implements it.
 */

export function SiteHeader({
  locale,
  serviceName,
  navItems,
  theme,
}: {
  locale: Locale;
  serviceName: LocaleString;
  navItems: NavItem[];
  theme: ThemeChoice;
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

  // Closing the disclosure on navigation matters here specifically because
  // the panel now covers the full viewport width and can run tall enough to
  // scroll (point 3 above): without this, following a link inside it would
  // leave a stale, open full-width sheet sitting over the next page until
  // the reader happened to tap the summary again. Purely a nicety: with
  // JavaScript off the browser navigates away and the disclosure's open
  // state goes with it, so nothing here is load-bearing for correctness.
  useEffect(() => {
    if (!open || !detailsRef.current) return;
    const panel = detailsRef.current;
    function onPanelClick(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (target.closest("a")) panel.open = false;
    }
    panel.addEventListener("click", onPanelClick);
    return () => panel.removeEventListener("click", onPanelClick);
  }, [open]);

  const navLabel = UI.mainMenu[locale];

  return (
    <header ref={headerRef} className="sticky top-0 z-[var(--z-header)] border-b border-line bg-surface">
      {/* Row 1: utility row (brand left, search/language/theme right on
          desktop; brand/search-icon/burger on mobile). One row at every
          width; see the file-level comment for why `lg`+ then adds a
          SECOND row below rather than trying to fit the nav in here too. */}
      <ShellContainer className="flex items-center justify-between gap-4 py-3">
        <Link
          href={localePath(locale, "/")}
          className="inline-flex min-h-[var(--target-min)] shrink-0 items-center gap-2 text-lg font-semibold text-ink-900 no-underline"
        >
          <SiteLogo size={36} priority />
          {pick(serviceName, locale)}
        </Link>

        {/* Desktop: search entry point, language toggle and theme toggle,
            always in the DOM so they work with no JavaScript. Hidden below
            `lg` by CSS alone, not by script. The nav itself lives in row 2
            below, not here, see the file-level comment. */}
        <div className="hidden items-center gap-6 lg:flex">
          <Link
            href={localePath(locale, "/search")}
            className="inline-flex min-h-[var(--target-min)] items-center text-base font-medium text-ink-900 no-underline hover:text-action"
          >
            {UI.search[locale]}
          </Link>
          <LanguageToggle locale={locale} />
          <ThemeToggle locale={locale} current={theme} />
        </div>

        {/* Mobile/tablet: a compact search shortcut plus the disclosure
            burger, both real links/controls that need no script. The search
            shortcut answers problem 4 (search was previously a link buried
            inside the menu): it is reachable in one tap without opening the
            menu at all. The full SearchBar also appears inside the open
            panel below for anyone who opens the menu first. */}
        <div className="flex items-center gap-1 lg:hidden">
          <Link
            href={localePath(locale, "/search")}
            className="inline-flex min-h-[var(--target-min)] min-w-[var(--target-min)] items-center justify-center rounded-control px-2 text-ink-900 no-underline hover:bg-surface-alt"
          >
            <SearchIcon />
            <span className="visually-hidden">{UI.search[locale]}</span>
          </Link>

          {/* Native disclosure. Works fully without JavaScript; see the
              file-level comment for how the open panel becomes full-width. */}
          <details ref={detailsRef} onToggle={(event) => setOpen(event.currentTarget.open)}>
            <summary
              ref={summaryRef}
              aria-expanded={open}
              aria-controls={menuId}
              className="flex min-h-[var(--target-min)] min-w-[var(--target-min)] cursor-pointer list-none items-center gap-2 rounded-control px-3 py-2 text-base font-medium text-ink-900 [&::-webkit-details-marker]:hidden"
            >
              <MenuIcon />
              {open ? UI.closeMenu[locale] : UI.openMenu[locale]}
            </summary>

            <div
              id={menuId}
              className={cx(
                "absolute inset-x-0 top-full z-[var(--z-header)] max-h-[calc(100dvh-var(--header-height,4rem))]",
                "overflow-y-auto border-b border-line bg-surface shadow-[var(--shadow-elevation)]",
              )}
            >
              <ShellContainer className="flex flex-col gap-6 py-4">
                <SearchBar locale={locale} />
                <ServiceNavigation locale={locale} items={navItems} label={navLabel} variant="vertical" />
                <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
                  <LanguageToggle locale={locale} />
                  <ThemeToggle locale={locale} current={theme} />
                </div>
              </ShellContainer>
            </div>
          </details>
        </div>
      </ShellContainer>

      {/* Row 2 (desktop only): the primary nav on its own full-width line,
          separated from row 1 by a rule. Only rendered/exposed at `lg` and
          up: below `lg` the equivalent nav lives inside the mobile disclosure
          panel above, so there is still exactly one ServiceNavigation
          instance visible to assistive tech at any given viewport width. */}
      <div className="hidden border-t border-line lg:block">
        <ShellContainer className="py-2">
          <ServiceNavigation locale={locale} items={navItems} label={navLabel} variant="horizontal" />
        </ShellContainer>
      </div>
    </header>
  );
}
