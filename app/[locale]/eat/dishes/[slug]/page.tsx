/**
 * One dish: the surveyed price with its date and every option, the stall and
 * how to find it, diet, and the same dish at other stalls with the
 * cheapest marked. Carries the reader's filters into every link.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  CanonicalCompare,
  DietTags,
  DishTypeIcon,
  EAT,
  HowToSay,
  PinIcon,
  PriceTag,
  ALLERGEN_LABEL,
  PROTEIN_LABEL,
  STYLE_LABEL,
  TYPE_LABEL,
  dishDietTags,
  eat,
  eatHref,
  mapHref,
  readFilters,
  stallHref,
  t,
} from "@/components/domain/canteen";
import { StallMiniMap } from "@/components/domain/canteen/pick/StallMiniMap";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Button, Container, Grid, Heading, Stack } from "@/components/ui";
import { addOnsFor, canonicalOf, dishesInCanonical, indexCanteen, stallOf } from "@/lib/canteen/derive";
import { DEFAULT_LOCALE, OTHER_LOCALE, isLocale, pick, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { getCanteenData } from "@/lib/sanity/queries";

type Params = Promise<{ locale: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const data = await getCanteenData();
  const dish = indexCanteen(data).dishBySlug.get(slug);
  if (!dish) return {};
  const stall = stallOf(data, dish);
  return {
    alternates: alternatesFor(locale, `/eat/dishes/${slug}`),
    title: pick(dish.name, locale),
    description: stall ? `${eat.dishAtStall(locale, pick(dish.name, locale), eat.stallFull(locale, stall.number, pick(stall.name, locale)))}` : undefined,
  };
}

export default async function EatDishPage({
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
  const index = indexCanteen(data);
  const dish = index.dishBySlug.get(slug);
  if (!dish) notFound();

  const stall = stallOf(data, dish);
  const canonical = canonicalOf(data, dish);
  const sameDish = canonical ? dishesInCanonical(data, canonical._id) : [];
  const other = OTHER_LOCALE[locale];
  const name = pick(dish.name, locale);
  const otherName = pick(dish.name, other);

  return (
    <Container className="pb-8 pt-2">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: UI.home[locale], path: "/" },
          { label: t(EAT.title, locale), path: "/eat" },
          { label: t(EAT.dishesTitle, locale), path: "/eat/dishes" },
          { label: name },
        ]}
      />

      <Stack space={8}>
        <Stack space={1}>
          <p className="m-0 inline-flex items-center gap-[var(--space-1)] text-sm text-ink-600">
            <DishTypeIcon type={dish.type} />
            {TYPE_LABEL[dish.type][locale]}
          </p>
          <Heading level={1} className="text-3xl leading-tight">{name}</Heading>
          {otherName && otherName !== name ? (
            <p lang={other} className="m-0 text-lg text-ink-600">
              {otherName}
            </p>
          ) : null}
          <HowToSay dish={dish} locale={locale} className="text-base" />
        </Stack>

        <Grid minColumnWidth="18rem" space={4}>
          <section aria-labelledby="eat-dish-price" className="rounded-panel border border-line bg-surface p-[var(--space-4)]">
            <Stack space={3}>
              <Heading level={2} id="eat-dish-price" className="m-0 text-xl">
                {t(EAT.priceTitle, locale)}
              </Heading>
              <PriceTag price={dish.price} variants={dish.variants} addOns={addOnsFor(dish, stall)} checkedOn={dish.checkedOn} locale={locale} size="full" />
            </Stack>
          </section>

          <section aria-labelledby="eat-dish-where" className="rounded-panel border border-line bg-surface p-[var(--space-4)]">
            <Stack space={3}>
              <Heading level={2} id="eat-dish-where" className="m-0 text-xl">
                {t(EAT.whereTitle, locale)}
              </Heading>
              {stall ? (
                <>
                  <p className="m-0 flex items-start gap-[var(--space-1)] text-base font-medium">
                    <PinIcon className="mt-[calc((1lh-18px)/2)] shrink-0 text-ink-600" size={18} />
                    <Link href={stallHref(locale, stall.slug.current, filters)}>{eat.stallFull(locale, stall.number, pick(stall.name, locale))}</Link>
                  </p>
                  <p className="m-0 text-ink-900">{stall.wayfinding ? pick(stall.wayfinding, locale) : t(EAT.noWayfinding, locale)}</p>
                  <div data-slot="mini-map">
                    <StallMiniMap locale={locale} data={data} stalls={[stall]} filters={filters} idPrefix="dish" showLink={false} />
                  </div>
                  <div>
                    <Button href={mapHref(locale, filters, stall.slug.current)}>{t(EAT.showOnMap, locale)}</Button>
                  </div>
                </>
              ) : null}
            </Stack>
          </section>
        </Grid>

        <section aria-labelledby="eat-dish-about">
          <Stack space={3}>
            <Heading level={2} id="eat-dish-about" className="m-0 text-xl">
              {t(EAT.aboutTitle, locale)}
            </Heading>
            <dl className="m-0 grid gap-[var(--space-3)] sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-ink-600">{t(EAT.proteinLine, locale)}</dt>
                <dd className="m-0 text-ink-900">{dish.protein.map((protein) => PROTEIN_LABEL[protein][locale]).join(", ")}</dd>
              </div>
              {dish.contains && dish.contains.length > 0 ? (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-ink-600">{t(EAT.containsLine, locale)}</dt>
                  <dd className="m-0 text-ink-900">{dish.contains.map((allergen) => ALLERGEN_LABEL[allergen][locale]).join(", ")}</dd>
                </div>
              ) : null}
              {dish.style ? (
                <div>
                  <dt className="text-sm font-medium text-ink-600">{t(EAT.styleLine, locale)}</dt>
                  <dd className="m-0 text-ink-900">{STYLE_LABEL[dish.style][locale]}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-sm font-medium text-ink-600">{t(EAT.temperatureLine, locale)}</dt>
                <dd className="m-0 text-ink-900">
                  {t(dish.temperature === "hot" ? EAT.hot : EAT.cold, locale)}
                  {dish.wet ? `, ${t(EAT.soupyWord, locale)}` : ""}
                </dd>
              </div>
            </dl>
          </Stack>
        </section>

        {dishDietTags(dish, stall).length > 0 ? (
          <section aria-labelledby="eat-dish-diet">
            <Stack space={3}>
              <Heading level={2} id="eat-dish-diet" className="m-0 text-xl">
                {t(EAT.dietTitle, locale)}
              </Heading>
              <DietTags tags={dishDietTags(dish, stall)} locale={locale} />
            </Stack>
          </section>
        ) : null}

        {canonical && sameDish.length > 1 ? (
          <section aria-labelledby="eat-dish-also" className="flex flex-col gap-[var(--space-3)]">
            <Heading level={2} id="eat-dish-also" className="m-0 text-xl">
              {t(EAT.compareTitle, locale)}
            </Heading>
            <p className="m-0 text-sm text-ink-600">
              {pick(canonical.name, locale)}. {t(EAT.compareNote, locale)}
            </p>
            <CanonicalCompare data={data} dishes={sameDish} locale={locale} filters={filters} currentSlug={dish.slug.current} />
          </section>
        ) : null}

        <div className="flex flex-wrap items-center gap-[var(--space-4)]">
          <Link href={eatHref(locale, "/eat/pick", filters)} className="inline-flex min-h-[var(--target-min)] items-center font-medium">
            {t(EAT.decideWithThese, locale)}
          </Link>
          {canonical ? (
            <Link href={eatHref(locale, `/eat/what-is/${canonical.slug.current}`, filters)} className="inline-flex min-h-[var(--target-min)] items-center font-medium">
              {t(EAT.whatIsLink, locale)}
            </Link>
          ) : null}
          <Link href={eatHref(locale, "/eat/dishes", filters)} className="inline-flex min-h-[var(--target-min)] items-center font-medium">
            {t(EAT.backToDishes, locale)}
          </Link>
        </div>
      </Stack>
    </Container>
  );
}
