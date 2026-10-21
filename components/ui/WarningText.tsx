import type { ReactNode } from "react";
import { cx } from "./cx";
import { WarningIcon } from "./icons";

interface WarningTextProps {
  /**
   * Must include the word itself ("Warning" / "คำเตือน") as visible text.
   * This component does not supply it: there is no generic "Warning" entry
   * in lib/i18n/strings.ts to reuse, only specific notices such as
   * `phaseAlphaNote`. Report this gap rather than inventing a synonym here.
   */
  children: ReactNode;
  className?: string;
}

/** Icon, colour and the word together (1.4.1). The icon is decorative; the word lives in `children` because it is the caller's string to supply. */
export function WarningText({ children, className }: WarningTextProps) {
  return (
    <div className={cx("flex items-start gap-[var(--space-2)] border-l-[var(--border-width-thick)] border-warning bg-warning-soft px-[var(--space-4)] py-[var(--space-3)]", className)}>
      <WarningIcon className="mt-[calc((1lh-16px)/2)] shrink-0 text-warning" />
      <p className="m-0 font-semibold text-ink-900">{children}</p>
    </div>
  );
}
