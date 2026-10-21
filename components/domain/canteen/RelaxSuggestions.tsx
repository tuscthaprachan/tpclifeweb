import Link from "next/link";
import { Heading } from "@/components/ui/Heading";
import type { HeadingLevel } from "@/lib/a11y";
import type { RelaxSuggestion } from "@/lib/canteen/filter";
import type { Locale } from "@/lib/i18n/config";
import { cx } from "@/components/ui/cx";
import { AVOID_LABEL, DIET_SHORT_LABEL, FEEL_LABEL, TYPE_LABEL } from "./labels";
import { eatHref } from "./links";
import { EAT, eat, t } from "./strings";
import type { StallNamer } from "./chips";

interface RelaxSuggestionsProps {
  locale: Locale;
  suggestions: RelaxSuggestion[];
  /** The route the links go to, locale free. */
  route: string;
  stallName?: StallNamer;
  headingLevel?: HeadingLevel;
  className?: string;
}

/** The words for one suggestion. Exported so the randomiser page can say the same thing in the same way. */
export function relaxText(suggestion: RelaxSuggestion, locale: Locale, stallName?: StallNamer): string {
  const { kind, param, value, count } = suggestion;
  if (kind === "raise" && typeof value === "number") return eat.relaxRaise(locale, value, count);

  switch (param) {
    case "max":
      return eat.relaxGeneric(locale, t(EAT.relaxWithoutBudget, locale), count);
    case "variants":
      return eat.relaxGeneric(locale, t(EAT.relaxWithoutVariants, locale), count);
    case "diet":
      return eat.relaxDrop(locale, DIET_SHORT_LABEL[value as keyof typeof DIET_SHORT_LABEL][locale], count);
    case "type":
      return eat.relaxDrop(locale, TYPE_LABEL[value as keyof typeof TYPE_LABEL][locale], count);
    case "avoid":
      return eat.relaxDrop(locale, AVOID_LABEL[value as keyof typeof AVOID_LABEL][locale], count);
    case "feel":
      return eat.relaxDrop(locale, FEEL_LABEL[value as keyof typeof FEEL_LABEL][locale], count);
    case "stall":
      return eat.relaxDrop(locale, (typeof value === "string" ? stallName?.(value) : undefined) ?? String(value), count);
    case "open":
      return eat.relaxGeneric(locale, locale === "th" ? "ไม่ดูเวลาทำการ" : "Ignore opening hours", count);
  }
}

/**
 * Zero result recovery: the best one or two ways to get dishes back, each a
 * link that applies the change. Fed by `relaxSuggestions` from
 * `lib/canteen/filter`, the same function the randomiser uses to relax. Renders
 * nothing when there is nothing to suggest.
 */
export function RelaxSuggestions({ locale, suggestions, route, stallName, headingLevel = 3, className }: RelaxSuggestionsProps) {
  if (suggestions.length === 0) return null;
  return (
    <section className={cx("flex flex-col gap-[var(--space-3)]", className)}>
      <Heading level={headingLevel} visualLevel={4} className="m-0">
        {t(EAT.relaxTitle, locale)}
      </Heading>
      <ul className="m-0 flex list-none flex-col gap-[var(--space-2)] p-0">
        {suggestions.map((suggestion, position) => (
          <li key={`${suggestion.param}-${String(suggestion.value)}-${position}`}>
            <Link href={eatHref(locale, route, suggestion.filters)} className="inline-flex min-h-[var(--target-min)] items-center font-medium">
              {relaxText(suggestion, locale, stallName)}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
