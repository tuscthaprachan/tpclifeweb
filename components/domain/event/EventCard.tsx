import Image from "next/image";
import NextLink from "next/link";

import { Heading, StatusTag, Tag } from "@/components/ui";
import type { HeadingLevel } from "@/lib/a11y";
import { localePath, pick, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { CampusEvent } from "@/lib/content/types";
import { categoryLabel } from "./categoryLabel";
import { EventSchedule } from "./EventSchedule";

interface EventCardProps {
  event: CampusEvent;
  locale: Locale;
  headingLevel: HeadingLevel;
}

function eventLocation(event: CampusEvent, locale: Locale): string {
  if (event.place) return pick(event.place.name, locale);
  if (event.location) return pick(event.location, locale);
  return "";
}

/**
 * An event list item. Events are the other surface CONTRIBUTING.md names as
 * a genuine fit for cards: an image, a date and equal weight per item.
 */
export function EventCard({ event, locale, headingLevel }: EventCardProps) {
  const href = localePath(locale, `/events/${event.slug.current}`);
  const title = pick(event.title, locale);
  const summary = pick(event.summary, locale);
  const location = eventLocation(event, locale);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-panel border border-line">
      {event.cover ? (
        <div className="relative aspect-[16/9] w-full bg-surface-sunk">
          <Image
            src={event.cover.url}
            alt={event.cover.isDecorative ? "" : pick(event.cover.alt, locale)}
            fill
            sizes="(min-width: 768px) 360px, 100vw"
            className="object-cover"
          />
        </div>
      ) : null}
      <div className="flex flex-1 flex-col gap-[var(--space-2)] px-[var(--space-4)] py-[var(--space-4)]">
        <div className="flex flex-wrap items-center gap-[var(--space-2)]">
          {event.isCancelled ? <StatusTag tone="error" label={UI.eventCancelled[locale]} /> : null}
          {event.category ? <Tag tone={event.category}>{categoryLabel(event.category, locale)}</Tag> : null}
        </div>
        <Heading level={headingLevel} className="m-0 text-lg">
          <NextLink href={href} className="text-ink-900 no-underline hover:underline">
            {title}
          </NextLink>
        </Heading>
        <p className="m-0 text-ink-600">{summary}</p>
        <div className="mt-auto flex flex-col gap-[var(--space-1)] pt-[var(--space-2)] text-sm text-ink-600">
          <EventSchedule event={event} locale={locale} />
          {location ? <span>{location}</span> : null}
        </div>
      </div>
    </article>
  );
}
