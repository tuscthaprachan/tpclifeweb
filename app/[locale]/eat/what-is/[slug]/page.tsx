/**
 * One canonical dish for someone who has never had it: the explainer, which
 * stalls make it and at what price, how to order it in Thai (with a "show to
 * the stall" mode), and, where surveys exist, how the price has moved.
 *
 * `?show=<index>` renders one phrase full screen on the server, which is what
 * the "Show to the stall" link does without JavaScript. With JavaScript the
 * same control opens a dialog instead.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CanonicalCompare, EAT, eat, eatHref, readFilters, t } from "@/components/domain/canteen";
import {
  EXTRAS,
  LargePhrase,
  OrderPhrase,
  PriceHistoryChart,
  dishPricePoints,
  extras,
  monthYearLabel,
  parseShowIndex,
  type ChartPoint,
} from "@/components/domain/canteen/extras";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Button, Container, Heading, InsetText, Stack } from "@/components/ui";
import { dishesInCanonical, indexCanteen, stallOf } from "@/lib/canteen/derive";
import { DEFAULT_LOCALE, OTHER_LOCALE, isLocale, pick, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { getCanteenData } from "@/lib/sanity/queries";

type Params = Promise<{ locale: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const data = await getCanteenData();
  const canonical = indexCanteen(data).canonicalBySlug.get(slug);
  if (!canonical) return {};
  return {
    alternates: alternatesFor(locale, `/eat/what-is/${slug}`),
    title: pick(canonical.name, locale),
    description: pick(canonical.explainer, locale) || EXTRAS.whatIsIntro[locale],
  };
}

export default async function WhatIsDishPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: rawLocale, slug } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const query = await searchParams;
  const filters = readFilters(query);
  const data = await getCanteenData();
  const canonical = indexCanteen(data).canonicalBySlug.get(slug);
  if (!canonical) notFound();

  const name = pick(canonical.name, locale);
  const other = OTHER_LOCALE[locale];
  const otherName = pick(canonical.name, other);
  const route = `/eat/what-is/${slug}`;
  const phrases = canonical.howToOrder ?? [];
  const pageHref = eatHref(locale, route, filters);

  // The no-JavaScript "Show to the stall" view: one phrase, full screen.
  const shown = parseShowIndex(query.show, phrases.length);
  if (shown !== null) {
    const phrase = phrases[shown]!;
    return (
      <Container className="py-8">
        <Stack space={6}>
          <Heading level={1} className="visually-hidden">
            {EXTRAS.showDialogTitle[locale]}: {name}
          </Heading>
          <LargePhrase phrase={phrase} locale={locale} />
          <p className="m-0 text-center">
            <Button href={pageHref} variant="secondary">
              {EXTRAS.closeShow[locale]}
            </Button>
          </p>
        </Stack>
      </Container>
    );
  }

  const dishes = dishesInCanonical(data, canonical._id);
  const explainer = pick(canonical.explainer, locale);

  // One chart per dish that has been surveyed more than once.
  const histories = dishes
    .map((dish) => ({ dish, points: dishPricePoints(dish) }))
    .filter((entry) => entry.points.length >= 2);

  return (
    <Container className="py-8">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: UI.home[locale], path: "/" },
          { label: t(EAT.title, locale), path: "/eat" },
          { label: EXTRAS.whatIsTitle[locale], path: "/eat/what-is" },
          { label: name },
        ]}
      />

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
              <>
                <p className="m-0 text-sm text-ink-600">{EXTRAS.stallsNote[locale]}</p>
                <CanonicalCompare data={data} dishes={dishes} locale={locale} filters={filters} />
              </>
            ) : (
              <p className="m-0 text-ink-900">{EXTRAS.noStallNow[locale]}</p>
            )}
          </Stack>
        </section>

        {phrases.length > 0 ? (
          <OrderPhrase
            locale={locale}
            phrases={phrases.map((phrase, index) => ({
              key: phrase._key ?? String(index),
              th: phrase.th,
              romanised: phrase.romanised,
              en: phrase.en,
              href: eatHref(locale, route, filters, { show: index }),
            }))}
          />
        ) : (
          <p className="m-0 text-ink-600">{EXTRAS.noPhrases[locale]}</p>
        )}

        {histories.length > 0 ? (
          <section aria-labelledby="what-is-history">
            <Stack space={4}>
              <Heading level={2} id="what-is-history" className="m-0 text-xl">
                {EXTRAS.historyTitle[locale]}
              </Heading>
              <p className="m-0 text-sm text-ink-600">{EXTRAS.historyNote[locale]}</p>
              {histories.map(({ dish, points }) => {
                const stall = stallOf(data, dish);
                const chartPoints: ChartPoint[] = points.map((point) => ({
                  label: monthYearLabel(point.checkedOn, locale),
                  value: point.price,
                  checkedOn: point.checkedOn,
                }));
                return (
                  <PriceHistoryChart
                    key={dish._id}
                    points={chartPoints}
                    locale={locale}
                    headingLevel={3}
                    title={stall ? extras.dishAtStall(locale, pick(dish.name, locale), eat.stallFull(locale, stall.number, pick(stall.name, locale))) : pick(dish.name, locale)}
                    valueHeader={EXTRAS.colPrice[locale]}
                  />
                );
              })}
            </Stack>
          </section>
        ) : null}

        <InsetText>
          <p className="m-0 text-sm text-ink-600">{t(EAT.dietNote, locale)}</p>
        </InsetText>

        <div className="flex flex-wrap items-center gap-[var(--space-4)]">
          <Link href={eatHref(locale, "/eat/what-is", filters)} className="inline-flex min-h-[var(--target-min)] items-center font-medium">
            {EXTRAS.backToList[locale]}
          </Link>
          <Link href={eatHref(locale, "/eat/dishes", filters)} className="inline-flex min-h-[var(--target-min)] items-center font-medium">
            {EXTRAS.seeDishes[locale]}
          </Link>
        </div>
      </Stack>
    </Container>
  );
}
