/**
 * "About" index: the footer navigation (components/layout/site-settings.ts)
 * links to `/about`, so this exists to give that link somewhere honest to
 * land, one link per student body, rather than a 404. The detail lives on
 * the two body-specific pages.
 */

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container } from "@/components/ui/Container";
import { Heading } from "@/components/ui/Heading";
import { Stack } from "@/components/ui/Stack";
import { STUDENT_BODIES } from "@/data/harvested-inventory";
import { DEFAULT_LOCALE, LOCALES, isLocale, localePath, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { alternatesFor } from "@/lib/i18n/metadata";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;

  return {
    alternates: alternatesFor(locale, "/about"),
    title: UI.about[locale],
  };
}

export default async function AboutIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  return (
    <Container width="narrow">
      <Breadcrumbs locale={locale} items={[{ label: UI.home[locale], path: "/" }, { label: UI.about[locale] }]} />

      <Stack space={6} className="pb-[var(--space-8)] pt-[var(--space-2)]" as="section">
        <Heading level={1}>{UI.about[locale]}</Heading>
        <ul className="m-0 flex flex-col gap-[var(--space-2)] pl-[var(--space-6)]">
          <li>
            <Link href={localePath(locale, "/about/tusu")} className="font-medium text-action underline">
              {STUDENT_BODIES.tusu.name[locale]}
            </Link>
          </li>
          <li>
            <Link href={localePath(locale, "/about/tusc")} className="font-medium text-action underline">
              {STUDENT_BODIES.tusc.name[locale]}
            </Link>
          </li>
        </ul>
        <p className="m-0">
          <Link href={localePath(locale, "/about/open-data")} className="font-medium text-action underline">
            {UI.odAboutLink[locale]}
          </Link>
        </p>
      </Stack>
    </Container>
  );
}
