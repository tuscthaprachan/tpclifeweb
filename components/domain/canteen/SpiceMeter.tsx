import { cx } from "@/components/ui/cx";
import type { Locale } from "@/lib/i18n/config";
import type { SpiceLevel } from "@/lib/sanity/types";
import { ChilliIcon } from "./icons";
import { SPICE_LABEL } from "./labels";

interface SpiceMeterProps {
  level: SpiceLevel;
  locale: Locale;
  className?: string;
}

/**
 * Up to three chillies plus a word ("Mild"). The word is what carries the
 * meaning, so the icons are decorative. Level 0 shows the word alone. This is
 * the usual spice as the stall makes it, not a promise: the stall can say
 * less spicy.
 */
export function SpiceMeter({ level, locale, className }: SpiceMeterProps) {
  return (
    <span className={cx("inline-flex items-center gap-[var(--space-2)] text-sm text-ink-900", className)}>
      {level > 0 ? (
        <span className="inline-flex text-accent">
          {[1, 2, 3].map((position) => (
            <ChilliIcon key={position} filled={position <= level} className={position <= level ? undefined : "opacity-40"} />
          ))}
        </span>
      ) : null}
      <span>{SPICE_LABEL[level][locale]}</span>
    </span>
  );
}
