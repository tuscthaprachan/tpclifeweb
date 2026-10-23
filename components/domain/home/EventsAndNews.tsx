import { EventCard } from "@/components/domain/event";
import { NewsCard } from "@/components/domain/news";
import { Button, EmptyState, Grid, Heading, Link as UiLink, Stack } from "@/components/ui";
import { localePath, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { CampusEvent, NewsPost } from "@/lib/content/types";

interface EventsAndNewsProps {
  locale: Locale;
  /** Already filtered to upcoming, ascending (`getUpcomingEvents`). Capped here. */
  events: CampusEvent[];
  /** The first page of news, newest first (`getNewsPage`). Capped here. */
  news: NewsPost[];
}

const MAX_EVENTS = 3;
const MAX_NEWS = 3;

/**
 * Section 3: upcoming events, then recent news, each capped to a small count
 * with a link through to its own full listing. Cards are the right shape
 * here (CONTRIBUTING.md): both `EventCard` and `NewsCard` genuinely carry an
 * image and equal weight per item, unlike the dense list above them.
 */
export function EventsAndNews({ locale, events, news }: EventsAndNewsProps) {
  const upcomingEvents = events.slice(0, MAX_EVENTS);
  const latestNews = news.slice(0, MAX_NEWS);

  return (
    <Stack space={8}>
      <Stack space={4} as="section">
        <div className="flex flex-wrap items-baseline justify-between gap-[var(--space-2)]">
          <Heading level={2} className="m-0">
            {UI.upcomingEvents[locale]}
          </Heading>
          {upcomingEvents.length > 0 ? (
            <UiLink
              href={localePath(locale, "/events")}
              locale={locale}
              className="text-action underline decoration-1 underline-offset-[0.2em]"
            >
              {UI.allEvents[locale]}
            </UiLink>
          ) : null}
        </div>

        {upcomingEvents.length === 0 ? (
          <EmptyState
            title={UI.noUpcomingEvents[locale]}
            action={
              <Button href={localePath(locale, "/events")} variant="secondary" size="sm">
                {UI.allEvents[locale]}
              </Button>
            }
          />
        ) : (
          <Grid minColumnWidth="18rem">
            {upcomingEvents.map((event) => (
              <EventCard key={event._id} event={event} locale={locale} headingLevel={3} />
            ))}
          </Grid>
        )}
      </Stack>

      <Stack space={4} as="section">
        <div className="flex flex-wrap items-baseline justify-between gap-[var(--space-2)]">
          <Heading level={2} className="m-0">
            {UI.latestNews[locale]}
          </Heading>
          {latestNews.length > 0 ? (
            <UiLink
              href={localePath(locale, "/news")}
              locale={locale}
              className="text-action underline decoration-1 underline-offset-[0.2em]"
            >
              {UI.allNews[locale]}
            </UiLink>
          ) : null}
        </div>

        {latestNews.length === 0 ? (
          <EmptyState
            title={UI.nothingHere[locale]}
            action={
              <Button href={localePath(locale, "/news")} variant="secondary" size="sm">
                {UI.allNews[locale]}
              </Button>
            }
          />
        ) : (
          <Grid minColumnWidth="18rem">
            {latestNews.map((post) => (
              <NewsCard key={post._id} post={post} locale={locale} headingLevel={3} />
            ))}
          </Grid>
        )}
      </Stack>
    </Stack>
  );
}
