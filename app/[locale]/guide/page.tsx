import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container, EmptyState, Stack, PageTitle } from "@/components/ui";
import { ContentPageCards } from "@/components/domain/content-page";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { getContentPages } from "@/lib/content";
import { alternatesFor } from "@/lib/i18n/metadata";
import { GUIDE_TEXT } from "./text";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, "/guide"),
    title: UI.guide[locale],
    description: GUIDE_TEXT.intro[locale],
  };
}

export default async function GuideIndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const pages = await getContentPages("guidePage");

  return (
    <Container width="narrow">
      <Breadcrumbs locale={locale} items={[{ label: UI.home[locale], path: "/" }, { label: UI.guide[locale] }]} />
      <Stack space={8} className="pb-[var(--space-12)] pt-[var(--space-2)]">
        <Stack space={3}>
          <PageTitle path="/guide">{UI.guide[locale]}</PageTitle>
          <p className="m-0 text-lg text-ink-900" style={{ maxWidth: `var(--measure-${locale})` }}>
            {GUIDE_TEXT.intro[locale]}
          </p>
        </Stack>

        {pages.length === 0 ? (
          <EmptyState title={UI.nothingHere[locale]} />
        ) : (
          <ContentPageCards pages={pages} locale={locale} basePath="/guide" heading={GUIDE_TEXT.topicsHeading[locale]} staleLabel={GUIDE_TEXT.staleReviewLabel[locale]} />
        )}
      </Stack>
    </Container>
  );
}
