import { Button } from "@/components/ui/Button";
import { Heading } from "@/components/ui/Heading";
import { TextInput } from "@/components/ui/TextInput";
import { serialise, type CanteenFilters } from "@/lib/canteen/params";
import { localePath, type Locale } from "@/lib/i18n/config";

import { ChoiceGroup } from "../ChoiceGroup";
import { eat, t } from "../strings";
import { BUDGET } from "./strings";

/** The quick amounts. Anything else goes in the box. */
export const MEAL_BUDGETS: readonly number[] = [40, 50, 60, 80, 100];

interface MealFormProps {
  locale: Locale;
  filters: CanteenFilters;
  sameStall: boolean;
}

/**
 * "I have X baht": a plain GET form to /eat/meal. The chips and the box both
 * write the budget (`max`, the same parameter the filter form uses, so the
 * two never disagree). The box wins when it holds a number, as in the filter
 * form. Every other filter rides along as a hidden field.
 */
export function MealForm({ locale, filters, sameStall }: MealFormProps) {
  const hidden = new URLSearchParams(serialise({ ...filters, max: undefined, variants: false }));
  const custom = filters.max !== undefined && !MEAL_BUDGETS.includes(filters.max);

  return (
    <section aria-labelledby="meal-form-title" className="rounded-panel bg-welfare-soft p-[var(--space-4)] sm:p-[var(--space-6)]">
      <Heading level={2} id="meal-form-title" visualLevel={3} className="m-0 mb-[var(--space-4)]">
        {t(BUDGET.mealFormTitle, locale)}
      </Heading>
      <form method="get" action={localePath(locale, "/eat/meal")} className="flex flex-col gap-[var(--space-4)]">
        {[...hidden.entries()].map(([name, value]) => (
          <input key={`${name}-${value}`} type="hidden" name={name} value={value} />
        ))}
        {filters.variants ? <input type="hidden" name="variants" value="1" /> : null}

        <ChoiceGroup
          id="meal-max"
          legend={t(BUDGET.budgetLegend, locale)}
          name="max"
          kind="radio"
          layout="chips"
          selected={[filters.max !== undefined && !custom ? String(filters.max) : ""]}
          choices={MEAL_BUDGETS.map((amount) => ({ value: String(amount), label: eat.baht(locale, amount) }))}
        />
        <TextInput
          id="meal-max-other"
          name="maxOther"
          type="number"
          inputMode="numeric"
          min={1}
          max={5000}
          step={1}
          label={t(BUDGET.budgetOther, locale)}
          defaultValue={custom ? filters.max : undefined}
          className="max-w-[14rem]"
        />

        <div className="flex items-start gap-[var(--space-2)]">
          <input id="meal-same" type="checkbox" name="same" value="1" defaultChecked={sameStall} className="mt-[3px] h-[1.25rem] w-[1.25rem] shrink-0" />
          <label htmlFor="meal-same" className="text-base text-ink-900">
            {t(BUDGET.sameStall, locale)}
            <span className="block text-sm text-ink-600">{t(BUDGET.sameStallHint, locale)}</span>
          </label>
        </div>

        <div>
          <Button type="submit">
            {t(BUDGET.mealSubmit, locale)}
          </Button>
        </div>
      </form>
    </section>
  );
}
