"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import { useHydrated } from "@/components/hooks/use-hydrated";
import { useStatusMessage } from "@/components/hooks/use-status-message";

import { Button } from "@/components/ui/Button";
import { device } from "@/lib/canteen";
import { planKey, resultForPlan } from "@/lib/canteen/week";
import { localePath, type Locale } from "@/lib/i18n/config";

import { t } from "../strings";
import { useDeviceStorage } from "../use-device-storage";
import { BUDGET } from "./strings";

interface SaveWeekButtonProps {
  locale: Locale;
  seed: string;
  /** Weekly budget in baht. */
  budget: number;
  days: ReadonlyArray<{ weekday: number; slug: string; price: number }>;
}

/**
 * Two small client-only actions under the plan: keep this week on the device,
 * and print. Both need JavaScript, so neither is there until it runs; the
 * plan itself, and printing from the browser menu, work without it. Nothing
 * is claimed saved unless the write succeeded.
 */
export function SaveWeekButton({ locale, seed, budget, days }: SaveWeekButtonProps) {
  const ready = useDeviceStorage() === true;
  const hasSaved = useSyncExternalStore(device.subscribe, () => device.getSavedWeek() !== null, () => false);
  const outcome = useStatusMessage<{ key: string; result: "saved" | "failed" }>();
  const key = planKey({ seed, budget, days });
  const result = resultForPlan(outcome.value, key);

  return (
    <div className="no-print flex flex-col gap-[var(--space-2)]">
      <div className="flex flex-wrap items-center gap-[var(--space-3)]">
        {ready ? (
          <Button
            variant="secondary"
            type="button"
            onClick={() =>
              outcome.show({
                key,
                result: device.setSavedWeek({ seed, budget, days: days.map((day) => ({ ...day })), savedAt: new Date().toISOString() })
                  ? "saved"
                  : "failed",
              })
            }
          >
            {t(BUDGET.saveWeek, locale)}
          </Button>
        ) : null}
        <PrintButton locale={locale} />
      </div>
      {ready ? (
        <p className="m-0 text-sm text-ink-600">
          {t(BUDGET.saveWeekNote, locale)}
          {hasSaved && result === null ? ` ${t(BUDGET.replacesWeek, locale)}` : ""}
        </p>
      ) : null}
      <div role="status" className="text-base text-ink-900">
        {result === "saved" ? (
          <span key={outcome.nonce}>
            {t(BUDGET.saveWeekDone, locale)}{" "}
            <Link href={localePath(locale, "/eat/mine")} className="font-medium">
              {t(BUDGET.openMine, locale)}
            </Link>
          </span>
        ) : null}
        {result === "failed" ? <span key={outcome.nonce}>{t(BUDGET.saveWeekFailed, locale)}</span> : null}
      </div>
    </div>
  );
}

function PrintButton({ locale }: { locale: Locale }) {
  const hydrated = useHydrated();
  if (!hydrated) return null;
  return (
    <Button variant="quiet" type="button" onClick={() => window.print()}>
      {t(BUDGET.printButton, locale)}
    </Button>
  );
}
