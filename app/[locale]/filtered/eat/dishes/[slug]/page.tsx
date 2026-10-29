import { notFound } from "next/navigation";
import { EatDish } from "../../../../eat/dishes/[slug]/EatDish";
import { assertFilteredRewrite } from "@/lib/filtered-route";
import { isLocale } from "@/lib/i18n/config";

export { generateMetadata } from "../../../../eat/dishes/[slug]/page";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export default async function FilteredEatDishPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  await assertFilteredRewrite();
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  return <EatDish locale={locale} slug={slug} filtered />;
}
