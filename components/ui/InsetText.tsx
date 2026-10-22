import type { ReactNode } from "react";
import { cx } from "./cx";

interface InsetTextProps {
  children: ReactNode;
  className?: string;
}

/** A quoted or supplementary passage set off from the surrounding copy. No colour, no icon: it is not a status, just typographic emphasis. */
export function InsetText({ children, className }: InsetTextProps) {
  return (
    <div className={cx("border-l-[length:var(--border-width-thick)] border-line-strong pl-[var(--space-4)] py-[var(--space-1)] text-ink-900", className)}>
      {children}
    </div>
  );
}
