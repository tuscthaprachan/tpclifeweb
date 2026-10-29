import { notFound } from "next/navigation";
import { LostFoundIndex } from "../../lost-and-found/LostFoundIndex";
import { assertFilteredRewrite } from "@/lib/filtered-route";
import { isLocale } from "@/lib/i18n/config";

export { generateMetadata } from "../../lost-and-found/page";

export const dynamic = "force-dynamic";

export default async function FilteredLostAndFoundPage({ params }: { params: Promise<{ locale: string }> }) {
  await assertFilteredRewrite();
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <LostFoundIndex locale={locale} filtered />;
}
