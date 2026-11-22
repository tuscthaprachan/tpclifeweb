import type { Metadata } from "next";
import NextLink from "next/link";
import { notFound } from "next/navigation";

import { topicIcon } from "@/components/domain/content-page";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container, Heading, IconTile, Stack, iconForPathOrDefault } from "@/components/ui";
import { getTopicPages } from "@/lib/content";
import { hubItemKey, mergeHubItems } from "@/lib/content/hub";
import { SECTION_LIST, topicPath } from "@/lib/content/sections";
import { DEFAULT_LOCALE, isLocale, localePath, pick, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, "/services"),
    title: UI.homeAllServices[locale],
    description: UI.servicesIntro[locale],
  };
}

export default async function ServicesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const pages = await getTopicPages();

  return (
    <Container>
      <Breadcrumbs locale={locale} items={[{ label: UI.home[locale], path: "/" }, { label: UI.homeAllServices[locale] }]} />
      <Stack space={8} className="pb-[var(--space-8)] pt-[var(--space-2)]">
        <Stack space={2}>
          <Heading level={1}>{UI.homeAllServices[locale]}</Heading>
          <p className="m-0 max-w-prose text-ink-600">{UI.servicesIntro[locale]}</p>
        </Stack>

        {SECTION_LIST.map((section) => {
          const headingId = `services-${section.key}`;
          const items = mergeHubItems(
            section,
            pages.filter((page) => page.section === section.key),
          );
          return (
            <section key={section.key} aria-labelledby={headingId} className="flex flex-col gap-[var(--space-3)]">
              <Heading level={2} id={headingId} className="m-0">
                <NextLink
                  href={localePath(locale, section.path)}
                  className="group inline-flex min-h-[var(--target-min)] items-center gap-[var(--space-3)] text-action no-underline hover:underline"
                >
                  <IconTile icon={section.icon} tone="solid" />
                  {pick(section.label, locale)}
                </NextLink>
              </Heading>
              <p className="m-0 max-w-prose text-ink-600">{pick(section.intro, locale)}</p>
              <ul className="m-0 grid list-none gap-[var(--space-2)] p-0 sm:grid-cols-2">
                {items.map((item) => {
                  const topic = item.kind === "topic";
                  const href = topic ? topicPath(item.page.section, item.page.slug.current) : item.entry.path;
                  const title = pick(topic ? item.page.title : item.entry.label, locale);
                  const description = pick(topic ? item.page.summary : item.entry.description, locale);
                  return (
                    <li key={hubItemKey(item)} className="flex">
                      <NextLink
                        href={localePath(locale, href)}
                        className="press group grid min-h-16 w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-[var(--space-3)] rounded-[var(--radius-block)] bg-surface-alt p-[var(--space-2)] no-underline"
                      >
                        <IconTile icon={topic ? topicIcon(item.page) : iconForPathOrDefault(item.entry.path)} />
                        <span>
                          <span className="block font-bold text-action group-hover:underline">{title}</span>
                          <span className="block text-[length:var(--text-sm)] leading-snug text-ink-600">{description}</span>
                        </span>
                      </NextLink>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </Stack>
    </Container>
  );
}
