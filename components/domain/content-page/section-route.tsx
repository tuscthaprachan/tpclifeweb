import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PreviewBanner } from "@/components/preview/PreviewBanner";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container } from "@/components/ui";
import { getTopicPageBySlug, getTopicPagePreview, getTopicPages, resolveRichTextRefs } from "@/lib/content";
import { SECTIONS, type ContentSection } from "@/lib/content/sections";
import { DEFAULT_LOCALE, isLocale, pick, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { ogImageRoute } from "@/lib/og/route";
import { PREVIEW_METADATA, isPreview } from "@/lib/preview/state";
import { slugParams } from "@/lib/static-params";
import { ContentPageArticle } from "./ContentPageArticle";
import { SectionHub } from "./SectionHub";
import { TOPIC_TEXT } from "./text";

type HubParams = { params: Promise<{ locale: string }> };
type TopicParams = { params: Promise<{ locale: string; slug: string }> };

/**
 * Everything a section's two route folders export, so each folder is a few
 * lines: the hub at `<path>` and one topic page at `<path>/[slug]`. A slug
 * that belongs to another section is a 404 here.
 */
export function sectionRoute(key: ContentSection) {
  const section = SECTIONS[key];

  async function topicInSection(slug: string, preview: boolean) {
    const page = preview ? await getTopicPagePreview(slug) : await getTopicPageBySlug(slug);
    return page && page.section === key ? page : null;
  }

  const hubOg = ogImageRoute(({ locale }) => ({ locale, title: pick(section.label, locale) }));

  const topicOg = ogImageRoute<{ locale: string; slug: string }>(async ({ locale, slug }) => {
    const kicker = pick(section.label, locale);
    const page = await topicInSection(slug, false).catch(() => null);
    if (!page) return { locale, title: kicker };
    return { locale, kicker, title: pick(page.title, locale), description: pick(page.summary, locale), tone: page.category };
  });

  return {
    hub: {
      async generateMetadata({ params }: HubParams): Promise<Metadata> {
        const { locale: rawLocale } = await params;
        const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
        return {
          alternates: alternatesFor(locale, section.path),
          title: pick(section.label, locale),
          description: pick(section.intro, locale),
        };
      },
      async Page({ params }: HubParams) {
        const { locale } = await params;
        if (!isLocale(locale)) notFound();
        return <SectionHub sectionKey={key} locale={locale} />;
      },
      generateImageMetadata: hubOg.generateImageMetadata,
      Image: hubOg.Image,
    },
    topic: {
      async generateStaticParams() {
        const pages = await getTopicPages(key);
        return slugParams(pages.map((page) => page.slug.current));
      },
      async generateMetadata({ params }: TopicParams): Promise<Metadata> {
        const { locale: rawLocale, slug } = await params;
        const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
        const preview = await isPreview();
        const page = await topicInSection(slug, preview);
        if (!page) return {};
        const metadata = { title: pick(page.title, locale), description: pick(page.summary, locale) };
        return preview ? { ...metadata, ...PREVIEW_METADATA } : metadata;
      },
      async Page({ params }: TopicParams) {
        const { locale, slug } = await params;
        if (!isLocale(locale)) notFound();

        const preview = await isPreview();
        const page = await topicInSection(slug, preview);
        if (!page) notFound();

        const sectionLabel = pick(section.label, locale);
        const resolved = await resolveRichTextRefs([page.body[locale]]);

        return (
          <Container width="narrow">
            {preview ? <PreviewBanner locale={locale} segment="topics" id={page._id} /> : null}
            <Breadcrumbs
              locale={locale}
              items={[
                { label: UI.home[locale], path: "/" },
                { label: sectionLabel, path: section.path },
                { label: pick(page.title, locale) },
              ]}
            />
            <ContentPageArticle
              page={page}
              locale={locale}
              basePath={section.path}
              resolved={resolved}
              staleLabel={TOPIC_TEXT.staleReviewLabel[locale]}
              staleBody={TOPIC_TEXT.staleReviewBody[locale]}
              allTopicsLabel={TOPIC_TEXT.backToSection[locale].replace("{section}", sectionLabel)}
            />
          </Container>
        );
      },
      generateImageMetadata: topicOg.generateImageMetadata,
      Image: topicOg.Image,
    },
  };
}
