"use client";

/**
 * The client island around the result the page worked out from the address.
 *
 * WHAT THE SERVER CAN AND CANNOT SEE. History, favourites and the
 * never-suggest list live in `localStorage` (see `lib/canteen/device.ts`), so
 * the page's own pick (the server's for a full page load) uses bias `fair` or `cheap` and no history. It is a
 * complete, correct pick on its own, and it is what you get without
 * JavaScript. With JavaScript this island reads the device, and when there is
 * anything to apply (any history, favourites or dislikes, or the `new` and
 * `usual` biases), it re-runs `pick()` here with the same seed, filters, lock
 * and vetoes plus the device data, and shows that result instead. Repeat
 * avoidance (default 2 days) therefore only exists on the client. The page
 * says so in one short line, only when the device changed something.
 *
 * The device is read once per result (keyed by the URL and the spin) and then frozen, and read again when the page returns from the back-forward cache, so
 * tapping "Go with this" does not make the dish just chosen swap itself out
 * for avoiding the repeat.
 *
 * MOTION. When the user arrived by spinning (see `SpinListener`; a shared
 * link, Back or a reload does not count) a slot machine
 * reel of dish names spins for about 1.0 s, slows down and lands on the
 * result, which then pops in with a confetti burst. The reel is one CSS
 * transform animation (no per-frame React renders), `aria-hidden`, and
 * skipped under `prefers-reduced-motion`. The settled result is announced
 * once in a polite live region. The result stays in the DOM (only invisible
 * during the reel), so a focused link keeps focus while the reel plays.
 */

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";

import { useHydrated } from "@/components/hooks/use-hydrated";
import { cx } from "@/components/ui/cx";
import { device } from "@/lib/canteen";
import { applyFilters } from "@/lib/canteen/filter";
import { pick, type HistoryEntry } from "@/lib/canteen/random";
import type { CanteenFilters } from "@/lib/canteen/params";
import { localePath, pick as localised, type Locale } from "@/lib/i18n/config";
import type { CanteenData } from "@/lib/content/types";

import { eat } from "../strings";
import "../fun.css";
import { biasNeedsDevice, reelNames, reelPhase, toPickLock, vetoedDishes, type PickParams } from "./helpers";
import { PickEmpty } from "./PickEmpty";
import { PickResult } from "./PickResult";
import { SPIN_PENDING_ID, SPIN_PENDING_SCRIPT, SpinListener } from "./SpinListener";
import { useSpin } from "./use-spin";
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
  /** The result worked out from the address, shown until (and unless) the device changes the pick. */
  children: ReactNode;
}

interface DeviceSnapshot {
  history: readonly HistoryEntry[];
  favourites: readonly string[];
  dislikes: readonly string[];
  now: Date;
}

const REEL_MS = 1000;
const STRIP_LENGTH = 18;
const CONFETTI_PIECES = 30;
const CONFETTI_HUES = ["--fill-transport", "--fill-welfare", "--fill-activity", "--fill-governance", "--colour-action"] as const;

/** Builds the strip the reel scrolls: the names cycled to a fixed length, the final one last. */
function reelStrip(names: readonly string[]): string[] {
  const last = names[names.length - 1] ?? "";
  const rest = names.slice(0, -1);
  if (rest.length === 0) return [last];
  return [...Array.from({ length: STRIP_LENGTH - 1 }, (_, index) => rest[index % rest.length]!), last];
}

function Confetti() {
  return (
    <div aria-hidden="true" className="fun-confetti">
      {Array.from({ length: CONFETTI_PIECES }, (_, n) => {
        const angle = (n * 137.5 * Math.PI) / 180;
        const reach = 4 + (n % 5) * 1.6;
        const style = {
          "--n": n,
          "--dx": `${(Math.cos(angle) * reach * 1.4).toFixed(2)}rem`,
          "--dy": `${(-Math.abs(Math.sin(angle)) * reach * 1.2 - 2).toFixed(2)}rem`,
          "--rot": `${(n % 2 ? 1 : -1) * (180 + n * 23)}deg`,
          "--fun-hue": `var(${CONFETTI_HUES[n % CONFETTI_HUES.length]})`,
        } as CSSProperties;
        return <i key={n} style={style} />;
      })}
    </div>
  );
}

/** Reads the device. */
function readDevice(): DeviceSnapshot {
  return { history: device.getHistory(), favourites: device.getFavourites(), dislikes: device.getDislikes(), now: new Date() };
}

function subscribeReducedMotion(onChange: () => void): () => void {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function Randomiser({ locale, data, filters, params, nextSeed, pickKey, reel, announce, children }: RandomiserProps) {
  const hydrated = useHydrated();
  const reduced = useSyncExternalStore(subscribeReducedMotion, reducedMotion, () => false);
  const spin = useSpin(pickKey);
  const { done } = spin;
  const spinNonce = spin.state.status === "idle" ? null : spin.state.nonce;
  const [snapshot, setSnapshot] = useState<DeviceSnapshot | null>(null);
  const snapshotFor = useRef<string | null>(null);

  useLayoutEffect(() => {
    const token = `${pickKey}|${spinNonce ?? ""}`;
    if (snapshotFor.current === token) return;
    snapshotFor.current = token;
    setSnapshot(readDevice());
  }, [pickKey, spinNonce]);

  useEffect(() => {
    function onShow(event: PageTransitionEvent) {
      if (event.persisted) setSnapshot(readDevice());
    }
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  const hasDeviceData = snapshot !== null && (snapshot.history.length > 0 || snapshot.favourites.length > 0 || snapshot.dislikes.length > 0);
  const useDevice = snapshot !== null && params.mode !== "meal" && (biasNeedsDevice(params.bias) || hasDeviceData);

  const outcome = useMemo(() => {
    if (!useDevice || !snapshot) return null;
    return pick(data, filters, {
      seed: params.seed ?? "",
      bias: params.bias,
      lock: toPickLock(params),
      not: vetoedDishes(data, params.not),
      history: snapshot.history,
      favourites: snapshot.favourites,
      dislikes: snapshot.dislikes,
      now: snapshot.now,
    });
  }, [useDevice, snapshot, data, filters, params]);

  const stallDishes = useMemo(() => {
    if (!outcome?.stall || params.mode !== "stall" || !snapshot) return undefined;
    const stallId = outcome.stall._id;
    return applyFilters(data, filters, snapshot.now, { locale }).filter((dish) => dish.stallId === stallId);
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

  // The reel plays only for a result the user spun for, and settles once.
  const phase = reelPhase({ hydrated, spin: spin.state, reducedMotion: reduced, nameCount: names.length });
  const playing = phase === "playing";
  const celebrate = phase === "celebrating";
  const strip = useMemo(() => reelStrip(names), [names]);

  useEffect(() => {
    if (hydrated) document.getElementById(SPIN_PENDING_ID)?.remove();
  }, [hydrated]);

  useEffect(() => {
    if (!playing) return;
    const stop = window.setTimeout(done, REEL_MS + 400);
    return () => window.clearTimeout(stop);
  }, [playing, done]);

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

  // Meal picks never use the device. The no-JavaScript notes live in <noscript>; with JavaScript only a device-applied pick says anything.
  const applied = hydrated && snapshot !== null && params.mode !== "meal" && (snapshot.history.length > 0 || snapshot.dislikes.length > 0);

  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      <SpinListener />
      <p role="status" className="visually-hidden">
        {hydrated && !playing ? spoken : ""}
      </p>
      <script dangerouslySetInnerHTML={{ __html: SPIN_PENDING_SCRIPT }} />
      <div className="relative grid grid-cols-[minmax(0,1fr)] overflow-x-clip">
        {playing ? (
          <div aria-hidden="true" className="pointer-events-none z-10 [grid-area:1/1]">
            <div className="fun-reel" style={{ "--last": strip.length - 1, "--fun-ms": `${REEL_MS}ms` } as CSSProperties}>
              <div className="fun-reel-line" />
              <div key={pickKey} className="fun-reel-strip" onAnimationEnd={done}>
                {strip.map((name, index) => (
                  <p key={index} className="fun-reel-item m-0">
                    {name}
                  </p>
                ))}
              </div>
            </div>
          </div>
        ) : null}
        <div className={cx("fun-result [grid-area:1/1]", playing ? "opacity-0" : celebrate ? "fun-pop" : undefined)}>{content}</div>
        {celebrate ? <Confetti /> : null}
      </div>
      {params.mode === "meal" ? null : (
        <noscript>
          <p className="m-0 text-sm text-ink-600">{biasNeedsDevice(params.bias) ? PICK.noteServerBias[locale] : PICK.noteServer[locale]}</p>
        </noscript>
      )}
      {applied ? (
        <p className="m-0 text-sm text-ink-600">
          {PICK.noteApplied[locale]} <Link href={localePath(locale, "/eat/mine")}>{PICK.noteAppliedLink[locale]}</Link>
        </p>
      ) : null}
    </div>
  );
}
