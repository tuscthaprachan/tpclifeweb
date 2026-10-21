"use client";

import { useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/Button";
import { device } from "@/lib/canteen";
import { localePath, type Locale } from "@/lib/i18n/config";

import { t } from "../strings";
import { BUDGET } from "./strings";

interface SaveWeekButtonProps {
  locale: Locale;
  seed: string;
  /** Weekly budget in baht. */
  budget: number;
  days: ReadonlyArray<{ weekday: number; slug: string; price: number }>;
}

let storageProbe: boolean | undefined;
function storageReady(): boolean {
  if (storageProbe === undefined) storageProbe = device.isStorageAvailable();
  return storageProbe;
}
const subscribeNever = () => () => {};

/**
 * Two small client-only actions under the plan: keep this week on the device,
 * and print. Both need JavaScript, so neither is there until it runs; the
 * plan itself, and printing from the browser menu, work without it. Nothing
 * is claimed saved unless the write succeeded.
 */
export function SaveWeekButton({ locale, seed, budget, days }: SaveWeekButtonProps) {
  const ready = useSyncExternalStore(subscribeNever, storageReady, () => false);
  const hasSaved = useSyncExternalStore(device.subscribe, () => device.getSavedWeek() !== null, () => false);
  const [result, setResult] = useState<"saved" | "failed" | null>(null);

  return (
    <div className="no-print flex flex-col gap-[var(--space-2)]">
      <div className="flex flex-wrap items-center gap-[var(--space-3)]">
        {ready ? (
          <Button
            variant="secondary"
            type="button"
            onClick={() =>
              setResult(
                device.setSavedWeek({ seed, budget, days: days.map((day) => ({ ...day })), savedAt: new Date().toISOString() })
                  ? "saved"
                  : "failed",
              )
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
          <>
            {t(BUDGET.saveWeekDone, locale)}{" "}
            <a href={localePath(locale, "/eat/mine")} className="font-medium">
              {t(BUDGET.openMine, locale)}
            </a>
          </>
        ) : null}
        {result === "failed" ? t(BUDGET.saveWeekFailed, locale) : null}
      </div>
    </div>
  );
}

function PrintButton({ locale }: { locale: Locale }) {
  const ready = useSyncExternalStore(subscribeNever, () => true, () => false);
  if (!ready) return null;
  return (
    <Button variant="quiet" type="button" onClick={() => window.print()}>
      {t(BUDGET.printButton, locale)}
    </Button>
  );
}
