import type { ReactNode } from "react";
import type { HeadingLevel } from "@/lib/a11y";
import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { cx } from "./cx";
import { Heading } from "./Heading";

interface CiteThisProps {
  /** The reference itself: body, title, publisher and date. */
  children: ReactNode;
  locale: Locale;
  headingLevel: HeadingLevel;
  title?: string;
  className?: string;
}

/** A ready-made reference for the page, so anyone quoting the data names the source the same way. */
export function CiteThis({ children, locale, headingLevel, title, className }: CiteThisProps) {
  return (
    <div className={cx("flex flex-col gap-[var(--space-1)]", className)}>
      <Heading level={headingLevel} className="m-0 text-lg">
        {title ?? UI.odCiteThis[locale]}
      </Heading>
      <p className="m-0 max-w-[var(--measure-en)] text-ink-900">{children}</p>
    </div>
  );
}
