/**
 * What is this dish: every canonical dish A to Z in the reader's language,
 * with a short explainer and the price range across the canteen. For
 * exchange and international students who have never met the dish.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EAT, eatHref, readFilters, redirectToTidyQuery, t } from "@/components/domain/canteen";
import { EXTRAS, excerpt, extras } from "@/components/domain/canteen/extras";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container, EmptyState, Grid, Heading, Stack } from "@/components/ui";
import { dishesInCanonical, priceRange } from "@/lib/canteen/derive";
import { DEFAULT_LOCALE, OTHER_LOCALE, isLocale, localePath, pick, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { getCanteenData } from "@/lib/content";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, "/eat/what-is"),
    title: EXTRAS.whatIsTitle[locale],
    description: EXTRAS.whatIsIntro[locale],
  };
}

export default async function WhatIsIndexPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const query = await searchParams;
  redirectToTidyQuery(localePath(locale, "/eat/what-is"), query);
  const filters = readFilters(query);
  const data = await getCanteenData();
  const other = OTHER_LOCALE[locale];

  const sorted = [...data.canonicals].sort(
    (a, b) => pick(a.name, locale).localeCompare(pick(b.name, locale), locale) || a.slug.current.localeCompare(b.slug.current),
  );

  return (
    <Container className="pb-8 pt-2">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: UI.home[locale], path: "/" },
          { label: t(EAT.title, locale), path: "/eat" },
          { label: EXTRAS.whatIsTitle[locale] },
        ]}
      />
      <Stack space={8}>
        <Stack space={2}>
          <Heading level={1} className="text-3xl">{EXTRAS.whatIsTitle[locale]}</Heading>
          <p className="m-0 max-w-prose text-ink-600">{EXTRAS.whatIsIntro[locale]}</p>
        </Stack>

        {sorted.length === 0 ? (
          <EmptyState title={EXTRAS.whatIsNoData[locale]}>{EXTRAS.whatIsNoDataBody[locale]}</EmptyState>
        ) : (
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
        )}
      </Stack>
    </Container>
  );
}
