import type { ReactNode } from "react";
import { Heading } from "@/components/ui/Heading";
import { cx } from "@/components/ui/cx";

interface PageHeadProps {
  /** The small line above the title, such as "Open data". */
  label: string;
  title: ReactNode;
  /** One sentence, under 160 characters. */
  summary?: ReactNode;
  className?: string;
}

/** Label, h1 and one-line summary at the top of an open data page. */
export function PageHead({ label, title, summary, className }: PageHeadProps) {
  return (
    <header className={cx("mb-[var(--space-6)]", className)}>
      <p className="m-0 mb-[var(--space-1)] text-sm font-semibold text-ink-600">{label}</p>
      <Heading level={1} className="m-0">
        {title}
      </Heading>
      {summary ? <p className="m-0 mt-[var(--space-3)] max-w-[var(--measure-en)] text-lg text-ink-900">{summary}</p> : null}
    </header>
  );
}
