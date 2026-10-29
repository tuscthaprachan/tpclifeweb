import { notFound } from "next/navigation";
import { redirectToTidyQuery } from "@/components/domain/canteen";
import { EatDishes } from "../../../eat/dishes/EatDishes";
import { assertFilteredRewrite } from "@/lib/filtered-route";
import { isLocale, localePath } from "@/lib/i18n/config";

export { generateMetadata } from "../../../eat/dishes/page";

export const dynamic = "force-dynamic";

export default async function FilteredEatDishesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await assertFilteredRewrite();
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  redirectToTidyQuery(localePath(locale, "/eat/dishes"), await searchParams);
  return <EatDishes locale={locale} filtered />;
}
