/**
 * Decide for me. A server rendered, seeded random pick: the same URL always
 * gives the same result, so every result is shareable and reproducible. With
 * no `seed` in the URL the page redirects to the same URL with a fresh one.
 *
 * Parameters: every filter (read with `readFilters`) plus
 *   seed  short random string
 *   mode  dish (default) | meal | stall
 *   bias  fair (default) | new | cheap | usual
 *   lock  stall, type, canonical (kept from the dish named by `of`)
 *   of    slug of the previous dish the lock is relative to
 *   not   dish slugs passed over with "Not feeling it"
 *
 * The server cannot see the device (history, favourites and dislikes are in
 * localStorage), so this render uses bias fair or cheap and no history; `new`
 * and `usual` fall back to fair here. With JavaScript the `Randomiser` island
 * re-runs the pick with the device data and replaces the result. See that file.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { EAT, eat, eatHref, readFilters, redirectToTidyQuery, t } from "@/components/domain/canteen";
import {
  PICK,
  PICK_ROUTE,
  PickControls,
  PickEmpty,
  PickResult,
  Randomiser,
  chooseCombo,
  pickText,
  readPickParams,
  reelNames,
  serverBias,
  toPickLock,
  type PickParams,
} from "@/components/domain/canteen/pick";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container, EmptyState, Heading, InsetText, Stack } from "@/components/ui";
import { mealCombos } from "@/lib/canteen/combos";
import { indexCanteen } from "@/lib/canteen/derive";
import { applyFilters } from "@/lib/canteen/filter";
import { toSearchParams } from "@/components/domain/canteen/query";
import { newSeed, pick as runPick } from "@/lib/canteen/random";
import { DEFAULT_LOCALE, isLocale, localePath, pick as localised, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { getCanteenData } from "@/lib/sanity/queries";
import type { CanteenStall } from "@/lib/sanity/types";

type SearchParams = Record<string, string | string[] | undefined>;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, PICK_ROUTE),
    title: PICK.title[locale],
    description: PICK.intro[locale],
    // A seeded result is one of endlessly many URLs. The page itself is the thing to index.
    robots: { index: false, follow: true },
  };
}

export default async function EatPickPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const query = await searchParams;
  redirectToTidyQuery(localePath(locale, PICK_ROUTE), query);
  const parsed = readPickParams(query);

  // No seed: make one and come back, so the address bar always holds a reproducible, shareable result.
  if (parsed.seed === undefined) {
    const next = toSearchParams(query);
    next.delete("seed");
    next.set("seed", newSeed());
    redirect(`${localePath(locale, PICK_ROUTE)}?${next.toString()}`);
  }
  const seed = parsed.seed;
  const pickParams: PickParams = { ...parsed, seed };

  const filters = readFilters(query);
  const data = await getCanteenData();
  const now = new Date();
  const index = indexCanteen(data);

  const crumbs = (
    <Breadcrumbs
      locale={locale}
      items={[
        { label: UI.home[locale], path: "/" },
        { label: t(EAT.title, locale), path: "/eat" },
        { label: PICK.title[locale] },
      ]}
    />
  );
  const header = (
    <Stack space={2}>
      <Heading level={1} className="text-3xl">{PICK.title[locale]}</Heading>
      <p className="m-0 text-ink-600">{PICK.intro[locale]}</p>
    </Stack>
  );

  if (data.dishes.length === 0) {
    return (
      <Container className="py-8">
        {crumbs}
        <Stack space={8}>
          {header}
          <EmptyState title={t(EAT.noDataTitle, locale)}>{t(EAT.noDataBody, locale)}</EmptyState>
        </Stack>
      </Container>
    );
  }

  // A seed for the links that spin again. Fixed per render, so the page stays pure after this line.
  const nextSeed = newSeed();
  const pickKey = toSearchParams(query).toString();
  const stallName = (stall: CanteenStall) => localised(stall.name, locale);

  let result: React.ReactNode = null;
  let reel: string[] = [];
  let announce = "";

  if (pickParams.mode === "meal") {
    const budget = filters.max;
    if (budget === undefined) {
      result = <PickEmpty locale={locale} data={data} filters={filters} reason="budget" now={now} />;
    } else {
      const combos = mealCombos(data, filters, budget, { now, limit: 30, sameStallOnly: pickParams.sameStall });
      const { combo, vetoRelaxed } = chooseCombo(combos, seed, pickParams.not);
      if (!combo) {
        result = <PickEmpty locale={locale} data={data} filters={filters} reason="meal" now={now} />;
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
      not: pickParams.not,
      now,
    });
    if (!outcome.dish || !outcome.stall) {
      result = <PickEmpty locale={locale} data={data} filters={filters} reason="filters" now={now} />;
    } else {
      const matched = applyFilters(data, filters, now, { locale });
      const stallDishes = pickParams.mode === "stall" ? matched.filter((dish) => dish.stall._ref === outcome.stall!._id) : undefined;
      const place = eat.stallFull(locale, outcome.stall.number, stallName(outcome.stall));
      if (pickParams.mode === "stall") {
        const names = matched.flatMap((dish) => {
          const stall = index.stallById.get(dish.stall._ref);
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
    <Container className="py-8">
      {crumbs}
      <Stack space={8}>
        {header}

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

        <section aria-labelledby="pick-controls" className="rounded-panel bg-welfare-soft p-[var(--space-4)] sm:p-[var(--space-6)]">
          <Stack space={4}>
            <Heading level={2} id="pick-controls" className="m-0 text-xl">
              {PICK.controlsHeading[locale]}
            </Heading>
            <PickControls locale={locale} filters={filters} mode={pickParams.mode} bias={pickParams.bias} sameStall={pickParams.sameStall} />
            <Link href={eatHref(locale, "/eat/dishes", filters)} className="inline-flex min-h-[var(--target-min)] items-center font-medium">
              {t(EAT.editFilters, locale)}
            </Link>
          </Stack>
        </section>

        <InsetText>
          <p className="m-0 text-sm text-ink-600">{PICK.surveyNote[locale]}</p>
          <p className="m-0 mt-[var(--space-2)] text-sm text-ink-600">{t(EAT.dietNote, locale)}</p>
        </InsetText>
      </Stack>
    </Container>
  );
}
