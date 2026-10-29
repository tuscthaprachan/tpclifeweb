import { notFound } from "next/navigation";
import { PolicyIndex } from "../../policy/PolicyIndex";
import { assertFilteredRewrite } from "@/lib/filtered-route";
import { isLocale } from "@/lib/i18n/config";

export { generateMetadata } from "../../policy/page";

export const dynamic = "force-dynamic";

export default async function FilteredPolicyPage({ params }: { params: Promise<{ locale: string }> }) {
  await assertFilteredRewrite();
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <PolicyIndex locale={locale} filtered />;
}
