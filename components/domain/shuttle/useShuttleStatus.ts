"use client";

import { useEffect, useMemo, useState } from "react";
import type { ShuttleRoute } from "@/lib/content/types";
import { getShuttleStatus, type ShuttleStatus } from "@/lib/shuttle/schedule";
import { msUntilNextMinute } from "@/lib/shuttle/ticker";

/** A scheduled status and the instant it was evaluated at. */
export interface ShuttleClock {
  status: ShuttleStatus;
  /** The instant the status was evaluated at. */
  now: Date;
}

/**
 * The scheduled status of `route`, re-evaluated on every minute boundary so it
 * moves on to the next departure and to "finished for today" without a reload.
 * The first render uses the server's `serverNowIso`, so hydration matches; the
 * clock is then read once after mount to correct a cached page. This is a
 * timetable calculation, not a vehicle position. Readers who prefer reduced
 * motion keep the server's answer with no further updates (2.2.2).
 */
export function useShuttleStatus(route: ShuttleRoute, serverNowIso: string, count = 2): ShuttleClock {
  const [nowMs, setNowMs] = useState(() => new Date(serverNowIso).getTime());

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer: number;
    const tick = () => {
      const now = new Date();
      setNowMs(now.getTime());
      timer = window.setTimeout(tick, msUntilNextMinute(now));
    };
    timer = window.setTimeout(tick, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return useMemo(() => {
    const now = new Date(nowMs);
    return { status: getShuttleStatus(route, now, { count }), now };
  }, [route, nowMs, count]);
}
