/**
 * One canonical dish for someone who has never had it: the explainer, which
 * stalls make it and at what price.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CanonicalCompare, EAT, eatHref, readFilters, t } from "@/components/domain/canteen";
import { EXTRAS } from "@/components/domain/canteen/extras";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container, Heading, InsetText, Stack } from "@/components/ui";
import { dishesInCanonical, indexCanteen } from "@/lib/canteen/derive";
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

  const dishes = dishesInCanonical(data, canonical._id);
  const explainer = pick(canonical.explainer, locale);

  return (
    <Container className="pb-8 pt-2">
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
