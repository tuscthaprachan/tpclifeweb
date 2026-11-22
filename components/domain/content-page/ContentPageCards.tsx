import NextLink from "next/link";
import { ArrowRightIcon, Heading, IconTile, StatusTag, iconForPathOrDefault } from "@/components/ui";
import { localePath, pick, type Locale } from "@/lib/i18n/config";
import { hubItemKey, type HubItem } from "@/lib/content/hub";
import { topicPath, type ContentSection } from "@/lib/content/sections";
import { isStale } from "./stale";
import { TopicTile } from "./TopicTile";
import { topicIcon } from "./topic-icons";

interface ContentPageCardsProps {
  items: readonly HubItem[];
  section: ContentSection;
  locale: Locale;
  heading: string;
  staleLabel?: string;
}

const CARD =
  "press group grid w-full grid-cols-[auto_minmax(0,1fr)] gap-x-[var(--space-3)] rounded-[var(--radius-block)] bg-surface-alt p-[var(--space-4)] no-underline";

export function ContentPageCards({ items, section, locale, heading, staleLabel }: ContentPageCardsProps) {
  const headingId = `${section}-topics-heading`;
  const now = new Date();
  return (
    <section aria-labelledby={headingId}>
      <Heading level={2} id={headingId} className="visually-hidden">
        {heading}
      </Heading>
      <ul className="m-0 grid list-none gap-[var(--space-3)] p-0">
        {items.map((item) => {
          const topic = item.kind === "topic";
          const href = topic ? topicPath(item.page.section, item.page.slug.current) : item.entry.path;
          const title = pick(topic ? item.page.title : item.entry.label, locale);
          const summary = pick(topic ? item.page.summary : item.entry.description, locale);
          return (
            <li key={hubItemKey(item)} className="flex">
              <NextLink href={localePath(locale, href)} className={CARD}>
                {topic ? (
                  <TopicTile icon={topicIcon(item.page)} category={item.page.category} />
                ) : (
                  <IconTile icon={iconForPathOrDefault(item.entry.path)} />
                )}
                <span className="flex min-w-0 flex-col gap-[var(--space-1)]">
                  <span className="flex items-start justify-between gap-[var(--space-2)]">
                    <span className="text-[length:var(--text-lg)] font-bold leading-snug text-action group-hover:underline">{title}</span>
                    <span aria-hidden="true" className="mt-[2px] grid size-7 shrink-0 place-items-center rounded-full bg-action text-action-ink">
                      <ArrowRightIcon />
                    </span>
                  </span>
                  <span className="text-[length:var(--text-sm)] leading-relaxed text-ink-600">{summary}</span>
                  {topic && staleLabel && isStale(item.page.lastReviewed, now) ? (
                    <span className="mt-[var(--space-1)]">
                      <StatusTag tone="warning" label={staleLabel} />
                    </span>
                  ) : null}
                </span>
              </NextLink>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
