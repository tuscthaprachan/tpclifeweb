import { notFound } from "next/navigation";
import { redirectToTidyQuery } from "@/components/domain/canteen";
import { EatStalls } from "../../../eat/stalls/EatStalls";
import { assertFilteredRewrite } from "@/lib/filtered-route";
import { isLocale, localePath } from "@/lib/i18n/config";

export { generateMetadata } from "../../../eat/stalls/page";

export const dynamic = "force-dynamic";

export default async function FilteredEatStallsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await assertFilteredRewrite();
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  redirectToTidyQuery(localePath(locale, "/eat/stalls"), await searchParams);
  return <EatStalls locale={locale} filtered />;
}
