import { EAT, t } from "@/components/domain/canteen";
import { DishesResults, LiveDishesResults } from "@/components/domain/canteen/pages/Dishes";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container, EmptyState, Heading, Stack } from "@/components/ui";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { getCanteenData } from "@/lib/content";

export async function EatDishes({ locale, filtered }: { locale: Locale; filtered: boolean }) {
  const data = await getCanteenData();
  const now = new Date();

  const breadcrumbs = (
    <Breadcrumbs
      locale={locale}
      items={[
        { label: UI.home[locale], path: "/" },
        { label: t(EAT.title, locale), path: "/eat" },
        { label: t(EAT.dishesTitle, locale) },
      ]}
    />
  );
  const header = (
    <Stack space={2}>
      <Heading level={1} className="text-3xl">{t(EAT.dishesTitle, locale)}</Heading>
      <p className="m-0 text-ink-600">{t(EAT.dishesIntro, locale)}</p>
    </Stack>
  );

  if (data.dishes.length === 0) {
    return (
      <Container className="pb-8 pt-2">
        {breadcrumbs}
        <Stack space={8}>
          {header}
          <EmptyState title={t(EAT.noDataTitle, locale)}>{t(EAT.noDataBody, locale)}</EmptyState>
        </Stack>
      </Container>
    );
  }

  return (
    <Container className="pb-8 pt-2">
      {breadcrumbs}
      <Stack space={4}>
        {header}
        <QueryBoundary filtered={filtered} fallback={<DishesResults locale={locale} data={data} query={{}} now={now} />}>
          <LiveDishesResults locale={locale} data={data} server={filtered ? { now: now.toISOString() } : undefined} />
        </QueryBoundary>
      </Stack>
    </Container>
  );
}
