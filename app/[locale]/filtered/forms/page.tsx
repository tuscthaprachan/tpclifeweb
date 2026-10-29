import { notFound } from "next/navigation";
import { FormsIndex } from "../../forms/FormsIndex";
import { assertFilteredRewrite } from "@/lib/filtered-route";
import { isLocale } from "@/lib/i18n/config";

export { generateMetadata } from "../../forms/page";

export const dynamic = "force-dynamic";

export default async function FilteredFormsPage({ params }: { params: Promise<{ locale: string }> }) {
  await assertFilteredRewrite();
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <FormsIndex locale={locale} filtered />;
}
