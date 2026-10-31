import { notFound } from "next/navigation";
import { FundsIndex } from "../../../../../about/open-data/tusc/funds/FundsIndex";
import { assertFilteredRewrite } from "@/lib/filtered-route";
import { isLocale } from "@/lib/i18n/config";

export { generateMetadata } from "../../../../../about/open-data/tusc/funds/page";

export const dynamic = "force-dynamic";

export default async function FilteredTuscFundsPage({ params }: { params: Promise<{ locale: string }> }) {
  await assertFilteredRewrite();
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <FundsIndex locale={locale} filtered />;
}
