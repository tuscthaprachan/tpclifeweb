import type { ReactNode } from "react";
import type { Locale } from "@/lib/i18n/config";
import { cx } from "./cx";

const MEASURE: Record<Locale, string> = {
  th: "var(--measure-th)",
  en: "var(--measure-en)",
};

interface ProseProps {
  children: ReactNode;
  className?: string;
  locale: Locale;
}

/**
 * Styled wrapper for rich text (Portable Text output, form guidance copy).
 * The reading width is set from `locale` explicitly rather than left to the
 * ambient `html[lang]` cascade in typography.css, so a Prose block still
 * measures correctly even if it ever renders content in the non-page
 * language (a quoted English notice on a Thai page, for instance).
 */
export function Prose({ children, className, locale }: ProseProps) {
  return (
    <div className={cx("prose", "[&>*+*]:mt-[var(--space-4)] [&_h2]:mt-[var(--space-8)] [&_h3]:mt-[var(--space-6)]", className)} style={{ maxWidth: MEASURE[locale] }}>
      {children}
    </div>
  );
}
