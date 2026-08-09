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

export function ServiceNavigation({
  locale,
  items,
  label,
  className = "",
}: {
  locale: Locale;
  items: NavItem[];
  /** Accessible name for this landmark. Callers pass a translated string so
   * two nav landmarks on the same page (e.g. header and footer) stay
   * distinguishable. */
  label: string;
  className?: string;
}) {
  const pathname = usePathname();
  const { path: currentPath } = stripLocale(pathname);

  return (
    <nav aria-label={label} className={className}>
      <ul className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:gap-6">
        {items.map((item) => {
          const isCurrent = currentPath === item.path;
          return (
            <li key={item.path}>
              <Link
                href={localePath(locale, item.path)}
                aria-current={isCurrent ? "page" : undefined}
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
