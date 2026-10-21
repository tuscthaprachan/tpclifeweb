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
import { localePath, pick, stripLocale, type Locale } from "@/lib/i18n/config";
import type { NavItem } from "@/lib/sanity/types";

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

  return (
    <nav aria-label={label} className={className}>
      <ul className={LIST_CLASS[variant]}>
        {items.map((item) => {
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
      </ul>
    </nav>
  );
}
