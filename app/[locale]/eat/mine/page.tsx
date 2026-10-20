/**
 * Your stuff: favourites, history, dislikes, saved default filters, the saved
 * week and the spend log. All of it lives in this device's localStorage, so
 * the page is a server rendered shell around a client component. Without
 * JavaScript the shell says why the page cannot show anything. The server
 * passes the menu (small records) so slugs can be resolved to names.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EAT, readFilters, t } from "@/components/domain/canteen";
import { MineClient, type MineDish } from "@/components/domain/canteen/budget/MineClient";
import { BUDGET } from "@/components/domain/canteen/budget/strings";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container, Heading, InsetText, Stack } from "@/components/ui";
import { serialise } from "@/lib/canteen/params";
import { DEFAULT_LOCALE, isLocale, localePath, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { getCanteenData } from "@/lib/sanity/queries";

const ROUTE = "/eat/mine";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, ROUTE),
    title: t(BUDGET.mineTitle, locale),
    description: t(BUDGET.mineIntro, locale),
    // Personal and empty for everyone who has not used it: nothing here for a search engine.
    robots: { index: false },
  };
}

export default async function EatMinePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const query = await searchParams;
  const data = await getCanteenData();
  const currentQuery = serialise(readFilters(query));

  const stallById = new Map(data.stalls.map((stall) => [stall._id, stall]));
  const dishes: Record<string, MineDish> = {};
  for (const dish of data.dishes) {
    const stall = stallById.get(dish.stall._ref);
    if (!stall) continue;
    dishes[dish.slug.current] = {
      name: dish.name,
      stallNumber: stall.number,
      stallName: stall.name,
      price: dish.price,
      ...(dish.checkedOn ? { checkedOn: dish.checkedOn } : {}),
    };
  }
  const stallNames = Object.fromEntries(data.stalls.map((stall) => [stall.slug.current, stall.name]));

  return (
    <Container className="py-8">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: UI.home[locale], path: "/" },
          { label: t(EAT.title, locale), path: "/eat" },
          { label: t(BUDGET.mineTitle, locale) },
        ]}
      />
      <Stack space={6}>
        <Stack space={2}>
          <Heading level={1}>{t(BUDGET.mineTitle, locale)}</Heading>
          <p className="m-0 text-ink-600">{t(BUDGET.mineIntro, locale)}</p>
        </Stack>

        <noscript>
          <style>{".mine-loading{display:none}"}</style>
          <InsetText>
            <p className="m-0 font-semibold text-ink-900">{t(BUDGET.mineNoJsTitle, locale)}</p>
            <p className="m-0 mt-[var(--space-2)] text-ink-900">{t(BUDGET.mineNoJsBody, locale)}</p>
          </InsetText>
        </noscript>

        <MineClient locale={locale} dishes={dishes} stallNames={stallNames} currentQuery={currentQuery} />

        <p className="m-0">
          <Link href={localePath(locale, "/eat")}>{t(BUDGET.backToEat, locale)}</Link>
        </p>
      </Stack>
    </Container>
  );
}
