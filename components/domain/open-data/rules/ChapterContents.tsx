import { Heading } from "@/components/ui/Heading";
import { cx } from "@/components/ui/cx";
import type { HeadingLevel } from "@/lib/a11y";
import type { Locale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";
import { UI } from "@/lib/i18n/strings";
import { fillText } from "../fill";
import type { Contents, ContentsEntry } from "./contents";

interface ChapterContentsProps {
  contents: Contents;
  locale: Locale;
  headingLevel: HeadingLevel;
  id: string;
  title: string;
  /** Label for the clauses before the first heading. Omit for a report, which has no clauses. */
  introLabel?: string;
  className?: string;
}

export function clauseRange(first: number | null, last: number | null, locale: Locale): string {
  if (first === null || last === null) return "";
  if (first === last) return fillText(UI.odRlClauseOne[locale], { n: formatNumber(first, locale) });
  return fillText(UI.odRlClauseRange[locale], { a: formatNumber(first, locale), b: formatNumber(last, locale) });
}

function Entry({ entry, locale }: { entry: ContentsEntry; locale: Locale }) {
  const range = clauseRange(entry.first, entry.last, locale);
  return (
    <li>
      <a href={`#${entry.id}`} className="inline-flex min-h-[var(--target-min)] items-center text-action underline hover:text-action-hover">
        {entry.label}
      </a>
      {range ? <span className="ml-[var(--space-2)] text-sm text-ink-600">{range}</span> : null}
      {entry.children.length > 0 ? (
        <ul className="m-0 ml-[var(--space-5)] list-none p-0">
          {entry.children.map((child) => (
            <Entry key={child.id} entry={child} locale={locale} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/** The chapters of a regulation, or the sections of a report, each linking to its heading in the full text. */
export function ChapterContents({ contents, locale, headingLevel, id, title, introLabel, className }: ChapterContentsProps) {
  const headingId = `${id}-heading`;
  return (
    <nav aria-labelledby={headingId} className={cx("border-y border-line py-[var(--space-3)]", className)}>
      <Heading level={headingLevel} id={headingId} className="m-0 mb-[var(--space-2)] text-lg">
        {title}
      </Heading>
      <ul className="m-0 list-none p-0">
        {contents.intro && introLabel ? (
          <li>
            <a href={`#${contents.intro.id}`} className="inline-flex min-h-[var(--target-min)] items-center text-action underline hover:text-action-hover">
              {introLabel}
            </a>
            <span className="ml-[var(--space-2)] text-sm text-ink-600">{clauseRange(contents.intro.first, contents.intro.last, locale)}</span>
          </li>
        ) : null}
        {contents.entries.map((entry) => (
          <Entry key={entry.id} entry={entry} locale={locale} />
        ))}
      </ul>
    </nav>
  );
}
