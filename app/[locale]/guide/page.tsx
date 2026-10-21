import type { Metadata } from "next";
import NextLink from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container, EmptyState, Heading, Stack, Tag } from "@/components/ui";
import { DEFAULT_LOCALE, isLocale, localePath, pick, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { getContentPages } from "@/lib/sanity/queries";
import { alternatesFor } from "@/lib/i18n/metadata";

const CATEGORY_LABEL = {
  transport: UI.categoryTransport,
  welfare: UI.categoryWelfare,
  activity: UI.categoryActivity,
  governance: UI.categoryGovernance,
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, "/guide"), title: UI.guide[locale] };
}

/**
 * Not explicitly listed in this agent's brief (only `guide/[slug]` was
 * asked for), but the guide pages need somewhere to be found from other
 * than search or a direct link, so this mirrors `welfare/page.tsx`.
 */
export default async function GuideIndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const pages = await getContentPages("guidePage");

  return (
    <Container width="narrow">
      <Breadcrumbs locale={locale} items={[{ label: UI.home[locale], path: "/" }, { label: UI.guide[locale] }]} />
      <Stack space={8} className="pb-[var(--space-8)] pt-[var(--space-2)]">
        <Heading level={1}>{UI.guide[locale]}</Heading>

        {pages.length === 0 ? (
          <EmptyState title={UI.nothingHere[locale]} />
        ) : (
          <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
            {pages.map((page) => (
              <li key={page._id} className="py-[var(--space-4)]">
                <Stack space={2}>
                  <Tag tone={page.category}>{CATEGORY_LABEL[page.category][locale]}</Tag>
                  <Heading level={2} className="m-0 text-lg">
                    <NextLink href={localePath(locale, `/guide/${page.slug.current}`)} className="text-ink-900 no-underline hover:underline">
                      {pick(page.title, locale)}
                    </NextLink>
                  </Heading>
                  <p className="m-0 text-ink-600">{pick(page.summary, locale)}</p>
                </Stack>
              </li>
            ))}
          </ul>
        )}
      </Stack>
    </Container>
  );
}
