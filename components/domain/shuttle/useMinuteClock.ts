"use client";

import { useEffect, useState } from "react";
import { msUntilNextMinute } from "@/lib/shuttle/ticker";

/** The current instant, starting from the server's and moving on at each minute boundary. */
export function useMinuteClock(serverNowIso: string): Date {
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

  return new Date(nowMs);
}
