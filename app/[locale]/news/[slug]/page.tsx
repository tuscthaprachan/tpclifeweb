import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { categoryLabel, getNewsPostBySlug, ownerLabel } from "@/components/domain/news";
import { PortableTextRenderer } from "@/components/domain/portable-text";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container, Grid, Heading, Stack, Tag, Timestamp } from "@/components/ui";
import { DEFAULT_LOCALE, LOCALES, isLocale, pick, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { hasImageAsset, urlFor } from "@/lib/sanity/image";
import { getNewsPage } from "@/lib/sanity/queries";
import type { SanityImage } from "@/lib/sanity/types";

const COVER_WIDTH = 1200;
const COVER_HEIGHT = 675;

// Gallery images are cropped to a fixed ratio for the same reason
// ImageBlock.tsx crops embedded body images: the fixed queries in
// lib/sanity/queries.ts and components/domain/news/queries.ts do not fetch
// asset metadata (real width/height) for an inline siteImage, so a next/image
// with `fill` needs a ratio it can rely on rather than one read off the
// source file. 4:3 rather than the cover's 16:9, so the gallery reads as a
// distinct, denser strip of thumbnails under the article.
const GALLERY_WIDTH = 800;
const GALLERY_HEIGHT = 600;

// getNewsPage is the only news-listing query the fixed contract exposes, so
// static params come from one large page rather than a dedicated "all slugs"
// query. Sites with more than this many posts will need that query added to
// lib/sanity/queries.ts by whoever owns it; noted rather than worked around.
const MAX_STATIC_POSTS = 1000;

export async function generateStaticParams() {
  const { items } = await getNewsPage(1, MAX_STATIC_POSTS);
  return LOCALES.flatMap((locale) => items.map((post) => ({ locale, slug: post.slug.current })));
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

        {hasImageAsset(post.cover) ? (
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-panel bg-surface-sunk">
            <Image
              src={urlFor(post.cover).width(COVER_WIDTH).height(COVER_HEIGHT).fit("crop").auto("format").url()}
              alt={post.cover.isDecorative ? "" : pick(post.cover.alt, locale)}
              fill
              sizes="(min-width: 768px) 720px, 100vw"
              className="object-cover"
              priority
            />
          </div>
        ) : null}

        <PortableTextRenderer value={post.body[locale]} locale={locale} headingLevel={2} />

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
 * Images with no asset yet (schema allows saving a `siteImage` object before
 * a file is uploaded) are skipped rather than crashing the page, the same
 * guard `hasImageAsset` applies to `cover` above.
 */
function NewsGallery({ gallery, locale }: { gallery: SanityImage[]; locale: Locale }) {
  const usable = gallery.filter(hasImageAsset);
  if (usable.length === 0) return null;

  return (
    <Stack space={4} as="section">
      {/*
        A visible heading rather than an aria-label on the section. The
        pictures sit after the article body with nothing else to separate
        them from it, so a sighted reader needs the break as much as a
        screen reader user does, and CONTRIBUTING forbids an aria-label
        where a visible label does the job. Level 2 matches the body's own
        headings, which PortableTextRenderer is given as headingLevel={2}.
      */}
      <Heading level={2}>{UI.morePictures[locale]}</Heading>
      <Grid as="ul" minColumnWidth="20rem" space={4} className="list-none p-0">
        {usable.map((image, index) => {
          const alt = image.isDecorative ? "" : pick(image.alt, locale);
          const caption = image.caption ? pick(image.caption, locale) : "";
          return (
            <li key={image.asset._ref + index}>
              <figure className="m-0">
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-panel bg-surface-sunk">
                  <Image
                    src={urlFor(image).width(GALLERY_WIDTH).height(GALLERY_HEIGHT).fit("crop").auto("format").url()}
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
