import Link from "next/link";

import { EAT, t } from "@/components/domain/canteen";
import { MineClient, type MineDish } from "@/components/domain/canteen/budget/MineClient";
import { BUDGET } from "@/components/domain/canteen/budget/strings";
import { LiveMine } from "@/components/domain/canteen/pages/Mine";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container, Heading, InsetText, Stack } from "@/components/ui";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { localePath, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { getCanteenData } from "@/lib/content";

export async function EatMine({ locale, filtered }: { locale: Locale; filtered: boolean }) {
  const data = await getCanteenData();

  const stallById = new Map(data.stalls.map((stall) => [stall._id, stall]));
  const dishes: Record<string, MineDish> = {};
  for (const dish of data.dishes) {
    const stall = stallById.get(dish.stallId);
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
    <Container className="pb-8 pt-2">
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
          <Heading level={1} className="text-3xl">{t(BUDGET.mineTitle, locale)}</Heading>
          <p className="m-0 text-ink-600">{t(BUDGET.mineIntro, locale)}</p>
        </Stack>

        <noscript>
          <style>{".mine-loading{display:none}"}</style>
          <InsetText>
            <p className="m-0 font-semibold text-ink-900">{t(BUDGET.mineNoJsTitle, locale)}</p>
            <p className="m-0 mt-[var(--space-2)] text-ink-900">{t(BUDGET.mineNoJsBody, locale)}</p>
          </InsetText>
        </noscript>

        <QueryBoundary filtered={filtered} fallback={<MineClient locale={locale} dishes={dishes} stallNames={stallNames} currentQuery="" />}>
          <LiveMine locale={locale} dishes={dishes} stallNames={stallNames} />
        </QueryBoundary>

        <p className="m-0">
          <Link href={localePath(locale, "/eat")}>{t(BUDGET.backToEat, locale)}</Link>
        </p>
      </Stack>
    </Container>
  );
}
