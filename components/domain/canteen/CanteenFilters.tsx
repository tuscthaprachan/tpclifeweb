import Link from "next/link";
import { Details } from "@/components/ui/Details";
import { Select } from "@/components/ui/Select";
import { TextInput } from "@/components/ui/TextInput";
import type { FacetCounts } from "@/lib/canteen/filter";
import { BUDGET_STEPS, DISH_TYPES } from "@/lib/canteen/options";
import {
  DEFAULT_GROUP,
  DEFAULT_SORT,
  DIET_KEYS,
  FEEL_KEYS,
  GROUP_KEYS,
  SORT_KEYS,
  countActiveValues,
  defaultFilters,
  serialise,
  type CanteenFilters as Filters,
} from "@/lib/canteen/params";
import { pick, type Locale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";
import type { CanteenStall } from "@/lib/sanity/types";
import { ChoiceGroup } from "./ChoiceGroup";
import { foldRetiredAvoid, OFFERED_AVOID_KEYS } from "./chips";
import { FilterForm } from "./FilterForm";
import { DietIcon, DishTypeIcon } from "./icons";
import { AVOID_LABEL, DIET_LABEL, FEEL_LABEL, GROUP_LABEL, SORT_LABEL, TYPE_LABEL } from "./labels";
import { EAT, eat, t } from "./strings";

interface CanteenFiltersProps {
  locale: Locale;
  filters: Filters;
  /** From `facetCounts(data, filters, now)`. Every option shows its count. */
  counts: FacetCounts;
  /** The stalls for the stall select, in walking order. */
  stalls: readonly CanteenStall[];
  /** Where the form submits, with the locale prefix. */
  action: string;
  /**
   * Makes every id unique when the form appears more than once on a page
   * (a column, a dialog and a no JavaScript copy), so each label points at
   * its own input. Short, lowercase, letters and digits.
   */
  idPrefix: string;
  /** Which display choices to offer: sort and group for the dish list, none for the stall list. */
  display?: "dishes" | "none";
  /** Request parameters the form must not lose, for example `seed`. */
  carry?: Record<string, string>;
  /** Which facets to offer. Defaults to all. A page can leave some out, for example `stall` on a stall page. */
  hide?: ReadonlyArray<"max" | "stall" | "open">;
  /** True inside the phone Dialog: the submit button and a "Clear all" link stick to the bottom of its scroll area. */
  sticky?: boolean;
}

/** "Allergies and dislikes (2)": the section name with how many of its values are on. */
function withCount(label: string, count: number, locale: Locale): string {
  return count > 0 ? `${label} (${formatNumber(count, locale)})` : label;
}


/**
 * The filter form, used as a column on desktop and inside the Dialog on
 * mobile (see `ActiveFilterBar`). A real `<form method="get">`: every facet is
 * a native input inside a fieldset with a legend, there is a submit button,
 * and it works with JavaScript off. A small client wrapper (`FilterForm`)
 * adds instant apply and nothing else. Server rendered, so the counts in
 * brackets are computed on the server too.
 *
 * Budget, diet, type and feel stay open. "Allergies and dislikes", "Stall" and
 * "Sort and group" are collapsed sections that start open when any of their
 * values is set, and show how many are. Their fieldsets and labels are
 * unchanged. The amount box shows only when "Other" is chosen, where the
 * browser supports `:has`; elsewhere it is always visible.
 *
 * Options that would give no dishes are disabled and show "(0)"; they are
 * never hidden, so the layout does not move. The "Leave out" group is labelled
 * as a preference, not an allergy tool.
 */
export function CanteenFilters({ locale, filters, counts, stalls, action, idPrefix, display = "dishes", carry, hide = [], sticky = false }: CanteenFiltersProps) {
  const id = (name: string) => `${idPrefix}-${name}`;
  const shown = foldRetiredAvoid(filters.diet, filters.avoid);
  const maxIsChip = filters.max === undefined || BUDGET_STEPS.includes(filters.max);
  const stallCount = filters.stall !== undefined && !hide.includes("stall") ? 1 : 0;
  const displayCount = (filters.sort !== DEFAULT_SORT ? 1 : 0) + (filters.group !== DEFAULT_GROUP ? 1 : 0);
  const clearQuery = new URLSearchParams(serialise({ ...defaultFilters(), sort: filters.sort, group: filters.group }));
  for (const [name, value] of Object.entries(carry ?? {})) if (value !== "" && !clearQuery.has(name)) clearQuery.set(name, value);
  const clearHref = clearQuery.size > 0 ? `${action}?${clearQuery}` : action;
  const clear =
    sticky && countActiveValues(filters) > 0 ? (
      <Link href={clearHref} scroll={false} className="inline-flex min-h-[var(--target-min)] items-center px-[var(--space-2)] text-base">
        {t(EAT.clearAll, locale)}
      </Link>
    ) : null;

  return (
    <FilterForm
      action={action}
      carry={carry}
      queryKey={serialise(filters)}
      submitLabel={eat.showDishes(locale, counts.total)}
      footer={sticky ? "sticky" : "flow"}
      clear={clear}
    >
      {/* Budget */}
      {hide.includes("max") ? null : (
        <div className="flex flex-col gap-[var(--space-3)] [&:not(:has(input[name=max][value=other]:checked))_.max-other]:hidden">
          <ChoiceGroup
            id={id("max")}
            legend={t(EAT.budgetFilterLegend, locale)}
            hint={t(EAT.budgetFilterHint, locale)}
            name="max"
            kind="radio"
            layout="chips"
            selected={[maxIsChip ? (filters.max === undefined ? "" : String(filters.max)) : "other"]}
            choices={[
              { value: "", label: t(EAT.budgetAny, locale), count: counts.max.any },
              ...BUDGET_STEPS.map((step) => ({ value: String(step), label: eat.baht(locale, step), count: counts.max[String(step)] })),
              { value: "other", label: t(EAT.budgetOtherChoice, locale) },
            ]}
          />
          <TextInput
            id={id("max-other")}
            name="maxOther"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            label={t(EAT.budgetOther, locale)}
            defaultValue={maxIsChip ? undefined : filters.max}
            className="max-other max-w-[10rem]"
          />
          <div className="flex min-h-[var(--target-min)] items-center gap-[var(--space-2)]">
            <input id={id("variants")} type="checkbox" name="variants" value="1" defaultChecked={filters.variants} className="m-0 size-6 min-h-0 min-w-0 shrink-0" />
            <label htmlFor={id("variants")} className="flex min-h-[var(--target-min)] flex-1 items-center text-base text-ink-900">
              {t(EAT.variantsLabel, locale)}
            </label>
          </div>
        </div>
      )}

      <ChoiceGroup
        id={id("diet")}
        legend={t(EAT.dietFilterLegend, locale)}
        hint={t(EAT.dietFilterHint, locale)}
        name="diet"
        kind="checkbox"
        selected={shown.diet}
        choices={DIET_KEYS.map((key) => ({
          value: key,
          label: DIET_LABEL[key][locale],
          count: counts.diet[key],
          icon: <DietIcon diet={key} />,
        }))}
      />

      <ChoiceGroup
        id={id("type")}
        legend={t(EAT.typeLegend, locale)}
        name="type"
        kind="checkbox"
        selected={filters.type}
        choices={DISH_TYPES.map((key) => ({
          value: key,
          label: TYPE_LABEL[key][locale],
          count: counts.type[key],
          icon: <DishTypeIcon type={key} />,
        }))}
      />

      <ChoiceGroup
        id={id("feel")}
        legend={t(EAT.feelLegend, locale)}
        name="feel"
        kind="checkbox"
        layout="chips"
        selected={filters.feel}
        choices={FEEL_KEYS.map((key) => ({ value: key, label: FEEL_LABEL[key][locale], count: counts.feel[key] }))}
      />

      {hide.includes("open") || (counts.open === 0 && !filters.open) ? null : (
        <ChoiceGroup
          id={id("open")}
          legend={t(EAT.openLegend, locale)}
          hint={t(EAT.openHint, locale)}
          name="open"
          kind="checkbox"
          selected={filters.open ? ["1"] : []}
          choices={[{ value: "1", label: t(EAT.openLabel, locale), count: counts.open }]}
        />
      )}

      <Details summary={withCount(t(EAT.avoidSection, locale), shown.avoid.length, locale)} defaultOpen={shown.avoid.length > 0}>
      <ChoiceGroup
        id={id("avoid")}
        legend={t(EAT.avoidLegend, locale)}
        hint={t(EAT.avoidHint, locale)}
        name="avoid"
        kind="checkbox"
        selected={shown.avoid}
        choices={OFFERED_AVOID_KEYS.map((key) => ({ value: key, label: AVOID_LABEL[key][locale], count: counts.avoid[key] }))}
      />
      </Details>

      {hide.includes("stall") ? null : (
        <Details summary={withCount(t(EAT.stallSection, locale), stallCount, locale)} defaultOpen={stallCount > 0}>
          <div className="flex min-w-0 flex-col gap-[var(--space-2)]">
            <label htmlFor={id("stall")} className="visually-hidden">
              {t(EAT.stallLabel, locale)}
            </label>
            <select
              id={id("stall")}
              name="stall"
              defaultValue={filters.stall ?? ""}
              className="min-h-[var(--target-min)] max-w-full rounded-control border border-line-strong bg-surface px-[var(--space-3)] py-[var(--space-2)] text-base text-ink-900"
            >
              <option value="">{t(EAT.stallAny, locale)}</option>
              {stalls.map((stall) => {
                const count = counts.stall[stall.slug.current] ?? 0;
                return (
                  <option key={stall._id} value={stall.slug.current} disabled={count === 0 && filters.stall !== stall.slug.current}>
                    {eat.stallFull(locale, stall.number, pick(stall.name, locale))} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        </Details>
      )}

      {display === "dishes" ? (
        <Details summary={withCount(t(EAT.displaySection, locale), displayCount, locale)} defaultOpen={displayCount > 0}>
          <div className="flex flex-col gap-[var(--space-3)]">
            <Select
              id={id("sort")}
              name="sort"
              label={t(EAT.sortLabel, locale)}
              defaultValue={filters.sort}
              options={SORT_KEYS.map((key) => ({ value: key, label: SORT_LABEL[key][locale] }))}
            />
            <Select
              id={id("group")}
              name="group"
              label={t(EAT.groupLabel, locale)}
              defaultValue={filters.group}
              options={GROUP_KEYS.map((key) => ({ value: key, label: GROUP_LABEL[key][locale] }))}
            />
          </div>
        </Details>
      ) : null}
    </FilterForm>
  );
}
