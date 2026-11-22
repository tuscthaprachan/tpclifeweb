import NextLink from "next/link";
import { ArrowRightIcon, Heading, StatusTag } from "@/components/ui";
import { localePath, pick, type Locale } from "@/lib/i18n/config";
import type { ContentPage } from "@/lib/content/types";
import { isStale } from "./stale";
import { TopicTile } from "./TopicTile";
import { topicIcon } from "./topic-icons";

interface ContentPageCardsProps {
  pages: readonly ContentPage[];
  locale: Locale;
  basePath: "/welfare" | "/guide";
  heading: string;
  staleLabel?: string;
}

export function ContentPageCards({ pages, locale, basePath, heading, staleLabel }: ContentPageCardsProps) {
  const headingId = `${basePath.slice(1)}-topics-heading`;
  const now = new Date();
  return (
    <section aria-labelledby={headingId}>
      <Heading level={2} id={headingId} className="visually-hidden">
        {heading}
      </Heading>
      <ul className="m-0 grid list-none gap-[var(--space-3)] p-0">
        {pages.map((page) => (
          <li key={page._id} className="flex">
            <NextLink
              href={localePath(locale, `${basePath}/${page.slug.current}`)}
              className="press group grid w-full grid-cols-[auto_minmax(0,1fr)] gap-x-[var(--space-3)] rounded-[var(--radius-block)] bg-surface-alt p-[var(--space-4)] no-underline"
            >
              <TopicTile icon={topicIcon(page)} category={page.category} />
              <span className="flex min-w-0 flex-col gap-[var(--space-1)]">
                <span className="flex items-start justify-between gap-[var(--space-2)]">
                  <span className="text-[length:var(--text-lg)] font-bold leading-snug text-action group-hover:underline">{pick(page.title, locale)}</span>
                  <span aria-hidden="true" className="mt-[2px] grid size-7 shrink-0 place-items-center rounded-full bg-action text-action-ink">
                    <ArrowRightIcon />
                  </span>
                </span>
                <span className="text-[length:var(--text-sm)] leading-relaxed text-ink-600">{pick(page.summary, locale)}</span>
                {staleLabel && isStale(page.lastReviewed, now) ? (
                  <span className="mt-[var(--space-1)]">
                    <StatusTag tone="warning" label={staleLabel} />
                  </span>
                ) : null}
              </span>
            </NextLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
