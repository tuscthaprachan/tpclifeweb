import { notFound } from "next/navigation";
import { DirectoryIndex } from "../../directory/DirectoryIndex";
import { assertFilteredRewrite } from "@/lib/filtered-route";
import { isLocale } from "@/lib/i18n/config";

export { generateMetadata } from "../../directory/page";

export const dynamic = "force-dynamic";

export default async function FilteredDirectoryPage({ params }: { params: Promise<{ locale: string }> }) {
  await assertFilteredRewrite();
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <DirectoryIndex locale={locale} filtered />;
}
