import NextLink from "next/link";

import { Button, EmptyState, Heading, StatusTag, Timestamp } from "@/components/ui";
import { localePath, pick, type Locale } from "@/lib/i18n/config";
import { formatTime, isoDateTime } from "@/lib/i18n/format";
import { UI } from "@/lib/i18n/strings";
import type { CampusEvent, NewsPost } from "@/lib/content/types";
import { dayAndMonth } from "./dateParts";
import { SectionBar } from "./SectionBar";

const HEADING_ID = "home-whats-on-heading";

export const WHATS_ON_EVENTS = 2;
export const WHATS_ON_NEWS = 2;

interface WhatsOnProps {
  locale: Locale;
  /** Already filtered to upcoming, ascending (`getUpcomingEvents`). Capped here. */
  events: CampusEvent[];
  /** Newest first (`getNewsPage`). Capped here. */
  news: NewsPost[];
}

const SECTION_LINK_CLASS = "inline-flex min-h-[var(--target-min)] items-center font-semibold";
const META_CLASS = "block text-[length:var(--text-sm)] text-ink-600";

function eventMeta(event: CampusEvent, locale: Locale): string {
  const where = event.place ? pick(event.place.name, locale) : event.location ? pick(event.location, locale) : "";
  const when = event.isAllDay
    ? UI.allDay[locale]
    : event.endsAt
      ? `${formatTime(event.startsAt, locale)} - ${formatTime(event.endsAt, locale)}`
      : formatTime(event.startsAt, locale);
  return where ? `${where} · ${when}` : when;
}

export function WhatsOn({ locale, events, news }: WhatsOnProps) {
  const upcomingEvents = events.slice(0, WHATS_ON_EVENTS);
  const latestNews = news.slice(0, WHATS_ON_NEWS);

  return (
    <section aria-labelledby={HEADING_ID}>
      <SectionBar id={HEADING_ID} tone="activity">
        {UI.homeWhatsOn[locale]}
      </SectionBar>

      <Heading level={3} className="mb-0 mt-[var(--space-4)]">
        {UI.homeEvents[locale]}
      </Heading>
      {upcomingEvents.length === 0 ? (
        <EmptyState
          className="mt-[var(--space-3)]"
          title={UI.noUpcomingEvents[locale]}
          action={
            <Button href={localePath(locale, "/events")} variant="secondary" size="sm">
              {UI.allEvents[locale]}
            </Button>
          }
        />
      ) : (
        <ul className="m-0 list-none p-0">
          {upcomingEvents.map((event) => {
            const { day, month } = dayAndMonth(event.startsAt, locale);
            return (
              <li key={event._id} className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-[var(--space-3)] border-b border-line py-[var(--space-3)]">
                <time
                  dateTime={isoDateTime(event.startsAt)}
                  className="grid h-[3.75rem] w-14 place-items-center rounded-[14px] bg-activity text-center font-bold leading-tight text-ink-on-fill"
                >
                  <span>
                    <span className="block text-xl leading-tight">{day}</span>
                    <span className="block text-[length:var(--text-xs)] leading-tight">{month}</span>
                  </span>
                </time>
                <span>
                  <NextLink href={localePath(locale, `/events/${event.slug.current}`)} className="font-bold">
                    {pick(event.title, locale)}
                  </NextLink>
                  <span className={META_CLASS}>{eventMeta(event, locale)}</span>
                  {event.isCancelled ? <StatusTag tone="error" label={UI.eventCancelled[locale]} /> : null}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <Heading level={3} className="mb-0 mt-[var(--space-4)]">
        {UI.homeNews[locale]}
      </Heading>
      {latestNews.length === 0 ? (
        <EmptyState
          className="mt-[var(--space-3)]"
          title={UI.nothingHere[locale]}
          action={
            <Button href={localePath(locale, "/news")} variant="secondary" size="sm">
              {UI.allNews[locale]}
            </Button>
          }
        />
      ) : (
        <ul className="m-0 list-none p-0">
          {latestNews.map((post) => (
            <li key={post._id} className="border-b border-line py-[var(--space-3)]">
              <NextLink href={localePath(locale, `/news/${post.slug.current}`)} className="font-bold">
                {pick(post.title, locale)}
              </NextLink>
              <Timestamp value={post.publishedAt} locale={locale} className={META_CLASS} />
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-x-[var(--space-5)]">
        <NextLink href={localePath(locale, "/events")} className={SECTION_LINK_CLASS}>
          {UI.allEvents[locale]}
        </NextLink>
        <NextLink href={localePath(locale, "/news")} className={SECTION_LINK_CLASS}>
          {UI.allNews[locale]}
        </NextLink>
      </div>
    </section>
  );
}
