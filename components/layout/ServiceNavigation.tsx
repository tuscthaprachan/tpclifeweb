/**
 * The primary service navigation. Marks the current page with
 * `aria-current="page"` (2.4.8 Location) by comparing the locale-free route
 * against each item's path.
 *
 * `usePathname` needs a Client Component, but that is not a progressive
 * enhancement problem: the hook resolves during the server render of this
 * request too, so the `aria-current` attribute and every `href` are already
 * correct in the HTML that reaches the browser. No JavaScript has to run for
 * this component to work.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { cx } from "@/components/ui/cx";
import { UI } from "@/lib/i18n/strings";
import { localePath, pick, stripLocale, type Locale } from "@/lib/i18n/config";
import type { NavItem } from "@/lib/sanity/types";
import { splitPrimaryNav } from "./nav-groups";

/*
 * How the list of links lays itself out. "responsive" is the original
 * behaviour (a vertical stack that becomes a horizontal row at `sm`),
 * still right for the footer, which is never nested inside a disclosure and
 * has no other component telling it when to switch.
 *
 * The header needs the other two instead of "responsive": it renders this
 * component in two DIFFERENT places at once (the desktop row and the
 * mobile disclosure panel) and decides which one is visible with its own
 * breakpoint. If this component also switched orientation internally at
 * `sm`, the copy sitting inside the still-open mobile panel between `sm`
 * and the header's own (larger) breakpoint would flip to a horizontal row
 * while it is still meant to be the vertical "menu is open" list, cramming
 * eight long Thai labels into a strip a phone-in-landscape or small tablet
 * cannot fit. Forcing the orientation explicitly from the caller removes
 * that coupling entirely.
 */
export type ServiceNavigationVariant = "responsive" | "horizontal" | "vertical";

/*
 * The "horizontal" variant is the header's desktop row. It shows only the
 * pinned items (see nav-groups.ts) as links and folds every other item into
 * a "More" disclosure, so nine long labels no longer have to fit one line.
 * "vertical" (the mobile menu) and "responsive" (the footer) still list
 * every item.
 */

const LIST_CLASS: Record<ServiceNavigationVariant, string> = {
  responsive: "flex flex-col gap-2 text-base sm:flex-row sm:items-center sm:gap-6",
  horizontal: "flex flex-wrap items-center gap-x-6 gap-y-2 text-base",
  vertical: "flex flex-col gap-2 text-base",
};

export function ServiceNavigation({
  locale,
  items,
  label,
  variant = "responsive",
  className = "",
}: {
  locale: Locale;
  items: NavItem[];
  /** Accessible name for this landmark. Callers pass a translated string so
   * two nav landmarks on the same page (e.g. header and footer) stay
   * distinguishable. */
  label: string;
  variant?: ServiceNavigationVariant;
  className?: string;
}) {
  const pathname = usePathname();
  const { path: currentPath } = stripLocale(pathname);

  const grouped = variant === "horizontal";
  const { pinned, more } = splitPrimaryNav(items);
  const visible = grouped ? pinned : items;

  return (
    <nav aria-label={label} className={className}>
      <ul className={LIST_CLASS[variant]}>
        {visible.map((item) => {
          const isCurrent = currentPath === item.path;
          // A page inside a section (/eat/dishes under /eat) marks the section as the place you are in,
          // without claiming it is the section's own page.
          const isWithin = !isCurrent && item.path !== "/" && currentPath.startsWith(`${item.path}/`);
          return (
            <li key={item.path}>
              <Link
                href={localePath(locale, item.path)}
                aria-current={isCurrent ? "page" : isWithin ? "true" : undefined}
                className="inline-flex min-h-[var(--target-min)] items-center py-1 font-medium text-ink-900 no-underline hover:text-action"
              >
                {pick(item.label, locale)}
              </Link>
            </li>
          );
        })}
        {grouped && more.length > 0 ? (
          <li>
            <MoreMenu locale={locale} items={more} currentPath={currentPath} />
          </li>
        ) : null}
      </ul>
    </nav>
  );
}

/**
 * The "More" disclosure on the desktop row. A native `<details>/<summary>`,
 * like the mobile menu in SiteHeader, so it opens and closes with no
 * JavaScript and its links are ordinary `<a>` tags. The effects only
 * enhance it: `aria-expanded` / `aria-controls` on the summary, Escape to
 * close with focus returned to the summary, close on outside click, on
 * following a link, and when keyboard focus tabs out of it.
 *
 * Current-page indication carries through: if the current page is one of the
 * folded items (or inside its section) the summary itself gets
 * `aria-current`, plus a visually-hidden note so the state is not conveyed
 * by the underline alone.
 */
function MoreMenu({ locale, items, currentPath }: { locale: Locale; items: NavItem[]; currentPath: string }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const menuId = useId();

  const containsCurrent = items.some(
    (item) => currentPath === item.path || (item.path !== "/" && currentPath.startsWith(`${item.path}/`)),
  );

  useEffect(() => {
    if (!open) return;
    const details = detailsRef.current;
    if (!details) return;

    function close(returnFocus: boolean) {
      if (!details) return;
      details.open = false;
      if (returnFocus) summaryRef.current?.focus();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close(true);
    }
    function onPointerDown(event: PointerEvent) {
      if (!details?.contains(event.target as Node)) close(false);
    }
    function onFocusOut(event: FocusEvent) {
      const next = event.relatedTarget as Node | null;
      if (next && !details?.contains(next)) close(false);
    }
    function onClick(event: MouseEvent) {
      if ((event.target as HTMLElement).closest("a")) close(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    details.addEventListener("focusout", onFocusOut);
    details.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      details.removeEventListener("focusout", onFocusOut);
      details.removeEventListener("click", onClick);
    };
  }, [open]);

  return (
    <details ref={detailsRef} className="relative" onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary
        ref={summaryRef}
        aria-expanded={open}
        aria-controls={menuId}
        aria-current={containsCurrent ? "true" : undefined}
        className={cx(
          "inline-flex min-h-[var(--target-min)] cursor-pointer list-none items-center gap-1 py-1 font-medium text-ink-900 hover:text-action [&::-webkit-details-marker]:hidden",
          containsCurrent && "underline underline-offset-4",
        )}
      >
        {UI.moreNav[locale]}
        <span aria-hidden="true">{open ? "\u25B4" : "\u25BE"}</span>
        {containsCurrent ? <span className="visually-hidden">{UI.currentSection[locale]}</span> : null}
      </summary>
      <ul
        id={menuId}
        className="absolute left-0 top-full z-[var(--z-header)] mt-1 flex min-w-60 flex-col gap-1 rounded-control border border-line bg-surface p-2 shadow-[var(--shadow-elevation)]"
      >
        {items.map((item) => {
          const isCurrent = currentPath === item.path;
          const isWithin = !isCurrent && item.path !== "/" && currentPath.startsWith(`${item.path}/`);
          return (
            <li key={item.path}>
              <Link
                href={localePath(locale, item.path)}
                aria-current={isCurrent ? "page" : isWithin ? "true" : undefined}
                className="flex min-h-[var(--target-min)] items-center rounded-control px-3 py-1 font-medium text-ink-900 no-underline hover:bg-surface-alt hover:text-action"
              >
                {pick(item.label, locale)}
              </Link>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
