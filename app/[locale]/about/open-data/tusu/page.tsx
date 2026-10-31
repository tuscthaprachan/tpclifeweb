import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHead, TUSC_PATH, OPEN_DATA_PATH } from "@/components/domain/open-data";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container } from "@/components/ui/Container";
import { Stack } from "@/components/ui/Stack";
import { DEFAULT_LOCALE, LOCALES, isLocale, localePath, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, `${OPEN_DATA_PATH}/tusu`),
    title: `${UI.odTusuBody[locale]} | ${UI.odOpenData[locale]}`,
    description: UI.odTusuIntro[locale],
  };
}

export default async function TusuOpenDataPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const link = "inline-flex min-h-[var(--target-min)] items-center font-medium text-action underline hover:text-action-hover";

  return (
    <Container>
      <Breadcrumbs
        locale={locale}
        items={[
          { label: UI.home[locale], path: "/" },
          { label: UI.about[locale], path: "/about" },
          { label: UI.odOpenData[locale], path: OPEN_DATA_PATH },
          { label: UI.odTusuShort[locale] },
        ]}
      />
      <Stack space={6} className="pb-[var(--space-8)] pt-[var(--space-2)]">
        <PageHead label={UI.odOpenData[locale]} title={UI.odTusuBody[locale]} summary={UI.odTusuIntro[locale]} className="mb-0" />
        <ul className="m-0 flex list-none flex-col gap-[var(--space-2)] p-0">
          <li>
            <Link href={localePath(locale, "/about/tusu")} className={link}>
              {UI.odTusuAboutLink[locale]}
            </Link>
          </li>
          <li>
            <Link href={localePath(locale, TUSC_PATH)} className={link}>
              {UI.odTusuTuscLink[locale]}
            </Link>
          </li>
        </ul>
      </Stack>
    </Container>
  );
}
