import NextLink from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { cx } from "./cx";

export interface SectionNavItem {
  label: string;
  href: string;
  current?: boolean;
}

interface SectionNavProps {
  items: SectionNavItem[];
  locale: Locale;
  /** Names the landmark. Defaults to "Pages in this section". */
  title?: string;
  /** The id for the heading. Needed only if two section navs share a page. */
  id?: string;
  className?: string;
}

/**
 * Links between the pages of one section. A compact two-column list on a phone, a vertical list
 * with a rule down its left edge from `md`. The current page carries `aria-current="page"` and is
 * marked by weight and a bar, not colour alone.
 */
export function SectionNav({ items, locale, title, id = "section-nav", className }: SectionNavProps) {
  const headingId = `${id}-heading`;
  return (
    <nav aria-labelledby={headingId} className={className}>
      <p id={headingId} className="m-0 mb-[var(--space-2)] text-sm font-semibold text-ink-600">
        {title ?? UI.odSectionNav[locale]}
      </p>
      <ul className="m-0 grid list-none grid-cols-2 gap-x-[var(--space-4)] border-t border-line p-0 md:block md:border-l md:border-t-0">
        {items.map((item) => (
          <li key={item.href} className="border-b border-line md:border-b-0">
            <NextLink
              href={item.href}
              aria-current={item.current ? "page" : undefined}
              className={cx(
                "flex min-h-[var(--target-touch)] items-center border-l-4 py-[var(--space-1)] pl-[var(--space-3)] md:-ml-px md:min-h-[var(--target-min)]",
                item.current ? "border-ink-900 font-bold text-ink-900 no-underline" : "border-transparent text-action underline hover:text-action-hover md:no-underline md:hover:underline",
              )}
            >
              {item.label}
            </NextLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
