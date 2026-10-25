import type { ReactNode } from "react";
import { cx } from "./cx";

interface WarningTextProps {
  /**
   * The warning itself. Include the visually hidden word as the first child,
   * `<span className="visually-hidden">{UI.warning[locale]}: </span>`: there
   * is no generic prefix supplied here because the word is the caller's
   * localised string.
   */
  children: ReactNode;
  className?: string;
}

/**
 * The GOV.UK warning text: bold text with a black circular "!" icon. No box,
 * no fill, no coloured border. The icon is decorative; the visually hidden
 * prefix the caller supplies tells a screen reader this is a warning, and the bold weight and the
 * icon tell everyone else, so meaning never rests on colour (1.4.1).
 */
export function WarningText({ children, className }: WarningTextProps) {
  return (
    <div className={cx("relative flex items-start gap-[var(--space-4)] py-[var(--space-2)] font-bold text-ink-900", className)}>
      <span
        aria-hidden="true"
        className="inline-flex size-[2.2rem] shrink-0 select-none items-center justify-center rounded-full bg-ink-900 text-lg font-bold leading-none text-surface"
      >
        !
      </span>
      <p className="m-0 min-w-0 self-center">
        {children}
      </p>
    </div>
  );
}
