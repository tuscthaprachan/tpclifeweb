import Link from "next/link";
import { cx } from "@/components/ui/cx";
import { Heading } from "@/components/ui/Heading";
import { Tag } from "@/components/ui/Tag";
import type { HeadingLevel } from "@/lib/a11y";
import type { CanteenFilters } from "@/lib/canteen/params";
import { pick, type Locale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";
import type { CanteenStall } from "@/lib/content/types";
import { DietTag } from "./DietTag";
import { stallHalalTag } from "./diet";
import { CUISINE_LABEL } from "./labels";
import { stallHref } from "./links";
import { EAT, eat, t } from "./strings";

interface StallCardProps {
  stall: CanteenStall;
  locale: Locale;
  filters: CanteenFilters;
  /** All dishes the stall sells. */
  dishCount: number;
  /** Dishes that pass the current filters. Omit when no filter is on. */
  matchCount?: number;
  /** Lowest and highest base price among the dishes counted (the matching ones when filtered). Null when there are none. */
  priceRange: { min: number; max: number } | null;
  headingLevel?: HeadingLevel;
  className?: string;
}

/**
 * One stall in the list: its painted number, name, cuisine, the halal answer
 * in the stall's own words, how many dishes and the price range. Plain
 * markup, no JavaScript needed.
 */
export function StallCard({ stall, locale, filters, dishCount, matchCount, priceRange, headingLevel = 3, className }: StallCardProps) {
  const halalTag = stallHalalTag(stall);
  const filtered = matchCount !== undefined;
  const noMatch = filtered && matchCount === 0;

  return (
    <article className={cx("flex h-full flex-col gap-[var(--space-3)] rounded-panel border border-line bg-surface p-[var(--space-4)]", noMatch && "bg-surface-alt", className)}>
      <div className="flex items-start gap-[var(--space-3)]">
        <span className="inline-flex min-h-[2.5rem] min-w-[2.5rem] items-center justify-center rounded-control bg-welfare px-[var(--space-2)] text-lg font-semibold text-ink-on-fill">
          <span className="visually-hidden">{t(EAT.stallNumberWord, locale)} </span>
          {formatNumber(stall.number, locale)}
        </span>
        <Heading level={headingLevel} visualLevel={4} className="m-0 leading-tight">
          <Link href={stallHref(locale, stall.slug.current, filters)} className="inline-flex min-h-[var(--target-min)] items-center text-ink-900 no-underline hover:text-action hover:underline">
            {pick(stall.name, locale)}
          </Link>
        </Heading>
      </div>

      <ul className="m-0 flex list-none flex-wrap gap-[var(--space-2)] p-0">
        {stall.cuisine.map((cuisine) => (
          <li key={cuisine}>
            <Tag tone="neutral">{CUISINE_LABEL[cuisine][locale]}</Tag>
          </li>
        ))}
      </ul>

      {halalTag || stall.vegetarianStall ? (
        <div className="flex flex-wrap gap-[var(--space-2)]">
          {halalTag ? <DietTag tag={halalTag} locale={locale} /> : null}
          {stall.vegetarianStall ? <Tag tone="neutral">{t(EAT.vegetarianStall, locale)}</Tag> : null}
        </div>
      ) : null}

      {stall.wayfinding ? <p className="m-0 text-sm text-ink-600">{pick(stall.wayfinding, locale)}</p> : null}

      <p className="m-0 mt-auto text-sm text-ink-900">
        {noMatch ? (
          t(EAT.noResultsStalls, locale)
        ) : filtered ? (
          eat.stallMatchCount(locale, matchCount, dishCount)
        ) : (
          eat.dishCount(locale, dishCount)
        )}
        {priceRange ? <span className="text-ink-600"> · {eat.priceRange(locale, priceRange.min, priceRange.max)}</span> : null}
      </p>
    </article>
  );
}
