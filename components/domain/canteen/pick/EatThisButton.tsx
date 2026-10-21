"use client";

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
}

/**
 * "Go with this", the one primary action of the result. A real link first, so
 * without JavaScript it simply opens the stall page. With JavaScript, a click
 * first logs the dish to the device history (a synchronous write, nothing
 * leaves the device) and then the link's own navigation carries on, so it is
 * one tap to go. If the device will not keep it, the navigation still happens.
 */
export function EatThisButton({ locale, items, href }: EatThisButtonProps) {
  function onClick() {
    const at = new Date().toISOString();
    items.forEach((item) => device.addHistory({ slug: item.slug, price: item.price, at }));
  }

  return (
    <Button href={href} onClick={onClick} className="fun-roll w-full sm:w-auto">
      {P.eatThis[locale]}
    </Button>
  );
}
