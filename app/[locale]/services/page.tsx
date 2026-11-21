import type { Metadata } from "next";
import NextLink from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { getSiteSettings } from "@/components/layout/site-settings";
import { ArrowRightIcon, Container, Heading, IconTile, Stack, iconForPathOrDefault } from "@/components/ui";
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

  const settings = await getSiteSettings();
  const navLabels = new Map(settings.primaryNav.map((item) => [item.path, item.label]));
  const fromTasks = settings.homeTasks.map((task) => ({
    path: task.path,
    label: navLabels.get(task.path) ?? task.label,
    description: pick(task.description, locale),
  }));
  const taskPaths = new Set(fromTasks.map((item) => item.path));
  const items = [
    ...fromTasks,
    ...settings.primaryNav.filter((item) => !taskPaths.has(item.path)).map((item) => ({ path: item.path, label: item.label, description: "" })),
  ];

  return (
    <Container>
      <Breadcrumbs locale={locale} items={[{ label: UI.home[locale], path: "/" }, { label: UI.homeAllServices[locale] }]} />
      <Stack space={6} className="pb-[var(--space-8)] pt-[var(--space-2)]">
        <Stack space={2}>
          <Heading level={1}>{UI.homeAllServices[locale]}</Heading>
          <p className="m-0 max-w-prose text-ink-600">{UI.servicesIntro[locale]}</p>
        </Stack>

        <ul className="m-0 grid list-none gap-[var(--space-2)] p-0">
          {items.map((item) => {
            const description = item.description;
            return (
              <li key={item.path}>
                <NextLink
                  href={localePath(locale, item.path)}
                  className="press group grid min-h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-[var(--space-3)] rounded-[var(--radius-block)] bg-surface-alt py-[var(--space-2)] pl-[var(--space-2)] pr-[var(--space-2)] no-underline"
                >
                  <IconTile icon={iconForPathOrDefault(item.path)} />
                  <span>
                    <span className="block font-bold text-action group-hover:underline">{pick(item.label, locale)}</span>
                    {description ? (
                      <span className="block text-[length:var(--text-sm)] leading-snug text-ink-600">{description}</span>
                    ) : null}
                  </span>
                  <span aria-hidden="true" className="grid size-9 place-items-center rounded-full bg-action text-action-ink">
                    <ArrowRightIcon />
                  </span>
                </NextLink>
              </li>
            );
          })}
        </ul>
      </Stack>
    </Container>
  );
}
