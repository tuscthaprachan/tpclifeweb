import { cx } from "@/components/ui/cx";
import type { Locale } from "@/lib/i18n/config";
import { DietIcon } from "./icons";
import { DIET_TAG_LABEL } from "./labels";
import type { DishDietTag } from "./diet";

interface DietTagProps {
  tag: DishDietTag;
  locale: Locale;
  className?: string;
}

/**
 * One diet tag: icon, word and a soft fill (1.4.1: never colour alone).
 *
 * "Halal" marks every dish at a halal stall; "Vegetarian" marks vegetarian
 * food.
 */
export function DietTag({ tag, locale, className }: DietTagProps) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-[var(--space-1)] rounded-pill px-[var(--space-3)] py-[var(--space-1)] text-sm font-medium",
        "bg-welfare-soft text-ink-900",
        className,
      )}
    >
      <DietIcon diet={tag.diet} />
      <span>{DIET_TAG_LABEL[tag.key][locale]}</span>
    </span>
  );
}

interface DietTagsProps {
  tags: DishDietTag[];
  locale: Locale;
  className?: string;
}

/** A wrapping row of diet tags. Renders nothing when there are none. */
export function DietTags({ tags, locale, className }: DietTagsProps) {
  if (tags.length === 0) return null;
  return (
    <ul className={cx("m-0 flex list-none flex-wrap gap-[var(--space-2)] p-0", className)}>
      {tags.map((tag) => (
        <li key={tag.key}>
          <DietTag tag={tag} locale={locale} />
        </li>
      ))}
    </ul>
  );
}
