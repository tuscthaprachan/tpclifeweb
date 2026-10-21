/**
 * What to eat: the hub. One page that answers "what do I eat" three ways:
 * let the site decide (the block at the top, a plain GET form to /eat/pick),
 * browse (Dishes, Stalls and Map, each a real link) or use a tool (budget,
 * week, group, explainers). Everything carries the current filters.
 *
 * Reads the whole canteen dataset once (`getCanteenData`) and works without
 * JavaScript. Nothing on it says live.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  DecideBlock,
  DishCard,
  ActiveFilterBar,
  EAT,
  EatTabs,
  eatHref,
  readFilters,
  t,
} from "@/components/domain/canteen";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container, EmptyState, Grid, Heading, InsetText, Stack } from "@/components/ui";
import { applyFilters, isMealDish } from "@/lib/canteen/filter";
import { indexCanteen, stallOf } from "@/lib/canteen/derive";
import { countActiveValues } from "@/lib/canteen/params";
import { DEFAULT_LOCALE, isLocale, pick, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { getCanteenData } from "@/lib/sanity/queries";

const STARTER_COUNT = 6;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, "/eat"),
    title: t(EAT.title, locale),
    description: t(EAT.intro, locale),
  };
}

const TOOLS = [
  { route: "/eat/meal", title: "toolMeal", hint: "toolMealHint" },
  { route: "/eat/week", title: "toolWeek", hint: "toolWeekHint" },
  { route: "/eat/group", title: "toolGroup", hint: "toolGroupHint" },
  { route: "/eat/what-is", title: "toolWhatIs", hint: "toolWhatIsHint" },
  { route: "/eat/mine", title: "toolMine", hint: "toolMineHint" },
] as const;

export default async function EatHubPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const filters = readFilters(await searchParams);
  const data = await getCanteenData();
  const now = new Date();

  const breadcrumbs = (
    <Breadcrumbs locale={locale} items={[{ label: UI.home[locale], path: "/" }, { label: t(EAT.title, locale) }]} />
  );

  const header = (
    <Stack space={2}>
      <Heading level={1} className="text-3xl">{t(EAT.title, locale)}</Heading>
      <p className="m-0 text-ink-600">{t(EAT.intro, locale)}</p>
    </Stack>
  );

  if (data.dishes.length === 0) {
    return (
      <Container className="pb-8 pt-2">
        {breadcrumbs}
        <Stack space={8}>
          {header}
          <EmptyState title={t(EAT.noDataTitle, locale)}>{t(EAT.noDataBody, locale)}</EmptyState>
        </Stack>
      </Container>
    );
  }

  const index = indexCanteen(data);
  const stallName = (slug: string) => {
    const stall = index.stallBySlug.get(slug);
    return stall ? pick(stall.name, locale) : undefined;
  };

  const starters = applyFilters(data, filters, now, { locale })
    .filter((dish) => isMealDish(dish, filters))
    .slice(0, STARTER_COUNT);
  const filtered = countActiveValues(filters) > 0;

  return (
    <Container className="pb-8 pt-2">
      {breadcrumbs}
      <Stack space={8}>
        {header}

        {filtered ? (
          <ActiveFilterBar
            locale={locale}
            filters={filters}
            route="/eat"
            stallName={stallName}
            editHref={eatHref(locale, "/eat/dishes", filters)}
          />
        ) : null}

        <DecideBlock locale={locale} filters={filters} />

        <section aria-labelledby="eat-browse-title">
          <Stack space={4}>
            <Heading level={2} id="eat-browse-title" className="m-0 text-xl">
              {t(EAT.browseTitle, locale)}
            </Heading>
            <EatTabs locale={locale} filters={filters} />
            {starters.length > 0 ? (
              <Stack space={4}>
                <Heading level={3} className="m-0 text-lg">
                  {t(EAT.startersTitle, locale)}
                </Heading>
                <Grid as="ul" minColumnWidth="16rem" className="m-0 list-none p-0">
                  {starters.map((dish) => (
                    <li key={dish._id} className="min-w-0">
                      <DishCard dish={dish} stall={stallOf(data, dish)} locale={locale} filters={filters} headingLevel={4} />
                    </li>
                  ))}
                </Grid>
                <p className="m-0">
                  <Link href={eatHref(locale, "/eat/dishes", filters)} className="inline-flex min-h-[var(--target-min)] items-center font-medium">
                    {t(EAT.seeAllDishes, locale)}
                  </Link>
                </p>
              </Stack>
            ) : null}
          </Stack>
        </section>

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

        <InsetText>
          <p className="m-0 text-sm text-ink-900">{t(EAT.dietNote, locale)}</p>
        </InsetText>
      </Stack>
    </Container>
  );
}
