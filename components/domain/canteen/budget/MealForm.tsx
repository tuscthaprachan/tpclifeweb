import Form from "next/form";
import { Button } from "@/components/ui/Button";
import { Heading } from "@/components/ui/Heading";
import { TextInput } from "@/components/ui/TextInput";
import { serialise, type CanteenFilters } from "@/lib/canteen/params";
import { localePath, type Locale } from "@/lib/i18n/config";

import { ChoiceGroup } from "../ChoiceGroup";
import { eat, t } from "../strings";
import { BUDGET } from "./strings";
import "./meal-form.css";

/** The quick amounts. Anything else is typed after choosing "Other". */
export const MEAL_BUDGETS: readonly number[] = [40, 50, 60, 80, 100];

interface MealFormProps {
  locale: Locale;
  filters: CanteenFilters;
  /** The whole-meal budget in the address, if any. */
  meal?: number;
  sameStall: boolean;
  /** What was typed when it is not a valid budget, shown back with an error. */
  invalid?: string;
}

/**
 * "I have X baht": a plain GET form to /eat/plan, the default mode. The budget
 * is one choice: a chip, or "Other" with an amount box. They write `meal`, the
 * whole-meal budget, never `max`, which stays the filters' highest price per
 * dish. The box is read only when "Other" is chosen, and a stylesheet hides it
 * otherwise where `:has` is supported. Every filter rides along as a hidden
 * field.
 */
export function MealForm({ locale, filters, meal, sameStall, invalid }: MealFormProps) {
  const hidden = new URLSearchParams(serialise({ ...filters, variants: false }));
  const custom = invalid !== undefined || (meal !== undefined && !MEAL_BUDGETS.includes(meal));
  const typed = invalid !== undefined ? (invalid === "other" ? undefined : invalid) : custom ? meal : undefined;

  return (
    <section aria-labelledby="meal-form-title" className="border-t border-line pt-[var(--space-6)]">
      <Heading level={2} id="meal-form-title" className="m-0 mb-[var(--space-4)] text-xl">
        {t(BUDGET.mealFormTitle, locale)}
      </Heading>
      <Form action={localePath(locale, "/eat/plan")} className="meal-form flex flex-col gap-[var(--space-4)]">
        {[...hidden.entries()].map(([name, value]) => (
          <input key={`${name}-${value}`} type="hidden" name={name} value={value} />
        ))}
        {filters.variants ? <input type="hidden" name="variants" value="1" /> : null}

        <ChoiceGroup
          id="meal-budget"
          legend={t(BUDGET.budgetLegend, locale)}
          name="meal"
          kind="radio"
          layout="chips"
          selected={[meal === undefined ? "" : custom ? "other" : String(meal)]}
          choices={[
            ...MEAL_BUDGETS.map((amount) => ({ value: String(amount), label: eat.baht(locale, amount) })),
            { value: "other", label: t(BUDGET.budgetOtherChoice, locale) },
          ]}
        />
        <TextInput
          id="meal-other"
          name="mealOther"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          label={t(BUDGET.budgetOther, locale)}
          defaultValue={typed}
          error={invalid !== undefined ? t(BUDGET.mealInvalid, locale) : undefined}
          className="meal-other max-w-[14rem]"
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
      </Form>
    </section>
  );
}
