import Link from "next/link";

import { EmptyState } from "@/components/ui/EmptyState";
import { Stack } from "@/components/ui/Stack";
import { mealShortfall } from "@/lib/canteen/combos";
import { relaxSuggestions } from "@/lib/canteen/filter";
import { countActiveValues, defaultFilters, type CanteenFilters } from "@/lib/canteen/params";
import { indexCanteen } from "@/lib/canteen/derive";
import { pick as localised, type Locale } from "@/lib/i18n/config";
import type { CanteenData } from "@/lib/content/types";

import { budget as budgetText } from "../budget/strings";
import { RelaxSuggestions } from "../RelaxSuggestions";
import { eatHref } from "../links";
import { PICK_ROUTE } from "./helpers";
import { PICK } from "./strings";

export type PickEmptyReason = "filters" | "dislikes" | "meal" | "budget";

interface PickEmptyProps {
  locale: Locale;
  data: CanteenData;
  filters: CanteenFilters;
  reason: PickEmptyReason;
  now: Date;
  /** For `reason="meal"`: the budget that bought nothing, so the page can say what would. */
  meal?: { amount: number; sameStall: boolean };
}

const BODY = {
  filters: "emptyFilters",
  dislikes: "emptyDislikes",
  meal: "emptyMeal",
  budget: "emptyMealNeedsBudget",
} as const;

const linkClass = "inline-flex min-h-[var(--target-min)] items-center font-medium";

/**
 * Nothing to pick from, said plainly. The filters are never loosened behind
 * the student's back: the best ways out are offered as links (the same
 * suggestions the dish list gives), pointed back at this page.
 */
export function PickEmpty({ locale, data, filters, reason, now, meal }: PickEmptyProps) {
  const index = indexCanteen(data);
  const shortfall = reason === "meal" && meal ? mealShortfall(data, filters, meal.amount, { sameStallOnly: meal.sameStall, now }) : undefined;
  const suggestions = reason === "budget" ? [] : relaxSuggestions(data, filters, now);
  return (
    <Stack space={6}>
      <EmptyState title={PICK.emptyTitle[locale]}>
        {PICK[BODY[reason]][locale]}
        {shortfall?.cheapest !== undefined ? ` ${budgetText.cheapestMain(locale, shortfall.cheapest)}` : ""}
        {reason === "budget" ? (
          <>
            {" "}
            <Link href="#pick-budget" className={linkClass}>
              {PICK.emptyMealGoToBudget[locale]}
            </Link>
          </>
        ) : null}
      </EmptyState>
      {shortfall?.raiseTo !== undefined ? (
        <p className="m-0">
          <Link href={eatHref(locale, PICK_ROUTE, filters, { mode: "meal", meal: shortfall.raiseTo, ...(meal?.sameStall ? { same: 1 } : {}) })} className={linkClass}>
            {budgetText.raiseTo(locale, shortfall.raiseTo)}
          </Link>
        </p>
      ) : null}
      {countActiveValues(filters) > 0 ? (
        <RelaxSuggestions
          locale={locale}
          route={PICK_ROUTE}
          headingLevel={2}
          suggestions={suggestions}
          stallName={(slug) => {
            const stall = index.stallBySlug.get(slug);
            return stall ? localised(stall.name, locale) : undefined;
          }}
        />
      ) : null}
      <div className="flex flex-wrap gap-[var(--space-4)]">
        {countActiveValues(filters) > 0 ? (
          <Link href={eatHref(locale, PICK_ROUTE, defaultFilters())} className={linkClass}>
            {PICK.startOver[locale]}
          </Link>
        ) : null}
        <Link href={eatHref(locale, "/eat/dishes", filters)} className={linkClass}>
          {PICK.browseDishes[locale]}
        </Link>
      </div>
    </Stack>
  );
}
