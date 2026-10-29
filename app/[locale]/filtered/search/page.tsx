import { notFound } from "next/navigation";
import { SearchPageView } from "@/components/domain/search/SearchPageView";
import { assertFilteredRewrite } from "@/lib/filtered-route";
import { isLocale } from "@/lib/i18n/config";
import { search } from "@/lib/search";
import { logZeroResultSearch } from "@/lib/search/log-zero-result";
import { getSearchIndex } from "@/lib/content";

export { generateMetadata } from "../../search/page";

export const dynamic = "force-dynamic";

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function FilteredSearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  await assertFilteredRewrite();
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const query = firstValue((await searchParams).q);
  const index = await getSearchIndex();
  const results = query.trim().length > 0 ? search(query, index.records) : [];

  if (query.trim().length > 0 && results.length === 0) {
    await logZeroResultSearch(query);
  }

  return <SearchPageView locale={locale} query={query} results={results} />;
}
