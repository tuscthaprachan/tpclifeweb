import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { categoryLabel, LostFoundClaimContact, LostFoundKindBadge, LostFoundStatusTag } from "@/components/domain/lostfound";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container, Grid, Heading, InsetText, Stack, Tag, Timestamp } from "@/components/ui";
import { DEFAULT_LOCALE, LOCALES, isLocale, pick, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { hasImageAsset, urlFor } from "@/lib/sanity/image";
import { getLostFoundItemBySlug, getLostFoundPage } from "@/lib/sanity/queries";
import type { CampusPlace, SanityRef } from "@/lib/sanity/types";

const PHOTO_WIDTH = 800;
const PHOTO_HEIGHT = 600;

// getLostFoundPage only exposes a paged list, no "every slug" query. This
// mirrors what app/[locale]/news/[slug]/page.tsx does for the same reason:
// lib/sanity/queries.ts is a fixed contract, so static params come from one
// large page rather than a dedicated query added here.
const MAX_STATIC_ITEMS = 1000;

function isResolvedPlace(place: CampusPlace | SanityRef | undefined): place is CampusPlace {
  return Boolean(place) && (place as { _type?: string })._type === "place";
}

export async function generateStaticParams() {
  const { items } = await getLostFoundPage({}, 1, MAX_STATIC_ITEMS);
  return LOCALES.flatMap((locale) => items.map((item) => ({ locale, slug: item.slug.current })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const item = await getLostFoundItemBySlug(slug);
  if (!item) return {};

  return {
    title: pick(item.title, locale),
    description: pick(item.description, locale),
  };
}

export default async function LostFoundDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const item = await getLostFoundItemBySlug(slug);
  if (!item) notFound();

  const title = pick(item.title, locale);
  const description = pick(item.description, locale);
  const photos = item.photos?.filter(hasImageAsset) ?? [];
  const place = isResolvedPlace(item.place) ? item.place : null;
  const locationText = place ? pick(place.name, locale) : item.locationNote ? pick(item.locationNote, locale) : "";
  const isFound = item.kind === "found";

  return (
    <Container width="narrow">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: UI.home[locale], path: "/" },
          { label: UI.lostAndFound[locale], path: "/lost-and-found" },
          { label: title },
        ]}
      />
      <Stack space={6} className="py-[var(--space-8)]" as="section">
        <Stack space={2}>
          <div className="flex flex-wrap items-center gap-[var(--space-2)]">
            <LostFoundKindBadge kind={item.kind} locale={locale} />
            <Tag tone="neutral">{categoryLabel(item.category, locale)}</Tag>
            <LostFoundStatusTag status={item.status} locale={locale} />
          </div>
          <Heading level={1}>{title}</Heading>
          <p className="m-0 text-sm text-ink-600">
            {UI.lostFoundReference[locale]}: <span className="font-medium text-ink-900">{item.reference}</span>
            {" "}
            <span className="text-ink-600">({UI.lostFoundReferenceHint[locale]})</span>
          </p>
        </Stack>

        {/*
          Filtered through `hasImageAsset` rather than rendered as stored. A
          photo saved before its upload finished has no `asset._ref`, and
          `urlFor(...).url()` throws on it, which would fail this whole page
          instead of omitting one picture.
        */}
        {photos.length > 0 ? (
          <Grid minColumnWidth="12rem">
            {photos.map((photo, index) => (
              <div key={index} className="relative aspect-[4/3] w-full overflow-hidden rounded-panel bg-surface-sunk">
                <Image
                  src={urlFor(photo).width(PHOTO_WIDTH).height(PHOTO_HEIGHT).fit("crop").auto("format").url()}
                  alt={photo.isDecorative ? "" : pick(photo.alt, locale)}
                  fill
                  sizes="(min-width: 768px) 360px, 100vw"
                  className="object-cover"
                />
              </div>
            ))}
          </Grid>
        ) : null}

        <p className="m-0 whitespace-pre-line text-ink-900">{description}</p>

        <dl className="m-0 grid gap-[var(--space-4)] sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-ink-600">{isFound ? UI.dateFound[locale] : UI.dateLost[locale]}</dt>
            <dd className="m-0 text-ink-900">
              <Timestamp value={item.occurredOn} locale={locale} />
            </dd>
          </div>
          {locationText ? (
            <div>
              <dt className="text-sm font-medium text-ink-600">{isFound ? UI.whereFound[locale] : UI.whereLost[locale]}</dt>
              <dd className="m-0 text-ink-900">{locationText}</dd>
            </div>
          ) : null}
        </dl>

        {isFound ? (
          <Stack space={3} as="section" className="rounded-panel border border-line px-[var(--space-4)] py-[var(--space-4)]">
            <Heading level={2} visualLevel={4}>
              {UI.howToClaim[locale]}
            </Heading>
            {item.heldAt ? (
              <p className="m-0 text-ink-900">
                <span className="font-medium">{UI.heldAt[locale]}:</span> {pick(item.heldAt, locale)}
              </p>
            ) : null}
            {item.claimBy ? (
              <p className="m-0 text-ink-900">
                <span className="font-medium">{UI.collectBy[locale]}:</span> <Timestamp value={item.claimBy} locale={locale} />
              </p>
            ) : null}
            {item.claimContact ? <LostFoundClaimContact contact={item.claimContact} locale={locale} /> : null}
            <InsetText>{UI.claimCheckNote[locale]}</InsetText>
          </Stack>
        ) : null}
      </Stack>
    </Container>
  );
}
