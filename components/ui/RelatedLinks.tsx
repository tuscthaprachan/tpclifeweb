import type { HeadingLevel } from "@/lib/a11y";
import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { cx } from "./cx";
import { Heading } from "./Heading";
import { Link } from "./Link";

export interface RelatedLinkItem {
  label: string;
  href: string;
  description?: string;
}

interface RelatedLinksProps {
  items: RelatedLinkItem[];
  locale: Locale;
  headingLevel: HeadingLevel;
  id?: string;
  title?: string;
  className?: string;
}

/** Links to related pages and data, each with an optional one-line description. */
export function RelatedLinks({ items, locale, headingLevel, id = "related", title, className }: RelatedLinksProps) {
  const headingId = `${id}-heading`;
  return (
    <aside aria-labelledby={headingId} className={cx("border-t-2 border-ink-900 pt-[var(--space-2)]", className)}>
      <Heading level={headingLevel} id={headingId} className="mb-[var(--space-2)] mt-[var(--space-2)] text-xl">
        {title ?? UI.odRelated[locale]}
      </Heading>
      <ul className="m-0 flex list-none flex-col gap-[var(--space-2)] p-0">
        {items.map((item) => (
          <li key={item.href}>
            <Link href={item.href} locale={locale} className="text-action underline hover:text-action-hover">
              {item.label}
            </Link>
            {item.description ? <span className="block text-sm text-ink-600">{item.description}</span> : null}
          </li>
        ))}
      </ul>
    </aside>
  );
}
