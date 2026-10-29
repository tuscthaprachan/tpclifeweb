import { NewsCard } from "@/components/domain/news";
import { LiveNewsResults, NewsResults } from "@/components/domain/news/NewsResults";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container, Heading, Stack } from "@/components/ui";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { getNewsPage } from "@/lib/content";

const PAGE_SIZE = 9;

export async function NewsIndex({ locale, filtered }: { locale: Locale; filtered: boolean }) {
  const first = await getNewsPage(1, PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(first.total / PAGE_SIZE));
  const rest = await Promise.all(Array.from({ length: totalPages - 1 }, (_, index) => getNewsPage(index + 2, PAGE_SIZE)));

  const pages = [first, ...rest]
    .filter((page) => page.items.length > 0)
    .map((page) => page.items.map((post) => <NewsCard key={post._id} post={post} locale={locale} headingLevel={2} />));

  return (
    <Container>
      <Breadcrumbs locale={locale} items={[{ label: UI.home[locale], path: "/" }, { label: UI.news[locale] }]} />
      <Stack space={8} className="pb-[var(--space-8)] pt-[var(--space-2)]">
        <Heading level={1}>{UI.news[locale]}</Heading>

        <QueryBoundary filtered={filtered} fallback={<NewsResults locale={locale} pages={pages} query={{}} />}>
          <LiveNewsResults locale={locale} pages={pages} />
        </QueryBoundary>
      </Stack>
    </Container>
  );
}
