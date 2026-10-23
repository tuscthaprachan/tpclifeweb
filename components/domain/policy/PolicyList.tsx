import { cx } from "@/components/ui/cx";
import type { HeadingLevel } from "@/lib/a11y";
import type { Locale } from "@/lib/i18n/config";
import type { Policy } from "@/lib/content/types";
import { PolicyListItem } from "./PolicyListItem";

interface PolicyListProps {
  policies: Policy[];
  locale: Locale;
  headingLevel: HeadingLevel;
  now?: Date;
  className?: string;
}

/**
 * The dashboard's honest shape: a list of policies with different weight,
 * one row per policy, not a grid of equal tiles. Mirrors FormList
 * (components/domain/form/FormList.tsx).
 */
export function PolicyList({ policies, locale, headingLevel, now, className }: PolicyListProps) {
  return (
    <ul className={cx("m-0 list-none divide-y divide-line p-0", className)}>
      {policies.map((policy) => (
        <PolicyListItem key={policy._id} policy={policy} locale={locale} headingLevel={headingLevel} now={now} />
      ))}
    </ul>
  );
}
