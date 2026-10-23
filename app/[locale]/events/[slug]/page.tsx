import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EventSchedule, ownerLabel, categoryLabel } from "@/components/domain/event";
// FormCallout takes a resolved FormRecord and a headingLevel. getEventBySlug
// already resolves `relatedForm` to a full record, so no extra fetch is
// needed here, only the import.
import { FormCallout } from "@/components/domain/form";
import { RichText } from "@/components/domain/rich-text";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container, Heading, Link, NotificationBanner, Stack, StatusTag, Tag } from "@/components/ui";
import { DEFAULT_LOCALE, LOCALES, isLocale, pick, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { getEventBySlug, getUpcomingEvents, resolveRichTextRefs } from "@/lib/content";

// getUpcomingEvents only covers events that have not yet ended, so a past
// event's slug will not be pre-rendered here. It still resolves fine on
// request: dynamicParams is not overridden at this route, only at the
// [locale] segment above it, so Next renders it on demand instead of 404ing.
export async function generateStaticParams() {
  const events = await getUpcomingEvents();
  return LOCALES.flatMap((locale) => events.map((event) => ({ locale, slug: event.slug.current })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const event = await getEventBySlug(slug);
  if (!event) return {};

  return {
    title: pick(event.title, locale),
    description: pick(event.summary, locale),
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const title = pick(event.title, locale);
  const place = event.place ?? null;
  const location = place ? pick(place.name, locale) : event.location ? pick(event.location, locale) : "";
  const relatedForm = event.relatedForm ?? null;
  const resolved = await resolveRichTextRefs([event.body?.[locale]]);

  return (
    <Container width="narrow">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: UI.home[locale], path: "/" },
          { label: UI.events[locale], path: "/events" },
          { label: title },
        ]}
      />
      <Stack space={6} className="pb-[var(--space-8)] pt-[var(--space-2)]" as="section">
        <Stack space={2}>
          <div className="flex flex-wrap items-center gap-[var(--space-2)]">
            {event.isCancelled ? <StatusTag tone="error" label={UI.eventCancelled[locale]} /> : null}
            {event.category ? <Tag tone={event.category}>{categoryLabel(event.category, locale)}</Tag> : null}
          </div>
          <Heading level={1}>{title}</Heading>
          <div className="flex flex-wrap items-center gap-[var(--space-2)] text-sm text-ink-600">
            <EventSchedule event={event} locale={locale} />
            <span aria-hidden="true">·</span>
            <span>{ownerLabel(event.owner, locale)}</span>
          </div>
          {location ? <p className="m-0 text-ink-600">{location}</p> : null}
        </Stack>

        {event.isCancelled ? (
          <NotificationBanner variant="warning" title={UI.eventCancelled[locale]}>
            {event.cancellationNote ? pick(event.cancellationNote, locale) : UI.eventCancelled[locale]}
          </NotificationBanner>
        ) : null}

        {event.body ? <RichText value={event.body[locale]} locale={locale} headingLevel={2} resolved={resolved} /> : null}

        {relatedForm ? <FormCallout form={relatedForm} locale={locale} headingLevel={2} /> : null}

        {event.registrationUrl ? (
          <p className="m-0">
            <Link href={event.registrationUrl} locale={locale} className="font-semibold text-action">
              {UI.startForm[locale]}
            </Link>
          </p>
        ) : null}
      </Stack>
    </Container>
  );
}
