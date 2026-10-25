"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n/config";
import { bangkokMinutesOfDay } from "@/lib/i18n/format";
import { UI } from "@/lib/i18n/strings";

interface ShuttleCountdownProps {
  locale: Locale;
  /** Minutes since midnight, Asia/Bangkok, that the tracked departure reaches the stop this countdown is for. */
  targetStopMinutesOfDay: number;
  /** The countdown as computed on the server at render time. This is what paints before hydration and with JavaScript off, so it must already be a complete, correct answer on its own. */
  initialMinutesUntil: number;
}

/**
 * Keeps the "in N min" text from going stale while the tab stays open. The
 * server-computed value is the complete answer without JavaScript; this only
 * refreshes the visible text once a minute.
 *
 * It is deliberately not a live region: the absolute departure time beside it
 * is the content that matters, and a number changing every minute is not
 * something to announce (4.1.3). Readers who prefer reduced motion get the
 * server value and no further updates (2.2.2).
 */
export function ShuttleCountdown({ locale, targetStopMinutesOfDay, initialMinutesUntil }: ShuttleCountdownProps) {
  const [minutesUntil, setMinutesUntil] = useState(initialMinutesUntil);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = window.setInterval(() => {
      setMinutesUntil(targetStopMinutesOfDay - bangkokMinutesOfDay(new Date()));
    }, 60_000);
    return () => window.clearInterval(id);
  }, [targetStopMinutesOfDay]);

  return (
    <span>{minutesUntil <= 0 ? UI.departingNow[locale] : `${UI.departsIn[locale]} ${minutesUntil} ${UI.minutes[locale]}`}</span>
  );
}
