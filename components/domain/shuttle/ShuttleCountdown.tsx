"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n/config";
import { bangkokMinutesOfDay } from "@/lib/i18n/format";
import { UI } from "@/lib/i18n/strings";
import { liveRegionProps } from "@/lib/a11y";

interface ShuttleCountdownProps {
  locale: Locale;
  /** Minutes since midnight, Asia/Bangkok, that the tracked departure reaches the stop this countdown is for. */
  targetStopMinutesOfDay: number;
  /** The countdown as computed on the server at render time. This is what paints before hydration and with JavaScript off, so it must already be a complete, correct answer on its own, not a placeholder. */
  initialMinutesUntil: number;
}

/**
 * Ticks the "in N min" countdown client-side so it does not go stale while
 * the tab stays open. This is a refinement of a number already computed on
 * the server, never a replacement for it: `initialMinutesUntil` is the
 * no-JS baseline required by this component's spec, and everything below
 * only makes that number keep pace with the clock.
 *
 * There is no vehicle position behind this number, only the published
 * timetable (see `lib/shuttle/schedule.ts`). Ticking it is a text update on
 * a schedule the reader already saw as "Scheduled", not a countdown styled
 * to imply live tracking, and there is deliberately no pulsing dot or
 * animation here.
 *
 * Two accessibility decisions, both required by the task brief:
 *   - Readers who prefer reduced motion get the server-computed value once
 *     and no further automatic updates. A number that keeps changing on its
 *     own is a form of motion even without any visual animation (2.2.2
 *     Pause, Stop, Hide covers auto-updating content, not just moving
 *     pixels), and it is not essential: reloading the page recomputes it.
 *   - Updates are announced politely (4.1.3), never assertively. Nothing
 *     about a departure getting a minute closer demands the reader's
 *     immediate attention the way a newly-critical service alert would.
 */
export function ShuttleCountdown({ locale, targetStopMinutesOfDay, initialMinutesUntil }: ShuttleCountdownProps) {
  const [minutesUntil, setMinutesUntil] = useState(initialMinutesUntil);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    function tick() {
      setMinutesUntil(targetStopMinutesOfDay - bangkokMinutesOfDay(new Date()));
    }

    // 30 seconds is plenty of headroom for a countdown that only ever
    // changes at minute resolution; there is nothing to gain from a faster
    // tick and it would only cost battery.
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [targetStopMinutesOfDay]);

  return (
    <span {...liveRegionProps("polite")}>
      {minutesUntil <= 0 ? UI.departingNow[locale] : `${UI.departsIn[locale]} ${minutesUntil} ${UI.minutes[locale]}`}
    </span>
  );
}
