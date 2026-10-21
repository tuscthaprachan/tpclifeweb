import { Button } from "@/components/ui/Button";
import { Heading } from "@/components/ui/Heading";
import { TextInput } from "@/components/ui/TextInput";
import type { CanteenFilters } from "@/lib/canteen/params";
import { localePath, type Locale } from "@/lib/i18n/config";

import { ChoiceGroup } from "../ChoiceGroup";
import { t } from "../strings";
import { BUDGET, MONDAY_FIRST, WEEKDAY_NAME } from "./strings";
import { MAX_WEEK_BUDGET, weekQuery, type WeekRequest } from "./week-params";

interface WeekFormProps {
  locale: Locale;
  request: WeekRequest;
  filters: CanteenFilters;
}

/**
 * The week's form: a plain GET to /eat/week. The days send an empty `days`
 * first, so unticking every day reads as "no days" and not "use the default".
 * The seed, the pins and the filters ride along as hidden fields, so changing
 * the budget or the days keeps the plan as stable as the change allows.
 */
export function WeekForm({ locale, request, filters }: WeekFormProps) {
  const hidden = new URLSearchParams(weekQuery(request, filters));
  hidden.delete("budget");
  hidden.delete("days");

  return (
    <section aria-labelledby="week-form-title" className="no-print rounded-panel bg-welfare-soft p-[var(--space-4)] sm:p-[var(--space-6)]">
      <Heading level={2} id="week-form-title" className="m-0 mb-[var(--space-4)] text-xl">
        {t(BUDGET.weekFormTitle, locale)}
      </Heading>
      <form method="get" action={localePath(locale, "/eat/week")} className="flex flex-col gap-[var(--space-4)]">
        {[...hidden.entries()].map(([name, value]) => (
          <input key={`${name}-${value}`} type="hidden" name={name} value={value} />
        ))}
        <input type="hidden" name="days" value="" />

        <TextInput
          id="week-budget"
          name="budget"
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_WEEK_BUDGET}
          step={1}
          required
          label={t(BUDGET.weekBudgetLabel, locale)}
          hint={t(BUDGET.weekBudgetHint, locale)}
          defaultValue={request.budget}
          className="max-w-[14rem]"
        />

        <ChoiceGroup
          id="week-days"
          legend={t(BUDGET.daysLegend, locale)}
          name="days"
          kind="checkbox"
          layout="chips"
          selected={request.days.map(String)}
          choices={MONDAY_FIRST.map((day) => ({ value: String(day), label: WEEKDAY_NAME[day]![locale] }))}
        />

        <div>
          <Button type="submit">{t(BUDGET.weekSubmit, locale)}</Button>
        </div>
      </form>
    </section>
  );
}
