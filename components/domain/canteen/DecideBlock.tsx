import { Button } from "@/components/ui/Button";
import { Heading } from "@/components/ui/Heading";
import type { HeadingLevel } from "@/lib/a11y";
import { serialise, type CanteenFilters, type DietKey } from "@/lib/canteen/params";
import { localePath, type Locale } from "@/lib/i18n/config";
import { ChoiceGroup } from "./ChoiceGroup";
import { DiceIcon, DietIcon } from "./icons";
import { DIET_SHORT_LABEL } from "./labels";
import { EAT, eat, t } from "./strings";
import { SpinListener } from "./pick/SpinListener";
import "./fun.css";

const FLOATERS = ["🍜", "🍛", "🥢", "🍤"] as const;

interface DecideBlockProps {
  locale: Locale;
  /** The current filters. Everything the block does not edit rides along as hidden fields. */
  filters: CanteenFilters;
  headingLevel?: HeadingLevel;
}

/** Budget chips on the hub, in baht. "Any" is added by the block. */
const DECIDE_BUDGETS = [40, 50, 60] as const;

/** The diets offered as chips. */
const DECIDE_DIETS: readonly DietKey[] = ["nopork", "nobeef", "nochicken", "noseafood", "halal", "vegetarian"];

/**
 * The "Decide for me" block of the hub: a budget chip row, a diet chip row and
 * one big button. A plain `<form method="get">` to `/eat/pick`, so it works
 * without JavaScript. Every other active filter (type, avoid, feel,
 * stall, open, and any diet not offered as a chip) is sent along as a hidden
 * field, so "Decide for me" respects the whole filter state.
 */
export function DecideBlock({ locale, filters, headingLevel = 2 }: DecideBlockProps) {
  // Everything except the two things this form edits.
  const hidden = new URLSearchParams(
    serialise({
      ...filters,
      max: undefined,
      diet: filters.diet.filter((diet) => !DECIDE_DIETS.includes(diet)),
    }),
  );
  // A budget that is not one of the chips (for example 55 from the filter form) rides along unchanged.
  const customMax = filters.max !== undefined && !DECIDE_BUDGETS.includes(filters.max as 40 | 50 | 60) ? String(filters.max) : undefined;

  return (
    <section aria-labelledby="eat-decide-title" className="fun-panel rounded-panel p-[var(--space-4)] md:p-[var(--space-6)]">
      <SpinListener />
      <div aria-hidden="true" className="fun-floaters">
        {FLOATERS.map((emoji, index) => (
          <span key={emoji} style={{ "--i": index } as React.CSSProperties}>
            {emoji}
          </span>
        ))}
      </div>
      <div className="flex items-start gap-[var(--space-3)] pt-[var(--space-6)] sm:pt-0 sm:pr-[10rem]">
        <span aria-hidden="true" className="fun-badge">
          <DiceIcon size={32} />
        </span>
        <div className="flex min-w-0 flex-col gap-[var(--space-1)]">
          <Heading level={headingLevel} id="eat-decide-title" className="m-0 text-2xl">
            <span className="fun-squiggle">{t(EAT.decideTitle, locale)}</span>
          </Heading>
          <p className="m-0 text-ink-900">{t(EAT.decideHint, locale)}</p>
        </div>
      </div>

      <form method="get" action={localePath(locale, "/eat/pick")} className="mt-[var(--space-4)] flex flex-col gap-[var(--space-4)]">
        {[...hidden.entries()].map(([name, value]) => (
          <input key={`${name}-${value}`} type="hidden" name={name} value={value} />
        ))}
        {customMax ? <input type="hidden" name="max" value={customMax} /> : null}

        {customMax ? null : (
          <ChoiceGroup
            id="eat-decide-max"
            legend={t(EAT.budgetLegend, locale)}
            name="max"
            kind="radio"
            layout="chips"
            className="fun-chips"
            selected={[filters.max === undefined ? "" : String(filters.max)]}
            choices={[
              ...DECIDE_BUDGETS.map((step) => ({ value: String(step), label: eat.baht(locale, step) })),
              { value: "", label: t(EAT.budgetAny, locale) },
            ]}
          />
        )}

        <ChoiceGroup
          id="eat-decide-diet"
          legend={t(EAT.dietLegend, locale)}
          name="diet"
          kind="checkbox"
          layout="chips"
          className="fun-chips"
          selected={filters.diet}
          choices={DECIDE_DIETS.map((diet) => ({
            value: diet,
            label: DIET_SHORT_LABEL[diet][locale],
            icon: <DietIcon diet={diet} />,
          }))}
        />

        <div>
          <Button type="submit" className="fun-roll w-full gap-[var(--space-3)] sm:w-auto">
            <span aria-hidden="true" className="fun-die">
              <DiceIcon size={28} />
            </span>
            {t(EAT.decideButton, locale)}
          </Button>
        </div>
      </form>
    </section>
  );
}
