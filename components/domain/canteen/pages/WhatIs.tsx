import Link from "next/link";

import { Grid } from "@/components/ui/Grid";
import { Heading } from "@/components/ui/Heading";
import { Stack } from "@/components/ui/Stack";
import { dishesInCanonical, priceRange } from "@/lib/canteen/derive";
import type { RawParams } from "@/lib/canteen/params";
import { OTHER_LOCALE, pick, type Locale } from "@/lib/i18n/config";
import type { CanonicalDish, CanteenData } from "@/lib/content/types";

import { EXTRAS, excerpt, extras } from "../extras";
import { eatHref } from "../links";
import { readFilters } from "../query";
import { CanonicalStalls } from "../CanonicalStalls";

interface WhatIsListProps {
  locale: Locale;
  /** The canonical dishes with the dishes that map to them; see `dataForCanonicals`. */
  data: CanteenData;
}

export function WhatIsList({ locale, data, query }: WhatIsListProps & { query: RawParams }) {
  const filters = readFilters(query);
  const other = OTHER_LOCALE[locale];

  const sorted = [...data.canonicals].sort(
    (a, b) => pick(a.name, locale).localeCompare(pick(b.name, locale), locale) || a.slug.current.localeCompare(b.slug.current),
  );

  return (
    <section aria-label={EXTRAS.whatIsListLabel[locale]}>
      <Grid as="ul" minColumnWidth="18rem" className="m-0 list-none p-0">
        {sorted.map((canonical) => {
          const dishes = dishesInCanonical(data, canonical._id);
          const range = priceRange(dishes);
          const stalls = new Set(dishes.map((dish) => dish.stallId)).size;
          const otherName = pick(canonical.name, other);
          const text = excerpt(pick(canonical.explainer, locale));
          return (
            <li key={canonical._id} className="min-w-0 rounded-panel border border-line bg-surface p-[var(--space-4)]">
              <Stack space={2}>
                <Heading level={2} className="m-0 text-lg">
                  <Link href={eatHref(locale, `/eat/what-is/${canonical.slug.current}`, filters)} className="inline-flex min-h-[var(--target-min)] items-center">{pick(canonical.name, locale)}</Link>
                </Heading>
                {otherName && otherName !== pick(canonical.name, locale) ? (
                  <p lang={other} className="m-0 text-sm text-ink-600">
                    {otherName}
                  </p>
                ) : null}
                <p className="m-0 text-ink-900">{text || EXTRAS.noExplainer[locale]}</p>
                <p className="m-0 text-sm text-ink-600">
                  {range ? extras.acrossCanteen(locale, range.min, range.max, stalls) : EXTRAS.noStallNow[locale]}
                </p>
              </Stack>
            </li>
          );
        })}
      </Grid>
    </section>
  );
}

interface WhatIsDetailProps {
  locale: Locale;
  /** The dish's own dishes and the stalls; see `dataForCanonicals`. */
  data: CanteenData;
  canonical: CanonicalDish;
}

export function WhatIsDetail({ locale, data, canonical, query }: WhatIsDetailProps & { query: RawParams }) {
  const filters = readFilters(query);
  const name = pick(canonical.name, locale);
  const other = OTHER_LOCALE[locale];
  const otherName = pick(canonical.name, other);

  const dishes = dishesInCanonical(data, canonical._id);
  const explainer = pick(canonical.explainer, locale);

  return (
    <Stack space={8}>
      <Stack space={2}>
        <Heading level={1} className="text-3xl">{name}</Heading>
        {otherName && otherName !== name ? (
          <p lang={other} className="m-0 text-lg text-ink-600">
            {otherName}
          </p>
        ) : null}
      </Stack>

      <section aria-labelledby="what-is-about">
        <Stack space={3}>
          <Heading level={2} id="what-is-about" className="m-0 text-xl">
            {EXTRAS.aboutTitle[locale]}
          </Heading>
          <p className="m-0 max-w-prose text-ink-900">{explainer || EXTRAS.noExplainer[locale]}</p>
        </Stack>
      </section>

      <section aria-labelledby="what-is-stalls">
        <Stack space={3}>
          <Heading level={2} id="what-is-stalls" className="m-0 text-xl">
            {EXTRAS.stallsTitle[locale]}
          </Heading>
          {dishes.length > 0 ? (
            <CanonicalStalls data={data} dishes={dishes} locale={locale} filters={filters} />
          ) : (
            <p className="m-0 text-ink-900">{EXTRAS.noStallNow[locale]}</p>
          )}
        </Stack>
      </section>

      <div className="flex flex-wrap items-center gap-[var(--space-4)]">
        <Link href={eatHref(locale, "/eat/what-is", filters)} className="inline-flex min-h-[var(--target-min)] items-center font-medium">
          {EXTRAS.backToList[locale]}
        </Link>
        <Link href={eatHref(locale, "/eat/dishes", filters)} className="inline-flex min-h-[var(--target-min)] items-center font-medium">
          {EXTRAS.seeDishes[locale]}
        </Link>
      </div>
    </Stack>
  );
}
