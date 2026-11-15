"use client";

import { useState, useSyncExternalStore } from "react";
import { cx } from "@/components/ui/cx";
import { device } from "@/lib/canteen";
import type { Locale } from "@/lib/i18n/config";
import { HeartIcon } from "./icons";
import { EAT, t } from "./strings";
import { useDeviceStorage } from "./use-device-storage";

interface FavouriteToggleProps {
  /** The dish's slug. Stored on this device only. */
  slug: string;
  /** The dish's name, read out after the label so each button in a list is distinct. */
  name: string;
  locale: Locale;
  className?: string;
}

/**
 * Stars a dish on this device. A client island and nothing more: the card it
 * sits on works without JavaScript, and this renders nothing until the page
 * has hydrated and the browser has shown it can keep data. It never claims it
 * saved something it did not.
 *
 * The label stays "Favourite" and `aria-pressed` carries the state, so it
 * does not read as a different button each time. The heart is solid when on
 * and outlined when off, so the state is not colour alone.
 */
export function FavouriteToggle({ slug, name, locale, className }: FavouriteToggleProps) {
  const ready = useDeviceStorage();
  const saved = useSyncExternalStore(device.subscribe, () => device.isFavourite(slug), () => false);
  const [failed, setFailed] = useState(false);

  if (ready !== true) return null;

  return (
    <span className={cx("inline-flex flex-col items-end", className)}>
      <button
        type="button"
        aria-pressed={saved}
        onClick={() => setFailed(!device.toggleFavourite(slug))}
        className={cx(
          "inline-flex items-center gap-[var(--space-1)] rounded-control px-[var(--space-2)] text-sm font-medium hover:bg-surface-alt",
          saved ? "text-accent" : "text-ink-600",
        )}
      >
        <HeartIcon filled={saved} />
        <span>{t(EAT.favouriteLabel, locale)}</span>
        <span className="visually-hidden">: {name}</span>
      </button>
      {failed ? (
        <span role="status" className="text-sm text-ink-600">
          {t(EAT.favouriteFailed, locale)}
        </span>
      ) : null}
    </span>
  );
}
