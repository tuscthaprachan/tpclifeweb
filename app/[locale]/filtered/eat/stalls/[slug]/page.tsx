import { notFound } from "next/navigation";
import { redirectToTidyQuery } from "@/components/domain/canteen";
import { EatStall } from "../../../../eat/stalls/[slug]/EatStall";
import { assertFilteredRewrite } from "@/lib/filtered-route";
import { isLocale, localePath } from "@/lib/i18n/config";

export { generateMetadata } from "../../../../eat/stalls/[slug]/page";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export default async function FilteredEatStallPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await assertFilteredRewrite();
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  redirectToTidyQuery(localePath(locale, `/eat/stalls/${slug}`), await searchParams);
  return <EatStall locale={locale} slug={slug} filtered />;
}
