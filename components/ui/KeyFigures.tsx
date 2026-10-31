import type { HeadingLevel } from "@/lib/a11y";
import { cx } from "./cx";
import { Heading } from "./Heading";

export interface KeyFigure {
  /** Up to 45 characters. */
  label: string;
  /** Up to 14 characters, already formatted. */
  figure: string;
  /** The period or scope, such as "fiscal year 2569". */
  context?: string;
}

interface KeyFiguresProps {
  items: readonly [KeyFigure, KeyFigure] | readonly [KeyFigure, KeyFigure, KeyFigure];
  headingLevel: HeadingLevel;
  className?: string;
}

/** Two or three headline numbers. The figure is text, so it is read with its label, never by colour or position. */
export function KeyFigures({ items, headingLevel, className }: KeyFiguresProps) {
  return (
    <ul className={cx("m-0 grid list-none gap-[var(--space-4)] p-0 [grid-template-columns:repeat(auto-fit,minmax(min(100%,13.75rem),1fr))]", className)}>
      {items.map((item) => (
        <li key={item.label} className="m-0 rounded-panel border border-line-strong p-[var(--space-4)]">
          <Heading level={headingLevel} className="m-0 text-base font-semibold">
            {item.label}
          </Heading>
          <p className="m-0 whitespace-nowrap text-[length:var(--text-3xl)] font-bold leading-tight text-ink-900 tabular-nums">{item.figure}</p>
          {item.context ? <p className="m-0 mt-[var(--space-1)] text-sm text-ink-600">{item.context}</p> : null}
        </li>
      ))}
    </ul>
  );
}
