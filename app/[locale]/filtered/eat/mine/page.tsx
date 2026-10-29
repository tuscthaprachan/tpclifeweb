import { notFound } from "next/navigation";
import { EatMine } from "../../../eat/mine/EatMine";
import { assertFilteredRewrite } from "@/lib/filtered-route";
import { isLocale } from "@/lib/i18n/config";

export { generateMetadata } from "../../../eat/mine/page";

export const dynamic = "force-dynamic";

export default async function FilteredEatMinePage({ params }: { params: Promise<{ locale: string }> }) {
  await assertFilteredRewrite();
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <EatMine locale={locale} filtered />;
}
