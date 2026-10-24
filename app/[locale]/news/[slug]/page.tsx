import type { Metadata } from "next";
import Image from "next/image";
import { slugParams } from "@/lib/static-params";
import { notFound } from "next/navigation";

import { categoryLabel, ownerLabel } from "@/components/domain/news";
import { RichText } from "@/components/domain/rich-text";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container, Grid, Heading, Stack, Tag, Timestamp } from "@/components/ui";
import { DEFAULT_LOCALE, isLocale, pick, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { getNewsPage, getNewsPostBySlug, resolveRichTextRefs } from "@/lib/content";
import type { ContentImage } from "@/lib/content/types";

// Cover and gallery images are cropped to a fixed ratio with `fill` and
// `object-cover`, the same way ImageBlock crops images embedded in the body, so
// a picture of any shape fits its frame without distorting. The gallery is 4:3
// rather than the cover's 16:9, so it reads as a distinct, denser strip of
// thumbnails under the article.

// getNewsPage is the only news-listing read, so static params come from one
// large page rather than a dedicated "all slugs" query. A site with more than
// this many posts will need that query added to lib/content/news.ts.
const MAX_STATIC_POSTS = 1000;

export async function generateStaticParams() {
  const { items } = await getNewsPage(1, MAX_STATIC_POSTS);
  return slugParams(items.map((post) => post.slug.current));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const post = await getNewsPostBySlug(slug);
  if (!post) return {};

  return {
    title: pick(post.title, locale),
    description: pick(post.summary, locale),
  };
}

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const post = await getNewsPostBySlug(slug);
  if (!post) notFound();

  const title = pick(post.title, locale);
  const resolved = await resolveRichTextRefs([post.body[locale]]);

  return (
    <Container width="narrow">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: UI.home[locale], path: "/" },
          { label: UI.news[locale], path: "/news" },
          { label: title },
        ]}
      />
      <Stack space={6} className="pb-[var(--space-8)] pt-[var(--space-2)]" as="section">
        <Stack space={2}>
          {post.category ? <Tag tone={post.category}>{categoryLabel(post.category, locale)}</Tag> : null}
          <Heading level={1}>{title}</Heading>
          <div className="flex flex-wrap items-center gap-[var(--space-2)] text-sm text-ink-600">
            <Timestamp value={post.publishedAt} locale={locale} />
            <span aria-hidden="true">·</span>
            <span>{ownerLabel(post.owner, locale)}</span>
          </div>
        </Stack>

        {post.cover ? (
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-panel bg-surface-sunk">
            <Image
              src={post.cover.url}
              alt={post.cover.isDecorative ? "" : pick(post.cover.alt, locale)}
              fill
              sizes="(min-width: 768px) 720px, 100vw"
              className="object-cover"
              priority
            />
          </div>
        ) : null}

        <RichText value={post.body[locale]} locale={locale} headingLevel={2} resolved={resolved} />

        {post.gallery && post.gallery.length > 0 ? (
          <NewsGallery gallery={post.gallery} locale={locale} />
        ) : null}
      </Stack>
    </Container>
  );
}

/**
 * The gallery of extra pictures under a news article's body. A `Grid` with
 * `as="ul"` (1.4.10 Reflow: `minmax(min(20rem, 100%), 1fr)` never forces a
 * horizontal scrollbar, it just drops to one column at 320 CSS px) rather
 * than a fixed row, because the number of pictures an editor adds is
 * unbounded. Every entry is a `<figure>` so a caption, when one exists,
 * stays associated with its picture for every user agent, not just visually.
 * Gallery entries whose file cannot be resolved are dropped by the read layer,
 * so everything passed in here has a URL.
 */
function NewsGallery({ gallery, locale }: { gallery: ContentImage[]; locale: Locale }) {
  if (gallery.length === 0) return null;

  return (
    <Stack space={4} as="section">
      {/*
        A visible heading rather than an aria-label on the section. The
        pictures sit after the article body with nothing else to separate
        them from it, so a sighted reader needs the break as much as a
        screen reader user does, and CONTRIBUTING forbids an aria-label
        where a visible label does the job. Level 2 matches the body's own
        headings, which RichText is given as headingLevel={2}.
      */}
      <Heading level={2}>{UI.morePictures[locale]}</Heading>
      <Grid as="ul" minColumnWidth="20rem" space={4} className="list-none p-0">
        {gallery.map((image) => {
          const alt = image.isDecorative ? "" : pick(image.alt, locale);
          const caption = image.caption ? pick(image.caption, locale) : "";
          return (
            <li key={image.id}>
              <figure className="m-0">
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-panel bg-surface-sunk">
                  <Image
                    src={image.url}
                    alt={alt}
                    fill
                    sizes="(min-width: 768px) 340px, 100vw"
                    className="object-cover"
                  />
                </div>
                {caption ? <figcaption className="mt-[var(--space-2)] text-sm text-ink-600">{caption}</figcaption> : null}
              </figure>
            </li>
          );
        })}
      </Grid>
    </Stack>
  );
}
