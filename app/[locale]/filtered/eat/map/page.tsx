import { notFound } from "next/navigation";
import { redirectToTidyQuery } from "@/components/domain/canteen";
import { EatMap } from "../../../eat/map/EatMap";
import { assertFilteredRewrite } from "@/lib/filtered-route";
import { isLocale, localePath } from "@/lib/i18n/config";

export { generateMetadata } from "../../../eat/map/page";

export const dynamic = "force-dynamic";

export default async function FilteredCanteenMapPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await assertFilteredRewrite();
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  redirectToTidyQuery(localePath(locale, "/eat/map"), await searchParams);
  return <EatMap locale={locale} filtered />;
}
