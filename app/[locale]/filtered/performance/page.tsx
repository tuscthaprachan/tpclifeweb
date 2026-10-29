import { notFound } from "next/navigation";
import { PerformanceIndex } from "../../performance/PerformanceIndex";
import { assertFilteredRewrite } from "@/lib/filtered-route";
import { isLocale } from "@/lib/i18n/config";

export { generateMetadata } from "../../performance/page";

export const dynamic = "force-dynamic";

export default async function FilteredPerformancePage({ params }: { params: Promise<{ locale: string }> }) {
  await assertFilteredRewrite();
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <PerformanceIndex locale={locale} filtered />;
}
