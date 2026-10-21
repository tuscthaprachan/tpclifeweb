import Link from "next/link";

import { Timestamp } from "@/components/ui/Timestamp";
import type { CanteenFilters } from "@/lib/canteen/params";
import type { WeekResult } from "@/lib/canteen/week";
import { pick, OTHER_LOCALE, type Locale } from "@/lib/i18n/config";

import { dishHref, stallHref } from "../links";
import { EAT, eat, t } from "../strings";
import { BUDGET, WEEKDAY_NAME, budget } from "./strings";
import { lockDay, rerollAll, rerollDay, unlockDay, weekHref, type WeekRequest } from "./week-params";
import "./week.css";

interface WeekPlannerProps {
  locale: Locale;
  /** A successful plan from `planWeek`. */
  plan: Extract<WeekResult, { ok: true }>;
  request: WeekRequest;
  filters: CanteenFilters;
  /** The page's own path with the locale, for example "/en/eat/plan". */
  path: string;
}

const ANCHOR = "week-plan";

/**
 * The plan as a table: one row per day with the dish, the stall, the price
 * and links to lock or unlock the day and to reroll just that day. Everything
 * is a link, so it works without JavaScript, and every link names the day it
 * acts on. The same table is what prints: the actions hide, the plan stays.
 */
export function WeekPlanner({ locale, plan, request, filters, path }: WeekPlannerProps) {
  const pinDays = plan.days.map((day) => ({ weekday: day.weekday, slug: day.dish.slug.current, locked: day.locked }));
  const href = (next: WeekRequest) => weekHref(path, next, filters, ANCHOR);
  const budgetAmount = request.budget ?? plan.total + plan.change;
  const allowance = Math.round(plan.allowance * 10) / 10;
  const other = OTHER_LOCALE[locale];

  return (
    <section id={ANCHOR} aria-labelledby="week-plan-title" className="week-plan flex flex-col gap-[var(--space-4)]">
      <div className="flex flex-col gap-[var(--space-1)]">
        <h2 id="week-plan-title" className="m-0 text-xl">
          {t(BUDGET.printHeading, locale)}
        </h2>
        <p className="m-0 text-ink-600">{budget.weekSummary(locale, plan.days.length, budgetAmount)}</p>
      </div>

      <dl className="m-0 grid grid-cols-2 gap-[var(--space-3)] sm:grid-cols-4">
        {[
          [t(BUDGET.weekBudgetWord, locale), eat.baht(locale, budgetAmount)],
          [t(BUDGET.allowance, locale), eat.baht(locale, allowance)],
          [t(BUDGET.weekTotal, locale), eat.baht(locale, plan.total)],
          [t(BUDGET.weekChange, locale), eat.baht(locale, plan.change)],
        ].map(([term, value]) => (
          <div key={term} className="rounded-panel border border-line bg-surface p-[var(--space-3)]">
            <dt className="text-sm text-ink-600">{term}</dt>
            <dd className="m-0 text-lg font-semibold text-ink-900">{value}</dd>
          </div>
        ))}
      </dl>

      <table className="week-table">
        <caption>{t(BUDGET.planTableCaption, locale)}</caption>
        <thead>
          <tr>
            <th scope="col">{t(BUDGET.colDay, locale)}</th>
            <th scope="col">{t(BUDGET.colDish, locale)}</th>
            <th scope="col">{t(BUDGET.colStall, locale)}</th>
            <th scope="col">{t(BUDGET.colPrice, locale)}</th>
            <th scope="col" className="no-print">
              {t(BUDGET.colActions, locale)}
            </th>
          </tr>
        </thead>
        <tbody>
          {plan.days.map((day) => {
            const dayName = WEEKDAY_NAME[day.weekday]![locale];
            const name = pick(day.dish.name, locale);
            const otherName = pick(day.dish.name, other);
            return (
              <tr key={day.weekday}>
                <th scope="row">
                  {dayName}
                  {day.locked ? (
                    <span className="ml-[var(--space-2)] rounded-pill border border-line-strong px-[var(--space-2)] text-sm font-medium text-ink-900">
                      {t(BUDGET.lockedTag, locale)}
                    </span>
                  ) : null}
                </th>
                <td data-label={t(BUDGET.colDish, locale)}>
                  <Link href={dishHref(locale, day.dish.slug.current, filters)} className="font-medium">
                    {name}
                  </Link>
                  {otherName && otherName !== name ? (
                    <span lang={other} className="block text-sm text-ink-600">
                      {otherName}
                    </span>
                  ) : null}
                </td>
                <td data-label={t(BUDGET.colStall, locale)}>
                  <Link href={stallHref(locale, day.stall.slug.current, filters)}>
                    {eat.stallFull(locale, day.stall.number, pick(day.stall.name, locale))}
                  </Link>
                </td>
                <td data-label={t(BUDGET.colPrice, locale)}>
                  <span className="font-semibold text-ink-900">{eat.baht(locale, day.price)}</span>
                  {day.dish.checkedOn ? (
                    <span className="block text-base text-ink-600">
                      {t(EAT.priceCheckedOn, locale)} <Timestamp value={day.dish.checkedOn} locale={locale} />
                    </span>
                  ) : null}
                </td>
                <td className="no-print">
                  <div className="week-actions">
                    {day.locked ? (
                      <Link
                        href={href(unlockDay(request, pinDays, day.weekday))}
                        aria-label={budget.unlockLabel(locale, dayName)}
                        className="inline-flex min-h-[var(--target-min)] items-center"
                        scroll={false}
                      >
                        {t(BUDGET.unlock, locale)}
                      </Link>
                    ) : (
                      <>
                        <Link
                          href={href(lockDay(request, pinDays, day.weekday))}
                          aria-label={budget.lockLabel(locale, dayName)}
                          className="inline-flex min-h-[var(--target-min)] items-center"
                          scroll={false}
                        >
                          {t(BUDGET.lock, locale)}
                        </Link>
                        <Link
                          href={href(rerollDay(request, pinDays, day.weekday))}
                          aria-label={budget.rerollLabel(locale, dayName)}
                          className="inline-flex min-h-[var(--target-min)] items-center"
                          scroll={false}
                        >
                          {t(BUDGET.reroll, locale)}
                        </Link>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">{t(BUDGET.weekTotal, locale)}</th>
            <td data-label="" />
            <td data-label="" />
            <td data-label="">
              {eat.baht(locale, plan.total)} · {budget.left(locale, plan.change)}
            </td>
            <td className="no-print" />
          </tr>
        </tfoot>
      </table>

      <p className="no-print m-0">
        <Link href={href(rerollAll(request, pinDays))} className="inline-flex min-h-[var(--target-min)] items-center font-medium" scroll={false}>
          {t(BUDGET.newPlan, locale)}
        </Link>{" "}
        <span className="text-sm text-ink-600">{t(BUDGET.newPlanHint, locale)}</span>
      </p>
    </section>
  );
}
