"use client";

import Link from "next/link";

import { Heading } from "@/components/ui/Heading";
import { InsetText } from "@/components/ui/InsetText";
import { Stack } from "@/components/ui/Stack";
import { Tag } from "@/components/ui/Tag";
import { commonCheckedOn, priceRange } from "@/lib/canteen/derive";
import { matchesFilters } from "@/lib/canteen/filter";
import { DISH_TYPES } from "@/lib/canteen/options";
import { countActiveValues, type RawParams } from "@/lib/canteen/params";
import { localePath, pick, type Locale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";
import type { CanteenData, CanteenStall } from "@/lib/content/types";

import { CheckedOnNote } from "../CheckedOnNote";
import { DietTag } from "../DietTag";
import { stallHalalTag } from "../diet";
import { DishRow } from "../DishRow";
import { DishTypeIcon, PinIcon } from "../icons";
import { CUISINE_LABEL, TYPE_LABEL } from "../labels";
import { eatHref } from "../links";
import { CanonicalRedirect, useRenderState, useSearch, type ServerRender } from "../live";
import { StallMiniMap } from "../pick/StallMiniMap";
import { readFilters } from "../query";
import { tidyTarget } from "../redirects";
import { EAT, eat, t } from "../strings";

interface StallDetailProps {
  locale: Locale;
  /** The stall's own dishes and the stalls and settings the map needs; see `dataForStall`. */
  data: CanteenData;
  stall: CanteenStall;
}

export function LiveStallDetail({ locale, data, stall, server }: StallDetailProps & { server?: ServerRender }) {
  const search = useSearch();
  const { now } = useRenderState(search.toString(), server);
  return (
    <>
      <CanonicalRedirect search={search.toString()} compute={() => tidyTarget(localePath(locale, `/eat/stalls/${stall.slug.current}`), search)} />
      <StallDetail locale={locale} data={data} stall={stall} query={search} now={now} />
    </>
  );
}

export function StallDetail({ locale, data, stall, query, now }: StallDetailProps & { query: RawParams; now: Date }) {
  const filters = readFilters(query);
  const dishes = data.dishes.filter((dish) => dish.stallId === stall._id);
  const range = priceRange(dishes);
  const checkedOn = commonCheckedOn(dishes);
  const filtered = countActiveValues(filters) > 0;
  const matchingIds = new Set(dishes.filter((dish) => matchesFilters(data, dish, filters, now)).map((dish) => dish._id));
  const matching = matchingIds.size;
  const halalTag = stallHalalTag(stall);

  const sections = DISH_TYPES.map((type) => ({
    type,
    dishes: dishes.filter((dish) => dish.type === type).sort((a, b) => (filtered ? Number(matchingIds.has(b._id)) - Number(matchingIds.has(a._id)) : 0) || a.price - b.price || pick(a.name, locale).localeCompare(pick(b.name, locale), locale)),
  })).filter((section) => section.dishes.length > 0);

  return (
    <Stack space={8}>
      <Stack space={2}>
        <p className="m-0 inline-flex w-fit items-center rounded-control bg-welfare px-[var(--space-3)] py-[var(--space-1)] text-lg font-semibold text-ink-on-fill">
          {eat.stallNumber(locale, stall.number)}
        </p>
        <Heading level={1} className="text-3xl leading-tight">{pick(stall.name, locale)}</Heading>
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
              <DietTag tag={halalTag} locale={locale} />
            </li>
          ) : null}
        </ul>
        <p className="m-0 text-ink-600">
          {eat.dishCount(locale, dishes.length)}
          {range ? ` · ${eat.priceRange(locale, range.min, range.max)}` : ""}
        </p>
        {filtered && dishes.length > 0 ? (
          <>
            <p className="m-0 text-ink-900">{eat.stallMatchCount(locale, matching, dishes.length)}</p>
            <p className="m-0">
              <Link href={eatHref(locale, "/eat/dishes", { ...filters, stall: stall.slug.current })} className="inline-flex min-h-[var(--target-min)] items-center font-medium">
                {t(EAT.showOnlyMatching, locale)}
              </Link>
            </p>
          </>
        ) : null}
      </Stack>

      <section aria-labelledby="eat-stall-where" className="rounded-panel border border-line bg-surface p-[var(--space-4)]">
        <Stack space={3}>
          <Heading level={2} id="eat-stall-where" className="m-0 text-xl">
            {t(EAT.wayfindingTitle, locale)}
          </Heading>
          <p className="m-0 flex items-start gap-[var(--space-1)] text-ink-900">
            <PinIcon className="mt-[calc((1lh-18px)/2)] shrink-0 text-ink-600" size={18} />
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
          {checkedOn ? <CheckedOnNote checkedOn={checkedOn} locale={locale} className="-mt-[var(--space-4)]" /> : null}
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
                <ul className="m-0 list-none divide-y divide-line border-y border-line p-0">
                  {section.dishes.map((dish) => (
                    <li key={dish._id}>
                      <DishRow dish={dish} stall={stall} locale={locale} filters={filters} matches={filtered ? matchingIds.has(dish._id) : undefined} />
                    </li>
                  ))}
                </ul>
              </Stack>
            </section>
          ))}
        </Stack>
      </section>

      <p className="m-0">
        <Link href={eatHref(locale, "/eat/stalls", filters)} className="inline-flex min-h-[var(--target-min)] items-center font-medium">
          {t(EAT.backToStalls, locale)}
        </Link>
      </p>
    </Stack>
  );
}
