import Link from "next/link";

import { Details } from "@/components/ui/Details";
import { Heading } from "@/components/ui/Heading";
import { Timestamp } from "@/components/ui/Timestamp";
import type { HeadingLevel } from "@/lib/a11y";
import type { MealCombo } from "@/lib/canteen/combos";
import { effectivePrice } from "@/lib/canteen/derive";
import type { CanteenFilters } from "@/lib/canteen/params";
import { pick, type Locale } from "@/lib/i18n/config";
import type { CanteenData } from "@/lib/sanity/types";

import { dishHref } from "../links";
import { EAT, eat, t } from "../strings";
import { CanteenMap } from "../map";
import { BUDGET, budget } from "./strings";
import { routeFor } from "./route";

interface ComboCardProps {
  combo: MealCombo;
  data: CanteenData;
  locale: Locale;
  filters: CanteenFilters;
  /** 1 based, for the heading and for unique map ids. */
  position: number;
  headingLevel?: HeadingLevel;
}

/**
 * One meal: headed by its main dish and the total, then the items with their
 * surveyed prices, the change left and how many stalls it takes. The walking
 * order and a small map with only the stops numbered sit in a collapsed
 * "Where to go". The same route is written out as a list, so the map is never
 * the only way to read it.
 */
export function ComboCard({ combo, data, locale, filters, position, headingLevel = 3 }: ComboCardProps) {
  const route = routeFor(data, combo.stalls);
  const stops = route?.stops ?? combo.stalls;
  const stallOfItem = (stallId: string) => data.stalls.find((stall) => stall._id === stallId);

  return (
    <article className="flex h-full flex-col gap-[var(--space-4)] rounded-panel border border-line bg-surface p-[var(--space-4)]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-[var(--space-4)] gap-y-[var(--space-1)]">
        <Heading level={headingLevel} className="m-0 text-lg">
          {pick(combo.main.name, locale)}
        </Heading>
        <p className="m-0 text-lg font-semibold text-ink-900">{eat.baht(locale, combo.total)}</p>
      </div>

      <ul className="m-0 flex list-none flex-col gap-[var(--space-3)] p-0" aria-label={t(BUDGET.comboItems, locale)}>
        {combo.items.map((dish) => {
          const stall = stallOfItem(dish.stall._ref);
          return (
            <li key={dish.slug.current} className="flex flex-col gap-[var(--space-1)]">
              <div className="flex items-baseline justify-between gap-[var(--space-3)]">
                <Link
                  href={dishHref(locale, dish.slug.current, filters)}
                  className="inline-flex min-h-[var(--target-min)] items-center font-medium"
                >
                  {pick(dish.name, locale)}
                </Link>
                <span className="shrink-0 font-semibold text-ink-900">{eat.baht(locale, effectivePrice(dish, filters.variants))}</span>
              </div>
              <p className="m-0 text-sm text-ink-600">
                {stall ? eat.stallFull(locale, stall.number, pick(stall.name, locale)) : null}
                {dish.checkedOn ? (
                  <>
                    {" · "}
                    {t(EAT.priceCheckedOn, locale)} <Timestamp value={dish.checkedOn} locale={locale} />
                  </>
                ) : null}
              </p>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-baseline justify-between gap-x-[var(--space-4)] border-t border-line pt-[var(--space-3)]">
        <p className="m-0 text-ink-900">{budget.stalls(locale, combo.stalls.length)}</p>
        <p className="m-0 font-medium text-ink-900">{budget.left(locale, combo.change)}</p>
      </div>

      <Details summary={t(EAT.comboWhere, locale)} className="mt-auto">
        <div className="flex flex-col gap-[var(--space-2)]">
          <p className="m-0 text-base font-medium text-ink-900">{t(BUDGET.comboWalk, locale)}</p>
          <ol className="m-0 flex list-decimal flex-col gap-[var(--space-1)] pl-[var(--space-6)] text-base text-ink-900">
            {stops.map((stall) => (
              <li key={stall._id}>{eat.stallFull(locale, stall.number, pick(stall.name, locale))}</li>
            ))}
          </ol>
          {route ? (
            <div className="max-w-[16rem]">
              <CanteenMap
                locale={locale}
                data={data}
                compact
                numbers="highlighted"
                highlights={route.highlights}
                entranceIndex={route.entranceIndex}
                idPrefix={`combo-${position}`}
              />
            </div>
          ) : null}
        </div>
      </Details>
    </article>
  );
}
