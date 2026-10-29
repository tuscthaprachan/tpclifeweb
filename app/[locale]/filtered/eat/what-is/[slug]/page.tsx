import { notFound } from "next/navigation";
import { redirectToTidyQuery } from "@/components/domain/canteen";
import { EatWhatIsDish } from "../../../../eat/what-is/[slug]/EatWhatIsDish";
import { assertFilteredRewrite } from "@/lib/filtered-route";
import { isLocale, localePath } from "@/lib/i18n/config";

export { generateMetadata } from "../../../../eat/what-is/[slug]/page";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export default async function FilteredWhatIsDishPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await assertFilteredRewrite();
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  redirectToTidyQuery(localePath(locale, `/eat/what-is/${slug}`), query);
  return <EatWhatIsDish locale={locale} slug={slug} filtered query={query} />;
}
