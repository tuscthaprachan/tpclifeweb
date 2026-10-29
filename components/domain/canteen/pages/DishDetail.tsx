"use client";

import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Grid } from "@/components/ui/Grid";
import { Heading } from "@/components/ui/Heading";
import { Stack } from "@/components/ui/Stack";
import { addOnsFor, canonicalOf, dishesInCanonical, stallOf } from "@/lib/canteen/derive";
import type { RawParams } from "@/lib/canteen/params";
import { OTHER_LOCALE, pick, type Locale } from "@/lib/i18n/config";
import type { CanteenData, CanteenDish } from "@/lib/content/types";

import { CanonicalStalls } from "../CanonicalStalls";
import { dishDietTags } from "../diet";
import { DietTags } from "../DietTag";
import { FavouriteToggle } from "../FavouriteToggle";
import { HowToSay } from "../HowToSay";
import { DishTypeIcon, PinIcon } from "../icons";
import { ALLERGEN_LABEL, PROTEIN_LABEL, STYLE_LABEL, TYPE_LABEL } from "../labels";
import { eatHref, mapHref, stallHref } from "../links";
import { useSearch } from "../live";
import { StallMiniMap } from "../pick/StallMiniMap";
import { PriceTag } from "../PriceTag";
import { readFilters } from "../query";
import { EAT, eat, t } from "../strings";

interface DishDetailProps {
  locale: Locale;
  /** The dish, the other dishes of its canonical dish, and the stalls and settings; see `dataForDish`. */
  data: CanteenData;
  dish: CanteenDish;
}

export function LiveDishDetail({ locale, data, dish }: DishDetailProps) {
  return <DishDetail locale={locale} data={data} dish={dish} query={useSearch()} />;
}

export function DishDetail({ locale, data, dish, query }: DishDetailProps & { query: RawParams }) {
  const filters = readFilters(query, data);
  const stall = stallOf(data, dish);
  const canonical = canonicalOf(data, dish);
  const sameDish = canonical ? dishesInCanonical(data, canonical._id) : [];
  const other = OTHER_LOCALE[locale];
  const name = pick(dish.name, locale);
  const otherName = pick(dish.name, other);

  return (
    <Stack space={8}>
      <Stack space={1}>
        <p className="m-0 inline-flex items-center gap-[var(--space-1)] text-sm text-ink-600">
          <DishTypeIcon type={dish.type} />
          {TYPE_LABEL[dish.type][locale]}
        </p>
        <div className="flex flex-wrap items-start justify-between gap-x-[var(--space-3)]">
          <Heading level={1} className="text-3xl leading-tight">{name}</Heading>
          <FavouriteToggle slug={dish.slug.current} name={name} locale={locale} />
        </div>
        {otherName && otherName !== name ? (
          <p lang={other} className="m-0 text-lg text-ink-600">
            {otherName}
          </p>
        ) : null}
        <HowToSay dish={dish} locale={locale} className="text-base" />
      </Stack>

      <Grid minColumnWidth="18rem" space={4} className="items-start">
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
                <p className="m-0 flex items-center gap-[var(--space-1)] text-base font-medium">
                  <PinIcon className="shrink-0 text-ink-600" size={18} />
                  <Link href={stallHref(locale, stall.slug.current, filters)} className="inline-flex min-h-[var(--target-min)] items-center">{eat.stallFull(locale, stall.number, pick(stall.name, locale))}</Link>
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
            {dish.protein.length > 0 ? (
              <div>
                <dt className="text-sm font-medium text-ink-600">{t(EAT.proteinLine, locale)}</dt>
                <dd className="m-0 text-ink-900">{dish.protein.map((protein) => PROTEIN_LABEL[protein][locale]).join(", ")}</dd>
              </div>
            ) : null}
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

      {canonical && sameDish.some((candidate) => candidate.stallId !== dish.stallId) ? (
        <section aria-labelledby="eat-dish-also" className="flex flex-col gap-[var(--space-3)]">
          <Heading level={2} id="eat-dish-also" className="m-0 text-xl">
            {eat.atOtherStalls(locale, pick(canonical.name, locale))}
          </Heading>
          <CanonicalStalls data={data} dishes={sameDish} locale={locale} filters={filters} excludeStallId={dish.stallId} />
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
  );
}
