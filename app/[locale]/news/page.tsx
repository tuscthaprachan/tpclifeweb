import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { NewsCard } from "@/components/domain/news";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container, EmptyState, Grid, Heading, Pagination, Stack } from "@/components/ui";
import { DEFAULT_LOCALE, isLocale, localePath, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { getNewsPage } from "@/lib/sanity/queries";
import { alternatesFor } from "@/lib/i18n/metadata";

const PAGE_SIZE = 9;

function parsePage(raw: string | undefined): number {
  const parsed = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, "/news"), title: UI.news[locale] };
}

export default async function NewsIndexPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const { page: rawPage } = await searchParams;
  const page = parsePage(rawPage);

  const { items, total } = await getNewsPage(page, PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Container>
      <Breadcrumbs locale={locale} items={[{ label: UI.home[locale], path: "/" }, { label: UI.news[locale] }]} />
      <Stack space={8} className="pb-[var(--space-8)] pt-[var(--space-2)]">
        <Heading level={1}>{UI.news[locale]}</Heading>

        {items.length === 0 ? (
          <EmptyState title={UI.nothingHere[locale]} />
        ) : (
          <>
            <Grid minColumnWidth="18rem">
              {items.map((post) => (
                <NewsCard key={post._id} post={post} locale={locale} headingLevel={2} />
              ))}
            </Grid>
            <Pagination
              currentPage={Math.min(page, totalPages)}
              totalPages={totalPages}
              buildHref={(targetPage) => `${localePath(locale, "/news")}?page=${targetPage}`}
              locale={locale}
            />
          </>
        )}
      </Stack>
    </Container>
  );
}
