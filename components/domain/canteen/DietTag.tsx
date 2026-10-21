import { cx } from "@/components/ui/cx";
import { Timestamp } from "@/components/ui/Timestamp";
import type { Locale } from "@/lib/i18n/config";
import { DietIcon } from "./icons";
import { DIET_TAG_LABEL } from "./labels";
import type { DishDietTag } from "./diet";
import { EAT } from "./strings";

interface DietTagProps {
  tag: DishDietTag;
  locale: Locale;
  /** Show the day the stall was asked, beside a halal tag. For detail pages. */
  showDate?: boolean;
  className?: string;
}

/**
 * One diet tag: icon, word and a soft fill (1.4.1: never colour alone).
 *
 * "Halal" marks every dish at a halal stall; a certificate on file earns
 * "Certified halal", drawn on the solid fill so it reads as the stronger
 * claim. An "ask for it" tag has a
 * dashed outline, because that dish is not made that way until you ask.
 */
export function DietTag({ tag, locale, showDate = false, className }: DietTagProps) {
  const certified = tag.key === "halalCertified";
  return (
    <span
      className={cx(
        "inline-flex items-center gap-[var(--space-1)] rounded-pill px-[var(--space-3)] py-[var(--space-1)] text-sm font-medium",
        certified ? "bg-welfare text-ink-on-fill" : "bg-welfare-soft text-ink-900",
        tag.canAsk ? "border border-dashed border-line-strong" : undefined,
        className,
      )}
    >
      <DietIcon diet={tag.diet} />
      <span>{DIET_TAG_LABEL[tag.key][locale]}</span>
      {showDate && tag.checkedOn?.trim() ? (
        <span className="font-normal">
          {" "}
          · {EAT.halalAsked[locale]} <Timestamp value={tag.checkedOn.trim()} locale={locale} />
        </span>
      ) : null}
    </span>
  );
}

interface DietTagsProps {
  tags: DishDietTag[];
  locale: Locale;
  showDate?: boolean;
  className?: string;
}

/** A wrapping row of diet tags. Renders nothing when there are none. */
export function DietTags({ tags, locale, showDate, className }: DietTagsProps) {
  if (tags.length === 0) return null;
  return (
    <ul className={cx("m-0 flex list-none flex-wrap gap-[var(--space-2)] p-0", className)}>
      {tags.map((tag) => (
        <li key={tag.key}>
          <DietTag tag={tag} locale={locale} showDate={showDate} />
        </li>
      ))}
    </ul>
  );
}
