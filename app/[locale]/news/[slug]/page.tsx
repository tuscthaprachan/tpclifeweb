import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { categoryLabel, getNewsPostBySlug, ownerLabel } from "@/components/domain/news";
import { PortableTextRenderer } from "@/components/domain/portable-text";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container, Heading, Stack, Tag, Timestamp } from "@/components/ui";
import { DEFAULT_LOCALE, LOCALES, isLocale, pick, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { urlFor } from "@/lib/sanity/image";
import { getNewsPage } from "@/lib/sanity/queries";

const COVER_WIDTH = 1200;
const COVER_HEIGHT = 675;

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
      <Stack space={6} className="py-[var(--space-8)]" as="section">
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
      </Stack>
    </Container>
  );
}
