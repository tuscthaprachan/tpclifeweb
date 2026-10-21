/**
 * One stall: who it is, how to find it, and its full menu grouped by type.
 * With filters on, a line says how many of its dishes match, but the whole
 * menu is always shown: a stall page is the place to see everything.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  CUISINE_LABEL,
  DietTag,
  DishCard,
  DishTypeIcon,
  EAT,
  PinIcon,
  TYPE_LABEL,
  eat,
  eatHref,
  readFilters,
  stallHalalTag,
  t,
} from "@/components/domain/canteen";
import { StallMiniMap } from "@/components/domain/canteen/pick/StallMiniMap";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container, Grid, Heading, InsetText, Stack, Tag } from "@/components/ui";
import { indexCanteen, priceRange } from "@/lib/canteen/derive";
import { matchesFilters } from "@/lib/canteen/filter";
import { DISH_TYPES } from "@/lib/canteen/options";
import { countActiveValues } from "@/lib/canteen/params";
import { DEFAULT_LOCALE, isLocale, pick, type Locale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { getCanteenData } from "@/lib/sanity/queries";

type Params = Promise<{ locale: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const data = await getCanteenData();
  const stall = indexCanteen(data).stallBySlug.get(slug);
  if (!stall) return {};
  return {
    alternates: alternatesFor(locale, `/eat/stalls/${slug}`),
    title: eat.stallFull(locale, stall.number, pick(stall.name, locale)),
    description: stall.wayfinding ? pick(stall.wayfinding, locale) : t(EAT.stallsIntro, locale),
  };
}

export default async function EatStallPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: rawLocale, slug } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const filters = readFilters(await searchParams);
  const data = await getCanteenData();
  const stall = indexCanteen(data).stallBySlug.get(slug);
  if (!stall) notFound();

  const now = new Date();
  const dishes = data.dishes.filter((dish) => dish.stall._ref === stall._id);
  const range = priceRange(dishes);
  const matching = dishes.filter((dish) => matchesFilters(data, dish, filters, now)).length;
  const halalTag = stallHalalTag(stall);
  const name = pick(stall.name, locale);

  const sections = DISH_TYPES.map((type) => ({
    type,
    dishes: dishes.filter((dish) => dish.type === type).sort((a, b) => a.price - b.price || pick(a.name, locale).localeCompare(pick(b.name, locale), locale)),
  })).filter((section) => section.dishes.length > 0);

  return (
    <Container className="py-8">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: UI.home[locale], path: "/" },
          { label: t(EAT.title, locale), path: "/eat" },
          { label: t(EAT.stallsTitle, locale), path: "/eat/stalls" },
          { label: name },
        ]}
      />

      <Stack space={8}>
        <Stack space={2}>
          <p className="m-0 inline-flex w-fit items-center rounded-control bg-welfare px-[var(--space-3)] py-[var(--space-1)] text-lg font-semibold text-ink-on-fill">
            {eat.stallNumber(locale, stall.number)}
          </p>
          <Heading level={1} className="text-3xl leading-tight">{name}</Heading>
          <ul className="m-0 flex list-none flex-wrap gap-[var(--space-2)] p-0">
            {stall.cuisine.map((cuisine) => (
              <li key={cuisine}>
                <Tag tone="neutral">{CUISINE_LABEL[cuisine][locale]}</Tag>
              </li>
            ))}
            {stall.vegetarianStall ? (
              <li>
                <Tag tone="neutral">{t(EAT.vegetarianStall, locale)}</Tag>
              </li>
            ) : null}
            {halalTag ? (
              <li>
                <DietTag tag={halalTag} locale={locale} showDate />
              </li>
            ) : null}
          </ul>
          <p className="m-0 text-ink-600">
            {eat.dishCount(locale, dishes.length)}
            {range ? ` · ${eat.priceRange(locale, range.min, range.max)}` : ""}
          </p>
          {countActiveValues(filters) > 0 ? <p className="m-0 text-ink-900">{eat.stallMatchCount(locale, matching, dishes.length)}</p> : null}
        </Stack>

        <section aria-labelledby="eat-stall-where" className="rounded-panel border border-line bg-surface p-[var(--space-4)]">
          <Stack space={3}>
            <Heading level={2} id="eat-stall-where" className="m-0 text-xl">
              {t(EAT.wayfindingTitle, locale)}
            </Heading>
            <p className="m-0 flex items-start gap-[var(--space-1)] text-ink-900">
              <PinIcon className="mt-[4px] shrink-0 text-ink-600" size={18} />
              {stall.wayfinding ? pick(stall.wayfinding, locale) : t(EAT.noWayfinding, locale)}
            </p>
            <div data-slot="mini-map">
              <StallMiniMap locale={locale} data={data} stalls={[stall]} filters={filters} idPrefix="stall" />
            </div>
          </Stack>
        </section>

        <section aria-labelledby="eat-stall-menu">
          <Stack space={8}>
            <Heading level={2} id="eat-stall-menu" className="m-0 text-xl">
              {t(EAT.menuTitle, locale)}
            </Heading>
            {dishes.length === 0 ? (
              <InsetText>
                <p className="m-0 text-ink-900">{t(EAT.noMenuYet, locale)}</p>
              </InsetText>
            ) : null}
            {sections.map((section) => (
              <section key={section.type} aria-labelledby={`eat-stall-type-${section.type}`}>
                <Stack space={3}>
                  <Heading level={3} id={`eat-stall-type-${section.type}`} className="m-0 flex items-center text-lg gap-[var(--space-2)]">
                    <DishTypeIcon type={section.type} size={20} />
                    {TYPE_LABEL[section.type][locale]}
                    <span className="text-sm font-normal text-ink-600"> ({formatNumber(section.dishes.length, locale)})</span>
                  </Heading>
                  <Grid as="ul" minColumnWidth="16rem" className="m-0 list-none p-0">
                    {section.dishes.map((dish) => (
                      <li key={dish._id} className="min-w-0">
                        <DishCard dish={dish} stall={stall} locale={locale} filters={filters} headingLevel={4} />
                      </li>
                    ))}
                  </Grid>
                </Stack>
              </section>
            ))}
          </Stack>
        </section>

        <InsetText>
          <p className="m-0 text-sm text-ink-900">{t(EAT.surveyNote, locale)}</p>
          <p className="m-0 mt-[var(--space-2)] text-sm text-ink-900">{t(EAT.dietNote, locale)}</p>
        </InsetText>

        <p className="m-0">
          <Link href={eatHref(locale, "/eat/stalls", filters)} className="inline-flex min-h-[var(--target-min)] items-center font-medium">
            {t(EAT.backToStalls, locale)}
          </Link>
        </p>
      </Stack>
    </Container>
  );
}
