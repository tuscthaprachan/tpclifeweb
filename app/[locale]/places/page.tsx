import type { Metadata } from "next";
import NextLink from "next/link";
import { notFound } from "next/navigation";

import { isLibrary } from "@/components/domain/home";
import { PlacesTable } from "@/components/domain/today";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container, EmptyState, Heading, Stack, PageTitle } from "@/components/ui";
import { getPlaces } from "@/lib/content";
import { DEFAULT_LOCALE, isLocale, localePath, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";

export const revalidate = 60;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return { alternates: alternatesFor(locale, "/places"), title: UI.tdPlaces[locale], description: UI.tdPlacesIntro[locale] };
}

/** Key places first, then libraries, then the rest: the order a student is most likely to need them. */
export default async function PlacesPage({ params }: Props) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const places = await getPlaces();
  const now = new Date();
  const libraries = places.filter(isLibrary);
  const key = places.filter((place) => place.isKeyLocation && !isLibrary(place));
  const rest = places.filter((place) => !place.isKeyLocation && !isLibrary(place));

  return (
    <Container>
      <Breadcrumbs locale={locale} items={[{ label: UI.home[locale], path: "/" }, { label: UI.tdPlaces[locale] }]} />
      <Stack space={8} className="pb-[var(--space-12)]">
        <Stack space={3}>
          <PageTitle path="/places" className="m-0">
            {UI.tdPlaces[locale]}
          </PageTitle>
          <p className="m-0 max-w-[var(--measure-en)] text-lg text-ink-900">{UI.tdPlacesIntro[locale]}</p>
        </Stack>

        {places.length === 0 ? <EmptyState title={UI.nothingHere[locale]}>{UI.keyHoursNotPublished[locale]}</EmptyState> : null}

        {key.length > 0 ? (
          <Stack space={3} as="section">
            <Heading level={2}>{UI.tdKeyPlaces[locale]}</Heading>
            <PlacesTable locale={locale} places={key} now={now} caption={UI.keyHoursTitle[locale]} />
          </Stack>
        ) : null}

        {libraries.length > 0 ? (
          <Stack space={3} as="section">
            <Heading level={2}>
              <NextLink href={localePath(locale, "/places/libraries")}>{UI.homeLibraries[locale]}</NextLink>
            </Heading>
            <PlacesTable locale={locale} places={libraries} now={now} caption={UI.tdLibrariesCaption[locale]} />
          </Stack>
        ) : null}

        {rest.length > 0 ? (
          <Stack space={3} as="section">
            <Heading level={2}>{UI.tdOtherPlaces[locale]}</Heading>
            <PlacesTable locale={locale} places={rest} now={now} caption={UI.tdPlacesCaption[locale]} />
          </Stack>
        ) : null}
      </Stack>
    </Container>
  );
}
