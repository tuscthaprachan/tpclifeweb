"use client";

import { useSyncExternalStore } from "react";

import { cx } from "@/components/ui/cx";
import { device } from "@/lib/canteen";
import type { Locale } from "@/lib/i18n/config";

import { t } from "../strings";
import { BUDGET, budget } from "./strings";

interface SpendThisWeekProps {
  locale: Locale;
  /** Show the explanation under the figure. Defaults to true; pass false in a tight spot that links to /eat/mine instead. */
  explain?: boolean;
  className?: string;
}

const subscribeNever = () => () => {};
let storageProbe: boolean | undefined;
function storageReady(): boolean {
  if (storageProbe === undefined) storageProbe = device.isStorageAvailable();
  return storageProbe;
}

/**
 * "You've logged 230 of 400 baht this week", from the device. Counts only
 * what the student tapped "I'll eat this" for, and says so. The target is the
 * budget of the saved week if there is one; otherwise it is just the total.
 * Renders nothing until JavaScript runs and only when the device can keep data.
 */
export function SpendThisWeek({ locale, explain = true, className }: SpendThisWeekProps) {
  const ready = useSyncExternalStore(subscribeNever, storageReady, () => false);
  const spent = useSyncExternalStore(device.subscribe, () => device.spendThisWeek(new Date()), () => 0);
  const saved = useSyncExternalStore(device.subscribe, () => device.getSavedWeek(), () => null);
  if (!ready) return null;

  const target = saved?.budget;
  const diff = target === undefined ? undefined : target - spent;

  return (
    <div className={cx("flex flex-col gap-[var(--space-1)] rounded-panel border border-line bg-surface p-[var(--space-4)]", className)}>
      <p className="m-0 text-lg font-semibold text-ink-900">
        {target === undefined ? budget.loggedTotal(locale, spent) : budget.logged(locale, spent, target)}
      </p>
      {diff !== undefined ? (
        <p className="m-0 text-ink-900">{diff >= 0 ? budget.underTarget(locale, diff) : budget.overTarget(locale, -diff)}</p>
      ) : null}
      {explain ? (
        <>
          <p className="m-0 text-sm text-ink-600">{t(BUDGET.spendOnlyNote, locale)}</p>
          {target === undefined ? <p className="m-0 text-sm text-ink-600">{t(BUDGET.spendNoTarget, locale)}</p> : null}
        </>
      ) : null}
    </div>
  );
}
