import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container, EmptyState, Stack, PageTitle } from "@/components/ui";
import { ContentPageCards } from "@/components/domain/content-page";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { SourceDocumentLink } from "@/components/domain/open-data/SourceDocumentLink";
import { getContentPages } from "@/lib/content";
import { getOpenDataDocuments } from "@/lib/open-data/read";
import { alternatesFor } from "@/lib/i18n/metadata";
import { WELFARE_TEXT } from "./text";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, "/welfare"),
    title: UI.welfare[locale],
    description: WELFARE_TEXT.intro[locale],
  };
}

export default async function WelfareIndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const [pages, documents] = await Promise.all([getContentPages("welfarePage"), getOpenDataDocuments()]);
  const welfareGuide = documents.find((doc) => doc.number === "49");

  return (
    <Container width="narrow">
      <Breadcrumbs locale={locale} items={[{ label: UI.home[locale], path: "/" }, { label: UI.welfare[locale] }]} />
      <Stack space={8} className="pb-[var(--space-12)] pt-[var(--space-2)]">
        <Stack space={3}>
          <PageTitle path="/welfare">{UI.welfare[locale]}</PageTitle>
          <p className="m-0 text-lg text-ink-900" style={{ maxWidth: `var(--measure-${locale})` }}>
            {WELFARE_TEXT.intro[locale]}
          </p>
        </Stack>

        {pages.length === 0 ? (
          <EmptyState title={UI.nothingHere[locale]} />
        ) : (
          <ContentPageCards pages={pages} locale={locale} basePath="/welfare" heading={WELFARE_TEXT.topicsHeading[locale]} staleLabel={WELFARE_TEXT.staleReviewLabel[locale]} />
        )}

        {welfareGuide ? (
          <Stack space={2} className="border-t border-line pt-[var(--space-4)] text-sm text-ink-600">
            <SourceDocumentLink locale={locale} document={welfareGuide} />
            <SourceDocumentLink locale={locale} funds />
          </Stack>
        ) : null}
      </Stack>
    </Container>
  );
}
