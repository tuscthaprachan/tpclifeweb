import Image from "next/image";
import NextLink from "next/link";

import { Heading, Tag, Timestamp } from "@/components/ui";
import type { HeadingLevel } from "@/lib/a11y";
import { localePath, pick, type Locale } from "@/lib/i18n/config";
import type { ContentImage, LostFoundItem } from "@/lib/content/types";
import { categoryLabel } from "./categoryLabel";
import { LostFoundKindBadge } from "./LostFoundKindBadge";
import { LostFoundStatusTag } from "./LostFoundStatusTag";

/** The fields the card reads, so the register can ship a slim list to the browser. */
export type LostFoundCardItem = Pick<LostFoundItem, "_id" | "reference" | "kind" | "title" | "slug" | "category" | "status" | "occurredOn"> & {
  photos?: Array<Pick<ContentImage, "url" | "alt" | "isDecorative">>;
};

interface LostFoundCardProps {
  item: LostFoundCardItem;
  locale: Locale;
  /** Depth of this card's own title in the page outline. */
  headingLevel: HeadingLevel;
}

/**
 * One register entry in the list. `tone="neutral"` on the category Tag is
 * deliberate: the four saturated `Tag` tones (`transport`/`welfare`/
 * `activity`/`governance`) are the CONTRIBUTING.md fill categories, and lost
 * and found is not one of them, it has no fill of its own.
 */
export function LostFoundCard({ item, locale, headingLevel }: LostFoundCardProps) {
  const href = localePath(locale, `/lost-and-found/${item.slug.current}`);
  const title = pick(item.title, locale);
  const cover = item.photos?.[0];

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-panel border border-line">
      {cover ? (
        <div className="relative aspect-[16/9] w-full bg-surface-sunk">
          <Image
            src={cover.url}
            alt={cover.isDecorative ? "" : pick(cover.alt, locale)}
            fill
            sizes="(min-width: 768px) 360px, 100vw"
            className="object-cover"
          />
        </div>
      ) : null}
      <div className="flex flex-1 flex-col gap-[var(--space-2)] px-[var(--space-4)] py-[var(--space-4)]">
        <div className="flex flex-wrap items-center gap-[var(--space-2)]">
          <LostFoundKindBadge kind={item.kind} locale={locale} />
          <Tag tone="neutral">{categoryLabel(item.category, locale)}</Tag>
          <LostFoundStatusTag status={item.status} locale={locale} />
        </div>
        <Heading level={headingLevel} className="m-0 text-lg">
          <NextLink href={href} className="text-ink-900 no-underline hover:underline">
            {title}
          </NextLink>
        </Heading>
        <div className="mt-auto flex flex-wrap items-center gap-[var(--space-2)] pt-[var(--space-2)] text-sm text-ink-600">
          <span className="font-medium">{item.reference}</span>
          <span aria-hidden="true">·</span>
          <Timestamp value={item.occurredOn} locale={locale} />
        </div>
      </div>
    </article>
  );
}
