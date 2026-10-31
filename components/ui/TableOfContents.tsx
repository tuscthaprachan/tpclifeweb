import type { HeadingLevel } from "@/lib/a11y";
import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { cx } from "./cx";
import { Heading } from "./Heading";

export interface TableOfContentsItem {
  label: string;
  /** An in-page anchor such as "#attendance", or a page link. */
  href: string;
  /** The item the reader is on, drawn in bold with `aria-current`. */
  current?: boolean;
}

interface TableOfContentsProps {
  items: TableOfContentsItem[];
  locale: Locale;
  headingLevel: HeadingLevel;
  id?: string;
  title?: string;
  className?: string;
}

/** A numbered list of the sections on a page. Keep it shorter than the viewport. */
export function TableOfContents({ items, locale, headingLevel, id = "toc", title, className }: TableOfContentsProps) {
  const headingId = `${id}-heading`;
  return (
    <nav aria-labelledby={headingId} className={cx("border-y border-line py-[var(--space-3)]", className)}>
      <Heading level={headingLevel} id={headingId} className="m-0 mb-[var(--space-2)] text-lg">
        {title ?? UI.odContents[locale]}
      </Heading>
      <ol className="m-0 pl-[var(--space-6)]">
        {items.map((item) => (
          <li key={item.href}>
            <a
              href={item.href}
              aria-current={item.current ? "location" : undefined}
              className={cx("inline-flex min-h-[var(--target-min)] items-center text-action underline hover:text-action-hover", item.current && "font-bold")}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
