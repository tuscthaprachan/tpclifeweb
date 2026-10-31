import type { HeadingLevel } from "@/lib/a11y";
import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { cx } from "./cx";
import { Heading } from "./Heading";
import { Timestamp } from "./Timestamp";

export interface DocumentListItem {
  title: string;
  href: string;
  /** What kind of document: "Minutes", "Report". */
  type: string;
  /** ISO date. Null when the document does not state one. */
  date: string | null;
  /** Shown instead of a date when `date` is null, such as "[date not stated]". */
  noDateText?: string;
  /** File type and size, such as "PDF" and "486 KB". */
  format: string;
  size: string;
  /** Already formatted, such as "10 pages". */
  pages?: string;
  description?: string;
}

interface DocumentListProps {
  items: DocumentListItem[];
  locale: Locale;
  headingLevel: HeadingLevel;
  className?: string;
  /** "cards" sets each document in a thin bordered card, as the Parliament card list does. */
  variant?: "list" | "cards";
}

/** The ONS document list: title link, then type, date and file details, then a line of description. */
export function DocumentList({ items, locale, headingLevel, className, variant = "list" }: DocumentListProps) {
  const cards = variant === "cards";
  return (
    <ul className={cx("m-0 list-none p-0", cards && "grid gap-[var(--space-4)] sm:grid-cols-2", className)}>
      {items.map((item) => {
        const file = [item.format, item.size, item.pages].filter(Boolean).join(", ");
        const suffix = UI.odFileDownload[locale].replace("{format}", item.format).replace("{size}", item.size);
        return (
          <li key={item.href} className={cards ? "relative border border-line-strong bg-surface p-[var(--space-4)]" : "border-t border-line py-[var(--space-4)] last:border-b"}>
            <Heading level={headingLevel} className="m-0 mb-[var(--space-1)] text-lg">
              <a href={item.href} className={cx("text-action underline hover:text-action-hover", cards && "after:absolute after:inset-0 after:content-['']")}>
                {item.title}
                <span className="visually-hidden">, {suffix}</span>
              </a>
            </Heading>
            <ul className="m-0 mb-[var(--space-1)] flex list-none flex-wrap gap-x-[var(--space-5)] p-0 text-sm text-ink-600">
              <li>{item.type}</li>
              <li>{item.date ? <Timestamp value={item.date} locale={locale} /> : item.noDateText}</li>
              <li aria-hidden="true">{file}</li>
            </ul>
            {item.description ? <p className="m-0 max-w-[var(--measure-en)] text-ink-900">{item.description}</p> : null}
          </li>
        );
      })}
    </ul>
  );
}
