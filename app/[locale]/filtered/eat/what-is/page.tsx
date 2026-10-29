import { notFound } from "next/navigation";
import { redirectToTidyQuery } from "@/components/domain/canteen";
import { EatWhatIs } from "../../../eat/what-is/EatWhatIs";
import { assertFilteredRewrite } from "@/lib/filtered-route";
import { isLocale, localePath } from "@/lib/i18n/config";

export { generateMetadata } from "../../../eat/what-is/page";

export const dynamic = "force-dynamic";

export default async function FilteredWhatIsIndexPage({
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
  redirectToTidyQuery(localePath(locale, "/eat/what-is"), query);
  return <EatWhatIs locale={locale} filtered query={query} />;
}
