"use client";

/**
 * The client island around the server rendered result.
 *
 * WHAT THE SERVER CAN AND CANNOT SEE. History, favourites and the
 * never-suggest list live in `localStorage` (see `lib/canteen/device.ts`), so
 * the server render uses bias `fair` or `cheap` and no history. It is a
 * complete, correct pick on its own, and it is what you get without
 * JavaScript. With JavaScript this island reads the device, and when there is
 * anything to apply (any history, favourites or dislikes, or the `new` and
 * `usual` biases), it re-runs `pick()` here with the same seed, filters, lock
 * and vetoes plus the device data, and shows that result instead. Repeat
 * avoidance (default 2 days) therefore only exists on the client. The page
 * says so in a small note, in words for each case.
 *
 * The device is read once per result (keyed by the URL) and then frozen, so
 * tapping "Go with this" does not make the dish just chosen swap itself out
 * for avoiding the repeat.
 *
 * MOTION. On a new result (and when the page first opens) a reel of dish
 * names plays for about 900 ms, then settles. It is `aria-hidden` and it is
 * skipped under `prefers-reduced-motion`. The settled result is announced once
 * in a polite live region. The result stays in the DOM (only invisible during
 * the reel), so a focused link keeps focus while the reel plays.
 */

import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";

import { device } from "@/lib/canteen";
import { applyFilters } from "@/lib/canteen/filter";
import { pick, type HistoryEntry } from "@/lib/canteen/random";
import type { CanteenFilters } from "@/lib/canteen/params";
import { pick as localised, type Locale } from "@/lib/i18n/config";
import type { CanteenData } from "@/lib/sanity/types";

import { eat } from "../strings";
import { biasNeedsDevice, reelNames, toPickLock, type PickParams } from "./helpers";
import { PickEmpty } from "./PickEmpty";
import { PickResult } from "./PickResult";
import { PICK, pickText } from "./strings";

interface RandomiserProps {
  locale: Locale;
  data: CanteenData;
  filters: CanteenFilters;
  params: PickParams;
  nextSeed: string;
  /** Identifies this result. The whole query string will do. */
  pickKey: string;
  /** Names the reel cycles through, the final one last. */
  reel: string[];
  /** What the live region says once the result has settled. */
  announce: string;
  /** The server rendered result, shown until (and unless) the device changes the pick. */
  children: ReactNode;
}

interface DeviceSnapshot {
  history: readonly HistoryEntry[];
  favourites: readonly string[];
  dislikes: readonly string[];
  now: Date;
}

const REEL_MS = 900;
const FRAME_MS = 75;

const subscribeNever = () => () => {};

let frozen: { key: string; snapshot: DeviceSnapshot } | null = null;

/** Reads the device once per `key`, then returns the same object until the key changes. */
function readDevice(key: string): DeviceSnapshot {
  if (frozen?.key === key) return frozen.snapshot;
  const snapshot: DeviceSnapshot = {
    history: device.getHistory(),
    favourites: device.getFavourites(),
    dislikes: device.getDislikes(),
    now: new Date(),
  };
  frozen = { key, snapshot };
  return snapshot;
}

function subscribeReducedMotion(onChange: () => void): () => void {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function Randomiser({ locale, data, filters, params, nextSeed, pickKey, reel, announce, children }: RandomiserProps) {
  const hydrated = useSyncExternalStore(subscribeNever, () => true, () => false);
  const reduced = useSyncExternalStore(subscribeReducedMotion, reducedMotion, () => false);
  const snapshot = useSyncExternalStore(subscribeNever, () => readDevice(pickKey), () => null);

  const hasDeviceData = snapshot !== null && (snapshot.history.length > 0 || snapshot.favourites.length > 0 || snapshot.dislikes.length > 0);
  const useDevice = snapshot !== null && params.mode !== "meal" && (biasNeedsDevice(params.bias) || hasDeviceData);

  const outcome = useMemo(() => {
    if (!useDevice || !snapshot) return null;
    return pick(data, filters, {
      seed: params.seed ?? "",
      bias: params.bias,
      lock: toPickLock(params),
      not: params.not,
      history: snapshot.history,
      favourites: snapshot.favourites,
      dislikes: snapshot.dislikes,
      now: snapshot.now,
    });
  }, [useDevice, snapshot, data, filters, params]);

  const stallDishes = useMemo(() => {
    if (!outcome?.stall || params.mode !== "stall" || !snapshot) return undefined;
    const stallId = outcome.stall._id;
    return applyFilters(data, filters, snapshot.now, { locale }).filter((dish) => dish.stall._ref === stallId);
  }, [outcome, params.mode, snapshot, data, filters, locale]);

  const finalName = outcome?.dish
    ? params.mode === "stall" && outcome.stall
      ? localised(outcome.stall.name, locale)
      : localised(outcome.dish.name, locale)
    : null;
  const names = useMemo(() => (finalName ? reelNames(reel, finalName, params.seed ?? "") : reel), [reel, finalName, params.seed]);
  const spoken =
    outcome?.dish && outcome.stall
      ? params.mode === "stall"
        ? pickText.announce(locale, eat.stallFull(locale, outcome.stall.number, localised(outcome.stall.name, locale)))
        : pickText.announce(locale, eat.dishAtStall(locale, localised(outcome.dish.name, locale), eat.stallFull(locale, outcome.stall.number, localised(outcome.stall.name, locale))))
      : announce;

  // The reel plays until `doneKey` catches up with the key of this result.
  const [doneKey, setDoneKey] = useState<string | null>(null);
  const [frame, setFrame] = useState(0);
  const playing = hydrated && !reduced && names.length > 1 && doneKey !== pickKey;

  useEffect(() => {
    if (!playing) return;
    const spin = window.setInterval(() => setFrame((value) => value + 1), FRAME_MS);
    const stop = window.setTimeout(() => setDoneKey(pickKey), REEL_MS);
    return () => {
      window.clearInterval(spin);
      window.clearTimeout(stop);
    };
  }, [playing, pickKey]);

  let content: ReactNode = children;
  if (outcome && snapshot) {
    content = outcome.dish ? (
      <PickResult
        locale={locale}
        data={data}
        filters={filters}
        params={params}
        nextSeed={nextSeed}
        outcome={outcome}
        stallDishes={stallDishes}
      />
    ) : (
      <PickEmpty locale={locale} data={data} filters={filters} reason={hasDeviceData && snapshot.dislikes.length > 0 ? "dislikes" : "filters"} now={snapshot.now} />
    );
  }

  // Meal picks never use the device, so there is nothing to say about it.
  const note =
    params.mode === "meal"
      ? null
      : !hydrated
        ? biasNeedsDevice(params.bias)
          ? PICK.noteServerBias[locale]
          : PICK.noteServer[locale]
        : hasDeviceData
          ? PICK.noteApplied[locale]
          : PICK.noteNothingToApply[locale];

  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      <p role="status" className="visually-hidden">
        {hydrated && !playing ? spoken : ""}
      </p>
      <div className="grid">
        {playing ? (
          <div
            aria-hidden="true"
            className="pointer-events-none z-10 flex min-h-[14rem] items-center justify-center rounded-panel border border-line bg-welfare-soft p-[var(--space-6)] text-center [grid-area:1/1]"
          >
            <p className="m-0 text-2xl font-semibold text-ink-900">{names[frame % names.length]}</p>
          </div>
        ) : null}
        <div className={playing ? "opacity-0 [grid-area:1/1]" : "[grid-area:1/1]"}>{content}</div>
      </div>
      {note ? <p className="m-0 text-sm text-ink-600">{note}</p> : null}
    </div>
  );
}
