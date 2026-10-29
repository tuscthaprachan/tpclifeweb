"use client";

/**
 * Decide for me. A seeded random pick worked out from the address: the same URL always gives the same result, so
 * every result is shareable and reproducible, in the browser and for the server's full page load alike. With no
 * `seed` in the URL the request is sent on to the same URL with a fresh one (see `pickTarget`); until then the
 * page shows the controls and a link that does the same.
 */

import Link from "next/link";

import { Heading } from "@/components/ui/Heading";
import { Stack } from "@/components/ui/Stack";
import { mealCombos } from "@/lib/canteen/combos";
import { indexCanteen } from "@/lib/canteen/derive";
import { applyFilters } from "@/lib/canteen/filter";
import { invalidMealBudget, type RawParams } from "@/lib/canteen/params";
import { newSeed, pick as runPick } from "@/lib/canteen/random";
import { localePath, pick as localised, type Locale } from "@/lib/i18n/config";
import type { CanteenData, CanteenStall } from "@/lib/content/types";

import { eatHref } from "../links";
import { CanonicalRedirect, useRenderState, useSearch, type ServerRender } from "../live";
import {
  PICK_ROUTE,
  chooseCombo,
  readPickParams,
  reelNames,
  serverBias,
  toPickLock,
  vetoedDishes,
  type PickParams,
} from "../pick/helpers";
import { PickControls } from "../pick/PickControls";
import { PickEmpty } from "../pick/PickEmpty";
import { PickResult } from "../pick/PickResult";
import { Randomiser } from "../pick/Randomiser";
import { PICK, pickText } from "../pick/strings";
import { readFilters, toSearchParams } from "../query";
import { pickTarget } from "../redirects";
import { EAT, eat, t } from "../strings";

interface PickResultsProps {
  locale: Locale;
  data: CanteenData;
}

export function LivePickResults({ locale, data, server }: PickResultsProps & { server?: ServerRender }) {
  const search = useSearch();
  const { now, seed } = useRenderState(search.toString(), server);
  return (
    <>
      <CanonicalRedirect search={search.toString()} compute={() => pickTarget(locale, search, newSeed())} />
      <PickResults locale={locale} data={data} query={search} now={now} nextSeed={seed} />
    </>
  );
}

export function PickResults({
  locale,
  data,
  query,
  now,
  nextSeed,
}: PickResultsProps & {
  query: RawParams;
  now: Date;
  /** A fresh seed for the links that spin again. Made by the page, so the render stays pure. */
  nextSeed: string;
}) {
  const parsed = readPickParams(query);
  const filters = readFilters(query, data);
  const index = indexCanteen(data);
  const pickKey = toSearchParams(query).toString();
  const stallName = (stall: CanteenStall) => localised(stall.name, locale);

  let result: React.ReactNode = null;
  let reel: string[] = [];
  let announce = "";

  const seed = parsed.seed;
  const pickParams: PickParams = { ...parsed, seed };

  if (seed === undefined) {
    result = (
      <>
        <p className="m-0">
          <Link href={`${localePath(locale, PICK_ROUTE)}?seed=`} className="inline-flex min-h-[var(--target-min)] items-center font-medium">
            {PICK.spin[locale]}
          </Link>
        </p>
      </>
    );
  } else if (pickParams.mode === "meal") {
    const budget = parsed.meal;
    if (budget === undefined) {
      result = <PickEmpty locale={locale} data={data} filters={filters} reason="budget" now={now} />;
    } else {
      const combos = mealCombos(data, filters, budget, { now, limit: 30, perMain: 2, sameStallOnly: pickParams.sameStall });
      const { combo, vetoRelaxed } = chooseCombo(combos, seed, pickParams.not);
      if (!combo) {
        result = <PickEmpty locale={locale} data={data} filters={filters} reason="meal" now={now} meal={{ amount: budget, sameStall: pickParams.sameStall }} />;
      } else {
        const text = combo.items.map((dish) => localised(dish.name, locale)).join(", ");
        reel = reelNames(
          combos.slice(0, 10).map((item) => localised(item.main.name, locale)),
          localised(combo.main.name, locale),
          seed,
        );
        announce = pickText.announceMeal(locale, `${text}. ${pickText.mealTotal(locale, combo.total, combo.change, budget)}`);
        result = (
          <PickResult locale={locale} data={data} filters={filters} params={pickParams} nextSeed={nextSeed} meal={{ combo, budget, vetoRelaxed }} />
        );
      }
    }
  } else {
    const outcome = runPick(data, filters, {
      seed,
      bias: serverBias(pickParams.bias),
      lock: toPickLock(pickParams),
      not: vetoedDishes(data, pickParams.not),
      now,
    });
    if (!outcome.dish || !outcome.stall) {
      result = <PickEmpty locale={locale} data={data} filters={filters} reason="filters" now={now} />;
    } else {
      const matched = applyFilters(data, filters, now, { locale });
      const stallDishes = pickParams.mode === "stall" ? matched.filter((dish) => dish.stallId === outcome.stall!._id) : undefined;
      const place = eat.stallFull(locale, outcome.stall.number, stallName(outcome.stall));
      if (pickParams.mode === "stall") {
        const names = matched.flatMap((dish) => {
          const stall = index.stallById.get(dish.stallId);
          return stall ? [stallName(stall)] : [];
        });
        reel = reelNames(names, stallName(outcome.stall), seed);
        announce = pickText.announce(locale, place);
      } else {
        reel = reelNames(
          matched.map((dish) => localised(dish.name, locale)),
          localised(outcome.dish.name, locale),
          seed,
        );
        announce = pickText.announce(locale, eat.dishAtStall(locale, localised(outcome.dish.name, locale), place));
      }
      result = (
        <PickResult
          locale={locale}
          data={data}
          filters={filters}
          params={pickParams}
          nextSeed={nextSeed}
          outcome={outcome}
          stallDishes={stallDishes}
        />
      );
    }
  }

  const hasResult = announce !== "";

  return (
    <>
      {hasResult ? (
        <Randomiser
          locale={locale}
          data={data}
          filters={filters}
          params={pickParams}
          nextSeed={nextSeed}
          pickKey={pickKey}
          reel={reel}
          announce={announce}
        >
          {result}
        </Randomiser>
      ) : (
        result
      )}

      <section aria-labelledby="pick-controls" className="border-t border-line pt-[var(--space-6)]">
        <Stack space={4}>
          <Heading level={2} id="pick-controls" className="m-0 text-xl">
            {PICK.controlsHeading[locale]}
          </Heading>
          <PickControls key={pickKey} locale={locale} filters={filters} mode={pickParams.mode} bias={pickParams.bias} meal={pickParams.meal} invalid={invalidMealBudget(query)} sameStall={pickParams.sameStall} />
          <Link href={eatHref(locale, "/eat/dishes", filters)} className="inline-flex min-h-[var(--target-min)] items-center font-medium">
            {t(EAT.editFilters, locale)}
          </Link>
        </Stack>
      </section>
    </>
  );
}
