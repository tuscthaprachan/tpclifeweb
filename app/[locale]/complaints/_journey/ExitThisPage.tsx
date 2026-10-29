"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

/** A neutral page to leave for. Any ordinary site does the job. */
const EXIT_URL = "https://www.thaipbs.or.th/";

/**
 * The GOV.UK "Exit this page" pattern for a page someone may need to leave at
 * once. It is a plain link, so it works without JavaScript. With JavaScript it
 * also replaces the page in the browser history (so Back does not return to
 * it) and pressing Shift three times in a row does the same.
 */
export function ExitThisPage({ label }: { label: string }) {
  useEffect(() => {
    let presses: number[] = [];
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Shift" || event.repeat) return;
      const now = Date.now();
      presses = [...presses.filter((t) => now - t < 1000), now];
      if (presses.length >= 3) window.location.replace(EXIT_URL);
    };
    window.addEventListener("keyup", onKey);
    return () => window.removeEventListener("keyup", onKey);
  }, []);

  return (
    <div>
      <Button
        href={EXIT_URL}
        variant="destructive"
        rel="noreferrer"
        onClick={(event) => {
          event.preventDefault();
          window.location.replace(EXIT_URL);
        }}
      >
        {label}
      </Button>
    </div>
  );
}
