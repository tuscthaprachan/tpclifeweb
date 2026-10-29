import { notFound, redirect } from "next/navigation";
import { pickTarget } from "@/components/domain/canteen/redirects";
import { newSeed } from "@/lib/canteen/random";
import { EatPick } from "../../../eat/pick/EatPick";
import { assertFilteredRewrite } from "@/lib/filtered-route";
import { isLocale } from "@/lib/i18n/config";

export { generateMetadata } from "../../../eat/pick/page";

export const dynamic = "force-dynamic";

export default async function FilteredEatPickPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await assertFilteredRewrite();
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const target = pickTarget(locale, query, newSeed());
  if (target !== null) redirect(target);
  return <EatPick locale={locale} filtered query={query} />;
}
