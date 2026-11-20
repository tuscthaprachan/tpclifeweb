import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { contactHref, contactLabel } from "@/components/domain/directory";
import { isLibrary, upcomingSpecialHours } from "@/components/domain/home";
import {
  AlertLinks,
  NextDaysTable,
  PlaceStatusTag,
  SpecialHoursList,
  UsualHoursTable,
  alertsAffecting,
  placeStatus,
  placeStatusLine,
  todayHoursText,
} from "@/components/domain/today";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container, Heading, Link, Stack, SummaryList, Timestamp, WarningText } from "@/components/ui";
import { getActiveServiceAlerts, getPlaceBySlug, getTodaySettings } from "@/lib/content";
import { DEFAULT_LOCALE, isLocale, pick, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";

export const revalidate = 60;

export function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const place = await getPlaceBySlug(slug);
  if (!place) return {};
  return {
    alternates: alternatesFor(locale, `/places/${slug}`),
    title: pick(place.name, locale),
    description: place.description ? pick(place.description, locale) : undefined,
  };
}

/**
 * Everything about one place, most urgent first: open or closed now and
 * until when, today's hours, any closure, the next seven days, then where it
 * is, how to contact it, access, and what it is.
 */
export default async function PlacePage({ params }: Props) {
  const { locale: rawLocale, slug } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const [place, alerts, settings] = await Promise.all([getPlaceBySlug(slug), getActiveServiceAlerts(), getTodaySettings()]);
  if (!place) notFound();

  const now = new Date();
  const status = placeStatus(place, now);
  const hours = place.openingHours ?? [];
  const special = upcomingSpecialHours(hours, now);
  const related = alertsAffecting(alerts, "campus");
  const library = isLibrary(place);
  const moreInfo = place.moreInfoUrl ?? (library ? settings.librariesGuidePath : undefined);
  const mapUrl = place.lat != null && place.lng != null ? `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}` : null;

  const facts = [
    { key: UI.tdNow[locale], value: <span className="flex flex-wrap items-baseline gap-x-[var(--space-2)]"><PlaceStatusTag locale={locale} status={status} /><span>{placeStatusLine(place, status, now, locale)}</span></span> },
    { key: UI.tdTodayHours[locale], value: todayHoursText(hours, now, locale) },
  ];
  const hasDatedHours = hours.some((entry) => entry.validFrom || entry.validUntil);

  return (
    <Container>
      <Breadcrumbs
        locale={locale}
        items={[
          { label: UI.home[locale], path: "/" },
          library ? { label: UI.homeLibraries[locale], path: "/places/libraries" } : { label: UI.tdPlaces[locale], path: "/places" },
          { label: pick(place.name, locale) },
        ]}
      />

      <Stack space={8} className="pb-[var(--space-12)]">
        <Stack space={3}>
          <Heading level={1} className="m-0">
            {pick(place.name, locale)}
          </Heading>
          {place.description ? <p className="m-0 max-w-[var(--measure-en)] text-lg text-ink-900">{pick(place.description, locale)}</p> : null}
        </Stack>

        {place.closureNote ? <WarningText>{pick(place.closureNote, locale)}</WarningText> : null}

        <SummaryList rows={facts} />

        {related.length > 0 ? (
          <Stack space={2} as="section">
            <Heading level={2}>{UI.tdRelatedAlerts[locale]}</Heading>
            <AlertLinks locale={locale} alerts={related} />
          </Stack>
        ) : null}

        {hours.length > 0 ? (
          <Stack space={4} as="section">
            <Heading level={2}>{UI.tdNext7Days[locale]}</Heading>
            <NextDaysTable locale={locale} entries={hours} now={now} />
          </Stack>
        ) : null}

        {hasDatedHours ? (
          <Stack space={4} as="section">
            <Heading level={2}>{UI.tdUsualHours[locale]}</Heading>
            <UsualHoursTable locale={locale} entries={hours} />
          </Stack>
        ) : null}

        {special.length > 0 ? (
          <Stack space={4} as="section">
            <Heading level={2}>{UI.tdComingUp[locale]}</Heading>
            <SpecialHoursList locale={locale} rows={special} />
          </Stack>
        ) : null}

        {place.building || mapUrl ? (
          <Stack space={2} as="section">
            <Heading level={2}>{UI.tdFindIt[locale]}</Heading>
            {place.building ? <p className="m-0">{pick(place.building, locale)}</p> : null}
            {mapUrl ? (
              <p className="m-0">
                <Link href={mapUrl} locale={locale}>
                  {UI.tdOpenMap[locale]}
                </Link>
              </p>
            ) : null}
          </Stack>
        ) : null}

        {place.contacts && place.contacts.length > 0 ? (
          <Stack space={2} as="section">
            <Heading level={2}>{UI.tdContact[locale]}</Heading>
            <ul className="m-0 flex flex-col gap-[var(--space-2)] p-0" style={{ listStyle: "none" }}>
              {place.contacts.map((contact) => {
                const href = contactHref(contact);
                return (
                  <li key={contact._key}>
                    <span className="text-ink-600">{contactLabel(contact, locale)}: </span>
                    {href ? (
                      <Link href={href} locale={locale}>
                        {contact.value}
                      </Link>
                    ) : (
                      <span>{contact.value}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </Stack>
        ) : null}

        {place.accessibility ? (
          <Stack space={2} as="section">
            <Heading level={2}>{UI.tdAccessibility[locale]}</Heading>
            <p className="m-0 max-w-[var(--measure-en)] whitespace-pre-line">{pick(place.accessibility, locale)}</p>
          </Stack>
        ) : null}

        {moreInfo ? (
          <p className="m-0">
            <Link href={moreInfo.startsWith("/") ? `/${locale}${moreInfo}` : moreInfo} locale={locale} className="font-semibold">
              {library ? UI.tdLibrariesGuide[locale] : UI.tdMoreInfo[locale]}
            </Link>
          </p>
        ) : null}

        <p className="m-0 text-sm text-ink-600">
          {UI.tdUpdated[locale]} <Timestamp value={place._updatedAt} locale={locale} />
        </p>
      </Stack>
    </Container>
  );
}
