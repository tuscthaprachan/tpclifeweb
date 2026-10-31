import { notFound } from "next/navigation";
import { DecisionsIndex } from "../../../../../about/open-data/tusc/decisions/DecisionsIndex";
import { assertFilteredRewrite } from "@/lib/filtered-route";
import { isLocale } from "@/lib/i18n/config";

export { generateMetadata } from "../../../../../about/open-data/tusc/decisions/page";

export const dynamic = "force-dynamic";

export default async function FilteredTuscDecisionsPage({ params }: { params: Promise<{ locale: string }> }) {
  await assertFilteredRewrite();
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <DecisionsIndex locale={locale} filtered />;
}
