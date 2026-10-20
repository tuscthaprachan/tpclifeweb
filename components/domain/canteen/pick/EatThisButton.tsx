"use client";

import { useState, type MouseEvent } from "react";

import { Button } from "@/components/ui/Button";
import { device } from "@/lib/canteen";
import type { Locale } from "@/lib/i18n/config";
import { PICK as P } from "./strings";

interface EatThisButtonProps {
  locale: Locale;
  /** What gets logged to this device's history. A meal has several. */
  items: ReadonlyArray<{ slug: string; price: number }>;
  /** Where the link goes. Without JavaScript this is all the button is: a link to the stall. */
  href: string;
  /** The words of the link when it goes somewhere other than the stall page. */
  seeLabel?: string;
}

/**
 * "Go with this". A real link first, so without JavaScript it simply opens
 * the stall page. With JavaScript, a plain click first logs the dish to the
 * device history (nothing leaves the device), then says so, and offers the
 * stall link instead of jumping away. It never claims it saved something it
 * could not.
 */
export function EatThisButton({ locale, items, href, seeLabel }: EatThisButtonProps) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    const at = new Date().toISOString();
    const saved = items.map((item) => device.addHistory({ slug: item.slug, price: item.price, at })).every(Boolean);
    const plain = event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
    if (plain) {
      event.preventDefault();
      setState(saved ? "done" : "failed");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-[var(--space-3)]">
      {state === "idle" ? (
        <Button href={href} onClick={onClick}>
          {P.eatThis[locale]}
        </Button>
      ) : (
        <Button href={href} variant="secondary">
          {seeLabel ?? P.seeStall[locale]}
        </Button>
      )}
      <p role="status" className="m-0 text-ink-900">
        {state === "done" ? P.eatenDone[locale] : state === "failed" ? P.eatenFailed[locale] : ""}
      </p>
    </div>
  );
}
