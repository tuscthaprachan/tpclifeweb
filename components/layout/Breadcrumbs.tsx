/**
 * Breadcrumb trail. `<nav aria-label>` wrapping an ordered list, because the
 * order is meaningful (WAI-ARIA breadcrumb pattern). The current page is
 * rendered as text, not a link, matching how every other "you are here"
 * indicator on the site behaves.
 *
 * Callers pass locale-free paths; this prepends the locale itself so a page
 * does not have to import `localePath` just to build its own trail.
 */

import Link from "next/link";
import { localePath, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";

export interface BreadcrumbItem {
  label: string;
  /** Omit for the current page. */
  path?: string;
}

export function Breadcrumbs({ locale, items }: { locale: Locale; items: BreadcrumbItem[] }) {
  if (items.length === 0) return null;

  return (
    <nav aria-label={UI.breadcrumb[locale]} className="py-[var(--space-2)] text-sm">
      <ol className="flex flex-wrap items-center gap-2 text-ink-600">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          /*
           * The `:only-child` rule in globals.css does not reach the link
           * below: each <li> also holds a "/" separator span, so the link is
           * not an only child. It is still a standalone navigation target
           * rather than a link inside a sentence, so 2.5.8 Target Size applies
           * and the minimum height has to be set explicitly here.
           */
          return (
            <li key={item.path ?? item.label} className="flex items-center gap-2">
              {item.path && !isLast ? (
                <Link
                  href={localePath(locale, item.path)}
                  className="inline-flex min-h-[var(--target-min)] items-center text-action"
                >
                  {item.label}
                </Link>
              ) : (
                <span aria-current={isLast ? "page" : undefined} className={isLast ? "text-ink-900" : undefined}>
                  {item.label}
                </span>
              )}
              {!isLast && (
                <span aria-hidden="true">/</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
