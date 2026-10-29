"use client";

import Link from "next/link";

import { EmptyState } from "@/components/ui/EmptyState";
import { Grid } from "@/components/ui/Grid";
import { Heading } from "@/components/ui/Heading";
import { Stack } from "@/components/ui/Stack";
import { applyFilters, relaxSuggestions } from "@/lib/canteen/filter";
import { commonCheckedOn, indexCanteen, stallOf } from "@/lib/canteen/derive";
import { countActiveValues, serialise, type RawParams } from "@/lib/canteen/params";
import { pickSuggested, suggestedPool } from "@/lib/canteen/random";
import { pick, type Locale } from "@/lib/i18n/config";
import type { CanteenData } from "@/lib/content/types";

import { ActiveFilterBar } from "../ActiveFilterBar";
import { CheckedOnNote } from "../CheckedOnNote";
import { DecideBlock } from "../DecideBlock";
import { DishCard } from "../DishCard";
import { PinIcon, PlateIcon, WokIcon } from "../icons";
import { eatHref } from "../links";
import { useRenderState, useSearch, type ServerRender } from "../live";
import { readFilters } from "../query";
import { RelaxSuggestions } from "../RelaxSuggestions";
import { SuggestedMenu } from "../SuggestedMenu";
import { EAT, eat, t } from "../strings";

const SUGGESTED_COUNT = 6;
const SUGGESTED_PER_STALL = 3;
const SUGGESTED_SEED = "eat";

const BROWSE = [
  { route: "/eat/dishes", title: "tabDishes", hint: "hubDishesHint", Icon: PlateIcon },
  { route: "/eat/stalls", title: "tabStalls", hint: "hubStallsHint", Icon: WokIcon },
  { route: "/eat/map", title: "tabMap", hint: "hubMapHint", Icon: PinIcon },
] as const;

const TOOLS = [
  { route: "/eat/plan", title: "toolPlan", hint: "toolPlanHint" },
  { route: "/eat/what-is", title: "toolWhatIs", hint: "toolWhatIsHint" },
  { route: "/eat/mine", title: "toolMine", hint: "toolMineHint" },
] as const;

interface EatHubResultsProps {
  locale: Locale;
  data: CanteenData;
}

export function LiveEatHubResults({ locale, data, server }: EatHubResultsProps & { server?: ServerRender }) {
  const search = useSearch();
  const { now } = useRenderState(search.toString(), server);
  return <EatHubResults locale={locale} data={data} query={search} now={now} />;
}

export function EatHubResults({ locale, data, query, now }: EatHubResultsProps & { query: RawParams; now: Date }) {
  const filters = readFilters(query, data);
  const index = indexCanteen(data);
  const stallName = (slug: string) => {
    const stall = index.stallBySlug.get(slug);
    return stall ? pick(stall.name, locale) : undefined;
  };

  const suggestedDishes = suggestedPool(applyFilters(data, filters, now, { locale }), SUGGESTED_PER_STALL, SUGGESTED_SEED);
  const suggestedFirst = pickSuggested(suggestedDishes, SUGGESTED_COUNT, SUGGESTED_SEED);
  const suggestedChecked = commonCheckedOn(suggestedDishes);
  const filtered = countActiveValues(filters) > 0;

  return (
    <>
      {filtered ? (
        <ActiveFilterBar
          locale={locale}
          filters={filters}
          route="/eat"
          stallName={stallName}
          editHref={eatHref(locale, "/eat/dishes", filters)}
        />
      ) : null}

      <DecideBlock key={serialise(filters)} locale={locale} filters={filters} />

      <section aria-labelledby="eat-browse-title">
        <Stack space={4}>
          <Heading level={2} id="eat-browse-title" className="m-0 text-xl">
            {t(EAT.browseTitle, locale)}
          </Heading>
          <Grid as="ul" minColumnWidth="13rem" className="m-0 list-none p-0">
            {BROWSE.map(({ route, title, hint, Icon }) => (
              <li
                key={route}
                className="relative flex min-w-0 items-center gap-[var(--space-3)] rounded-panel border border-line bg-surface p-[var(--space-3)] hover:border-line-strong hover:bg-surface-alt has-[:focus-visible]:[box-shadow:0_0_0_6px_var(--focus-bar)] has-[:focus-visible]:[outline:var(--focus-width)_solid_var(--focus-fill)]"
              >
                <span className="inline-flex size-10 shrink-0 items-center justify-center text-ink-900">
                  <Icon size={24} />
                </span>
                <span className="flex min-w-0 flex-col">
                  <Link
                    href={eatHref(locale, route, filters)}
                    className="inline-flex min-h-[var(--target-min)] items-center font-semibold text-ink-900 no-underline after:absolute after:inset-0 after:content-[''] hover:text-action hover:underline focus-visible:shadow-none focus-visible:outline-none"
                  >
                    {t(EAT[title], locale)}
                  </Link>
                  <span className="text-sm text-ink-600">{t(EAT[hint], locale)}</span>
                </span>
              </li>
            ))}
          </Grid>
        </Stack>
      </section>

      {suggestedFirst.length > 0 ? (
        <section aria-labelledby="eat-suggested-title">
          <Stack space={4}>
            <Heading level={2} id="eat-suggested-title" className="m-0 text-xl">
              {t(EAT.suggestedTitle, locale)}
            </Heading>
            {suggestedChecked ? <CheckedOnNote checkedOn={suggestedChecked} locale={locale} /> : null}
            <SuggestedMenu
              locale={locale}
              candidates={suggestedDishes.map((dish) => ({ _id: dish._id, course: dish.course, type: dish.type, stallId: dish.stallId }))}
              cards={Object.fromEntries(
                suggestedDishes.map((dish) => [
                  dish._id,
                  <DishCard key={dish._id} dish={dish} stall={stallOf(data, dish)} locale={locale} filters={filters} headingLevel={3} hideChecked={dish.checkedOn === suggestedChecked} />,
                ]),
              )}
              count={SUGGESTED_COUNT}
              initialSeed={SUGGESTED_SEED}
            />
            <p className="m-0">
              <Link href={eatHref(locale, "/eat/dishes", filters)} className="inline-flex min-h-[var(--target-min)] items-center font-medium">
                {t(EAT.seeAllDishes, locale)}
              </Link>
            </p>
          </Stack>
        </section>
      ) : filtered ? (
        <section aria-labelledby="eat-suggested-title">
          <Stack space={4}>
            <Heading level={2} id="eat-suggested-title" className="m-0 text-xl">
              {t(EAT.suggestedTitle, locale)}
            </Heading>
            <EmptyState title={filters.q !== undefined ? eat.noSearchResults(locale, filters.q) : t(EAT.noResultsTitle, locale)} />
            <RelaxSuggestions locale={locale} route="/eat" headingLevel={3} stallName={stallName} suggestions={relaxSuggestions(data, filters, now)} />
          </Stack>
        </section>
      ) : null}

      <section aria-labelledby="eat-tools-title">
        <Stack space={4}>
          <Heading level={2} id="eat-tools-title" className="m-0 text-xl">
            {t(EAT.toolsTitle, locale)}
          </Heading>
          <Grid as="ul" minColumnWidth="13rem" className="m-0 list-none p-0">
            {TOOLS.map((tool) => (
              <li key={tool.route} className="min-w-0 rounded-panel border border-line bg-surface p-[var(--space-4)]">
                <Stack space={1}>
                  <Link href={eatHref(locale, tool.route, filters)} className="inline-flex min-h-[var(--target-min)] items-center font-semibold">
                    {t(EAT[tool.title], locale)}
                  </Link>
                  <span className="text-sm text-ink-600">{t(EAT[tool.hint], locale)}</span>
                </Stack>
              </li>
            ))}
          </Grid>
        </Stack>
      </section>
    </>
  );
}
