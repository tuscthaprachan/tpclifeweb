import Image from "next/image";
import NextLink from "next/link";

import { Heading, Tag, Timestamp } from "@/components/ui";
import type { HeadingLevel } from "@/lib/a11y";
import { localePath, pick, type Locale } from "@/lib/i18n/config";
import { urlFor } from "@/lib/sanity/image";
import type { NewsPost } from "@/lib/sanity/types";
import { categoryLabel } from "./categoryLabel";
import { ownerLabel } from "./ownerLabel";

const COVER_WIDTH = 640;
const COVER_HEIGHT = 360;

interface NewsCardProps {
  post: NewsPost;
  locale: Locale;
  /** Depth of this card's own title in the page outline. */
  headingLevel: HeadingLevel;
}

/**
 * A news list item. News is one of the two surfaces this site uses cards
 * for (CONTRIBUTING.md): every post genuinely carries a summary and, often,
 * an image, and every item in the list carries equal weight.
 */
export function NewsCard({ post, locale, headingLevel }: NewsCardProps) {
  const href = localePath(locale, `/news/${post.slug.current}`);
  const title = pick(post.title, locale);
  const summary = pick(post.summary, locale);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-panel border border-line">
      {post.cover ? (
        <div className="relative aspect-[16/9] w-full bg-surface-sunk">
          <Image
            src={urlFor(post.cover).width(COVER_WIDTH).height(COVER_HEIGHT).fit("crop").auto("format").url()}
            alt={post.cover.isDecorative ? "" : pick(post.cover.alt, locale)}
            fill
            sizes="(min-width: 768px) 360px, 100vw"
            className="object-cover"
          />
        </div>
      ) : null}
      <div className="flex flex-1 flex-col gap-[var(--space-2)] px-[var(--space-4)] py-[var(--space-4)]">
        {post.category ? <Tag tone={post.category}>{categoryLabel(post.category, locale)}</Tag> : null}
        <Heading level={headingLevel} className="m-0 text-lg">
          <NextLink href={href} className="text-ink-900 no-underline hover:underline">
            {title}
          </NextLink>
        </Heading>
        <p className="m-0 text-ink-600">{summary}</p>
        <div className="mt-auto flex flex-wrap items-center gap-[var(--space-2)] pt-[var(--space-2)] text-sm text-ink-600">
          <Timestamp value={post.publishedAt} locale={locale} />
          <span aria-hidden="true">·</span>
          <span>{ownerLabel(post.owner, locale)}</span>
        </div>
      </div>
    </article>
  );
}
