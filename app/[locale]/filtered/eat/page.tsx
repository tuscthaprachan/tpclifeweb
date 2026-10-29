import { notFound } from "next/navigation";
import { EatHub } from "../../eat/EatHub";
import { assertFilteredRewrite } from "@/lib/filtered-route";
import { isLocale } from "@/lib/i18n/config";

export { generateMetadata } from "../../eat/page";

export const dynamic = "force-dynamic";

export default async function FilteredEatHubPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await assertFilteredRewrite();
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <EatHub locale={locale} filtered query={await searchParams} />;
}
