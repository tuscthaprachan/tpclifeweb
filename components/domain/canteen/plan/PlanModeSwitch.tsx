import Link from "next/link";

import { cx } from "@/components/ui/cx";
import type { CanteenFilters } from "@/lib/canteen/params";
import type { Locale } from "@/lib/i18n/config";

import { eatHref } from "../links";
import { EAT, t } from "../strings";
import { PLAN_MODES, PLAN_ROUTE, planModeParam, type PlanMode } from "./mode";

interface PlanModeSwitchProps {
  locale: Locale;
  current: PlanMode;
  /** Carried into every link, so switching mode keeps the filters. */
  filters: CanteenFilters;
  className?: string;
}

const LABEL: Record<PlanMode, keyof typeof EAT> = {
  meal: "planModeMeal",
  week: "planModeWeek",
  group: "planModeGroup",
};

/**
 * This meal, the week or a group, as a segmented control of real links. Each
 * is the same page with a different `mode`, so it works without JavaScript,
 * the back button does what you expect and any mode can be shared. The
 * current one is marked with `aria-current="page"`, in a `<nav>` because it
 * navigates.
 */
export function PlanModeSwitch({ locale, current, filters, className }: PlanModeSwitchProps) {
  return (
    <nav aria-label={t(EAT.planModesLabel, locale)} className={cx("no-print", className)}>
      <ul className="m-0 inline-flex max-w-full list-none flex-wrap gap-[var(--space-1)] rounded-panel border border-line bg-surface-alt p-[var(--space-1)]">
        {PLAN_MODES.map((mode) => {
          const selected = mode === current;
          return (
            <li key={mode}>
              <Link
                href={eatHref(locale, PLAN_ROUTE, filters, planModeParam(mode))}
                aria-current={selected ? "page" : undefined}
                scroll={false}
                className={cx(
                  "inline-flex min-h-[var(--target-min)] items-center rounded-panel px-[var(--space-4)] py-[var(--space-2)] text-base no-underline",
                  selected ? "bg-action font-semibold text-action-ink" : "font-medium text-ink-900 hover:bg-surface hover:text-action",
                )}
              >
                {t(EAT[LABEL[mode]], locale)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
