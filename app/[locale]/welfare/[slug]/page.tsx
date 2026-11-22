import type { Metadata } from "next";
import { PreviewBanner } from "@/components/preview/PreviewBanner";
import { PREVIEW_METADATA, isPreview } from "@/lib/preview/state";
import { slugParams } from "@/lib/static-params";
import { notFound } from "next/navigation";

import { ContentPageArticle } from "@/components/domain/content-page";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container } from "@/components/ui";
import { DEFAULT_LOCALE, isLocale, pick, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { getContentPageBySlug, getContentPagePreview, getContentPages, resolveRichTextRefs } from "@/lib/content";
import { WELFARE_DETAIL_TEXT } from "./text";

export async function generateStaticParams() {
  const pages = await getContentPages("welfarePage");
  return slugParams(pages.map((page) => page.slug.current));
}

async function baseMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const page = await getContentPageBySlug("welfarePage", slug);
  if (!page) return {};

  return { title: pick(page.title, locale), description: pick(page.summary, locale) };
}

export async function generateMetadata(props: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const metadata = await baseMetadata(props);
  return (await isPreview()) ? { ...metadata, ...PREVIEW_METADATA } : metadata;
}

export default async function WelfareDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const preview = await isPreview();
  const page = preview ? await getContentPagePreview("welfarePage", slug) : await getContentPageBySlug("welfarePage", slug);
  if (!page) notFound();

  const title = pick(page.title, locale);
  const resolved = await resolveRichTextRefs([page.body[locale]]);

  return (
    <Container width="narrow">
      {preview ? <PreviewBanner locale={locale} segment="welfare" id={page._id} /> : null}
      <Breadcrumbs
        locale={locale}
        items={[
          { label: UI.home[locale], path: "/" },
          { label: UI.welfare[locale], path: "/welfare" },
          { label: title },
        ]}
      />
      <ContentPageArticle
        page={page}
        locale={locale}
        basePath="/welfare"
        resolved={resolved}
        staleLabel={WELFARE_DETAIL_TEXT.staleReviewLabel[locale]}
        staleBody={WELFARE_DETAIL_TEXT.staleReviewBody[locale]}
        allTopicsLabel={WELFARE_DETAIL_TEXT.allTopics[locale]}
      />
    </Container>
  );
}
